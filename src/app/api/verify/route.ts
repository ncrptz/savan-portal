import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'

const SELECT = `cert_id, trainee_name, event_id, issued_at, photo_url, status, revoked,
  verify_token, signature, event:training_events(title, training_date, venue)`

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')?.trim()
  const q     = searchParams.get('q')?.trim()

  // Service role so we can read revoked certs too (to report them as revoked,
  // not "not found"). Only curated, non-sensitive fields are returned below.
  const supabase = createAdminClient()

  let cert: any = null
  if (token) {
    const { data } = await supabase.from('certificates').select(SELECT).eq('verify_token', token).limit(1)
    cert = data?.[0] ?? null
  } else if (q) {
    const isCertId = q.toUpperCase().startsWith('SAVAN/')
    const base = supabase.from('certificates').select(SELECT).limit(1)
    const { data } = isCertId
      ? await base.eq('cert_id', q.toUpperCase())
      : await base.ilike('trainee_name', `%${q}%`)
    cert = data?.[0] ?? null
  }

  if (!cert) return NextResponse.json({ status: 'not_found', certificate: null })

  // Tamper check: recompute the HMAC over the immutable fields.
  const secret = process.env.CERT_SIGNING_SECRET || ''
  let tampered = false
  if (secret && cert.signature) {
    const expected = createHmac('sha256', secret)
      .update(`${cert.cert_id}|${cert.trainee_name}|${cert.event_id}|${cert.verify_token}`)
      .digest('base64')
    tampered = expected !== cert.signature
  }

  const status = tampered ? 'tampered'
    : (cert.revoked || cert.status !== 'active') ? 'revoked'
    : 'valid'

  return NextResponse.json({
    status,
    certificate: {
      cert_id:      cert.cert_id,
      trainee_name: cert.trainee_name,
      issued_at:    cert.issued_at,
      photo_url:    cert.photo_url,
      event:        cert.event,
    },
  })
}
