import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function one<T>(x: T | T[] | null | undefined): T | null {
  if (Array.isArray(x)) return x[0] ?? null
  return x ?? null
}

// Serves a certificate PDF from the private bucket via a short-lived signed URL,
// but only to someone allowed to see it: an admin, the owning organisation, or
// the holder — and the holder only if the event's access fee is off or paid.
export async function GET(req: NextRequest) {
  const cid = req.nextUrl.searchParams.get('cid')
  if (!cid) return NextResponse.json({ error: 'Missing certificate id' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/auth/login', req.url))

  const admin = createAdminClient()
  const { data: cert } = await admin
    .from('certificates')
    .select('id, cert_id, pdf_path, pdf_url, revoked, event:training_events(cert_fee_enabled), registration:event_registrations(user_id, organisation_id)')
    .eq('cert_id', cid)
    .single()

  if (!cert) return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
  if (cert.revoked) return NextResponse.json({ error: 'This certificate has been revoked' }, { status: 410 })

  const { data: profile } = await admin
    .from('profiles').select('role, org_id').eq('user_id', user.id).single()
  const role = profile?.role
  const isAdmin = role === 'superadmin' || role === 'admin1' || role === 'admin2'

  const reg = one<{ user_id: string | null; organisation_id: string | null }>((cert as any).registration)
  const event = one<{ cert_fee_enabled: boolean }>((cert as any).event)
  const isOrg = !!profile?.org_id && !!reg?.organisation_id && profile.org_id === reg.organisation_id
  const isHolder = !!reg?.user_id && reg.user_id === user.id

  let allowed = false
  if (isAdmin || isOrg) {
    allowed = true
  } else if (isHolder) {
    if (!event?.cert_fee_enabled) {
      allowed = true
    } else {
      const { data: pay } = await admin
        .from('certificate_payments')
        .select('id').eq('certificate_id', cert.id).eq('user_id', user.id).eq('status', 'success').limit(1)
      allowed = !!(pay && pay.length)
    }
  }

  if (!allowed) {
    return NextResponse.json({ error: 'Payment required to access this certificate' }, { status: 402 })
  }

  const path = cert.pdf_path
    || (cert.pdf_url ? cert.pdf_url.split('/object/public/certificates/')[1] : null)
  if (!path) return NextResponse.json({ error: 'Certificate file unavailable' }, { status: 404 })

  const { data: signed, error } = await admin.storage.from('certificates').createSignedUrl(path, 120)
  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: 'Could not prepare the download' }, { status: 500 })
  }
  return NextResponse.redirect(signed.signedUrl)
}
