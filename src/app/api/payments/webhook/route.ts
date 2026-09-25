import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Paystack webhook: confirms a charge even if the payer never returns to the
// callback URL. Signature = HMAC-SHA512 of the raw body with the secret key.
export async function POST(req: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) return NextResponse.json({ ok: false }, { status: 200 })

  const raw = await req.text()
  const sig = req.headers.get('x-paystack-signature') || ''
  const expected = createHmac('sha512', secret).update(raw).digest('hex')

  // Constant-time compare.
  let valid = false
  try {
    const a = Buffer.from(sig, 'hex'); const b = Buffer.from(expected, 'hex')
    valid = a.length === b.length && timingSafeEqual(a, b)
  } catch { valid = false }
  if (!valid) return NextResponse.json({ ok: false }, { status: 401 })

  let event: any
  try { event = JSON.parse(raw) } catch { return NextResponse.json({ ok: true }, { status: 200 }) }

  if (event?.event === 'charge.success' && event?.data?.reference) {
    const reference = event.data.reference as string
    const admin = createAdminClient()
    const { data: pay } = await admin
      .from('certificate_payments')
      .select('id, amount, status').eq('reference', reference).single()
    if (pay && pay.status !== 'success') {
      const paidNaira = event?.data?.amount ? event.data.amount / 100 : undefined
      if (paidNaira === undefined || Math.round(paidNaira) >= pay.amount) {
        await admin.from('certificate_payments')
          .update({ status: 'success', paid_at: new Date().toISOString() })
          .eq('reference', reference)
      }
    }
  }
  // Always 200 so Paystack stops retrying a handled event.
  return NextResponse.json({ ok: true }, { status: 200 })
}
