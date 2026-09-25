import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProvider } from '@/lib/payments/providers'

export const dynamic = 'force-dynamic'

function one<T>(x: T | T[] | null | undefined): T | null {
  if (Array.isArray(x)) return x[0] ?? null
  return x ?? null
}

// Starts a certificate access payment for the signed-in holder.
// Stage 2: creates the pending record and, when PAYMENTS_TEST_MODE=true, unlocks
// instantly so the flow is testable. Stage 3 will return a real gateway
// checkout URL (Paystack / Flutterwave / Remita) here instead.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let body: { certificateId?: string; provider?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }) }
  const certificateId = body.certificateId
  if (!certificateId) return NextResponse.json({ error: 'Missing certificate id' }, { status: 400 })

  const admin = createAdminClient()
  const { data: cert } = await admin
    .from('certificates')
    .select('id, cert_id, event:training_events(cert_fee_enabled, cert_fee_amount), registration:event_registrations(user_id)')
    .eq('id', certificateId)
    .single()
  if (!cert) return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })

  const reg = one<{ user_id: string | null }>((cert as any).registration)
  const event = one<{ cert_fee_enabled: boolean; cert_fee_amount: number }>((cert as any).event)
  if (!reg || reg.user_id !== user.id) {
    return NextResponse.json({ error: 'This certificate is not yours' }, { status: 403 })
  }
  if (!event?.cert_fee_enabled) {
    return NextResponse.json({ ok: true, free: true })
  }

  const { data: paid } = await admin
    .from('certificate_payments')
    .select('id').eq('certificate_id', cert.id).eq('user_id', user.id).eq('status', 'success').limit(1)
  if (paid && paid.length) return NextResponse.json({ ok: true, alreadyPaid: true })

  const amount = event.cert_fee_amount || 0
  const reference = `sav_${Date.now()}_${randomUUID().slice(0, 8)}`
  const provider = process.env.PAYMENTS_TEST_MODE === 'true' ? 'test' : (body.provider || 'paystack')

  const { error: insErr } = await admin.from('certificate_payments').insert({
    certificate_id: cert.id, user_id: user.id, provider, reference, amount, status: 'pending',
  })
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  // Test-mode: unlock immediately, no gateway (remove PAYMENTS_TEST_MODE for live).
  if (process.env.PAYMENTS_TEST_MODE === 'true') {
    await admin.from('certificate_payments')
      .update({ status: 'success', paid_at: new Date().toISOString() })
      .eq('reference', reference)
    return NextResponse.json({ ok: true, unlocked: true, testMode: true })
  }

  // Live gateway: initialise a hosted checkout and hand back its URL.
  const gw = getProvider(provider)
  if (!gw || !gw.configured()) {
    return NextResponse.json({
      error: 'Card payment is not available yet — the gateway keys have not been added.',
    }, { status: 501 })
  }
  try {
    const callbackUrl = `${req.nextUrl.origin}/api/payments/callback`
    const { checkoutUrl } = await gw.initialize({
      reference, amountNaira: amount, email: user.email || '',
      callbackUrl, metadata: { certificate_id: cert.id, user_id: user.id, cert_ref: cert.cert_id },
    })
    return NextResponse.json({ checkoutUrl })
  } catch (e: any) {
    // Roll the pending row back to failed so a retry starts clean.
    await admin.from('certificate_payments').update({ status: 'failed' }).eq('reference', reference)
    return NextResponse.json({ error: e?.message || 'Could not start the payment.' }, { status: 502 })
  }
}
