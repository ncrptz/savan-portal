import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProvider } from '@/lib/payments/providers'

export const dynamic = 'force-dynamic'

// The gateway redirects the payer back here after checkout. We verify the
// transaction server-side (never trust the redirect alone), mark the payment,
// and send the user to their dashboard.
export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get('reference')
    || req.nextUrl.searchParams.get('trxref')
  const dash = new URL('/trainee', req.nextUrl.origin)

  if (!reference) {
    dash.searchParams.set('payfail', '1')
    return NextResponse.redirect(dash)
  }

  const admin = createAdminClient()
  const { data: pay } = await admin
    .from('certificate_payments')
    .select('id, provider, amount, status')
    .eq('reference', reference)
    .single()

  if (!pay) {
    dash.searchParams.set('payfail', '1')
    return NextResponse.redirect(dash)
  }
  if (pay.status === 'success') {
    dash.searchParams.set('paid', '1')
    return NextResponse.redirect(dash)
  }

  const gw = getProvider(pay.provider)
  if (!gw) {
    dash.searchParams.set('payfail', '1')
    return NextResponse.redirect(dash)
  }

  try {
    const result = await gw.verify(reference)
    // Confirm success and that the amount charged matches what we expected.
    if (result.success && (result.amountNaira === undefined || Math.round(result.amountNaira) >= pay.amount)) {
      await admin.from('certificate_payments')
        .update({ status: 'success', paid_at: new Date().toISOString() })
        .eq('reference', reference)
      dash.searchParams.set('paid', '1')
    } else {
      await admin.from('certificate_payments').update({ status: 'failed' }).eq('reference', reference)
      dash.searchParams.set('payfail', '1')
    }
  } catch {
    dash.searchParams.set('payfail', '1')
  }
  return NextResponse.redirect(dash)
}
