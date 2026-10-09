import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

// Re-renders ONE already-issued certificate with a (new) passport photo.
//
// Everything that identifies the certificate is preserved — cert_id, verify
// token, QR link, issue date, signature, storage path (so pdf_url is unchanged
// and any link already shared keeps working). Only the PDF bytes and the
// certificate's photo_url snapshot change. Render parameters are taken from the
// stored cert_id (year / month / session / seq) and the event row (template,
// sponsor, collaborator signer + assets).
//
// multipart/form-data:  cert_id (uuid of the certificates row), photo (file)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const admin    = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single()
  if (!profile || !['superadmin', 'admin1', 'admin2'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const renderUrl = process.env.RENDER_API_URL
  if (!renderUrl) return NextResponse.json({ error: 'RENDER_API_URL not configured' }, { status: 500 })

  const form  = await req.formData()
  const id    = form.get('cert_id') as string | null
  const photo = form.get('photo') as File | null
  if (!id)                      return NextResponse.json({ error: 'Missing cert_id' }, { status: 400 })
  if (!photo || photo.size < 1) return NextResponse.json({ error: 'A photo is required' }, { status: 400 })
  if (!(photo.type || '').startsWith('image/')) {
    return NextResponse.json({ error: 'The photo must be an image file' }, { status: 400 })
  }

  const { data: cert } = await admin
    .from('certificates')
    .select(`id, cert_id, event_id, trainee_name, issue_date, issued_at, pdf_path, seq, verify_token,
             revoked, status,
             event:training_events(template_type, sponsored_by, collab_signer_name, collab_signer_title,
                                   collab_logo_url, collab_sig_url, organisation:organisations(logo_url))`)
    .eq('id', id)
    .single()
  if (!cert) return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
  if (cert.revoked || cert.status !== 'active') {
    return NextResponse.json({ error: 'Only a valid (non-revoked) certificate can be re-rendered' }, { status: 409 })
  }

  // SAVAN/BLSAED/YYYY/MMS/NNN — numbering as printed on the certificate.
  const m = /^SAVAN\/BLSAED\/(\d{4})\/(\d{2})(\d)\/(\d+)$/.exec(cert.cert_id || '')
  if (!m) return NextResponse.json({ error: `Unrecognised certificate id: ${cert.cert_id}` }, { status: 422 })
  const year = +m[1], month = +m[2], session = +m[3], seq = +m[4]

  const dateStr = String(cert.issue_date || cert.issued_at || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: 'Certificate has no usable issue date' }, { status: 422 })
  }

  const ev: any = Array.isArray(cert.event) ? cert.event[0] : cert.event
  const template = ev?.template_type || 'T1'

  // Wake the render service (free tier spins down).
  try { await fetch(`${renderUrl}/health`, { signal: AbortSignal.timeout(10_000) }) } catch { /* continue */ }

  const renderForm = new FormData()
  renderForm.append('params', JSON.stringify({
    template,
    sponsored_by:        ev?.sponsored_by || '',
    collab_signer_name:  ev?.collab_signer_name || '',
    collab_signer_title: ev?.collab_signer_title || '',
    verify_base_url:     process.env.NEXT_PUBLIC_VERIFY_BASE_URL || '',
    participants: [{
      name: cert.trainee_name, year, month, session, seq, date: dateStr, token: cert.verify_token || '',
    }],
  }))

  // Collaborator assets saved on the event (or its organisation's logo).
  async function fetchAsset(url: string | null | undefined, filename: string) {
    if (!url) return
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(10_000) })
      if (r.ok) {
        const ab = await r.arrayBuffer()
        renderForm.append(filename.split('.')[0], new Blob([ab], { type: r.headers.get('content-type') || 'image/png' }), filename)
      }
    } catch { /* render without it */ }
  }
  if (template === 'T2') {
    const orgLogo = Array.isArray(ev?.organisation) ? ev.organisation[0]?.logo_url : ev?.organisation?.logo_url
    await fetchAsset(ev?.collab_logo_url || orgLogo, 'collab_logo.png')
    await fetchAsset(ev?.collab_sig_url, 'collab_sig.png')
  }

  const photoBytes = await photo.arrayBuffer()
  const photoType  = photo.type || 'image/jpeg'
  const ext        = photoType.includes('png') ? 'png' : 'jpg'
  renderForm.append('photo_0', new Blob([photoBytes], { type: photoType }), `photo_0.${ext}`)

  let rendered: any
  try {
    const res = await fetch(`${renderUrl}/render`, { method: 'POST', body: renderForm, signal: AbortSignal.timeout(55_000) })
    if (!res.ok) throw new Error(`Render service ${res.status}: ${await res.text()}`)
    rendered = await res.json()
  } catch (err: any) {
    return NextResponse.json({ error: `Render failed: ${err.message}` }, { status: 502 })
  }

  const out = rendered?.certificates?.[0]
  if (!out || out.error || !out.pdf_base64) {
    return NextResponse.json({ error: out?.error || 'Render returned no certificate' }, { status: 502 })
  }
  if (out.cert_id && out.cert_id !== cert.cert_id) {
    // Never overwrite one certificate's PDF with another's.
    return NextResponse.json({ error: `Render id mismatch (${out.cert_id} ≠ ${cert.cert_id})` }, { status: 500 })
  }

  // Overwrite the PDF in place so pdf_url / download links stay valid.
  const storagePath = cert.pdf_path || `events/${cert.event_id}/${cert.cert_id.replace(/\//g, '_')}.pdf`
  const { error: pdfErr } = await admin.storage
    .from('certificates')
    .upload(storagePath, Buffer.from(out.pdf_base64, 'base64'), { contentType: 'application/pdf', upsert: true })
  if (pdfErr) return NextResponse.json({ error: `Could not save PDF: ${pdfErr.message}` }, { status: 500 })

  // Snapshot the photo at the same per-certificate path the batch generator uses.
  let photoUrl: string | null = null
  const ppath = `events/${cert.event_id}/photo_${cert.seq || seq}.${ext}`
  const { error: pe } = await admin.storage
    .from('photos').upload(ppath, Buffer.from(photoBytes), { contentType: photoType, upsert: true })
  if (!pe) photoUrl = admin.storage.from('photos').getPublicUrl(ppath).data?.publicUrl || null

  const update: Record<string, any> = { pdf_path: storagePath }
  if (photoUrl) update.photo_url = photoUrl
  const { error: upErr } = await admin.from('certificates').update(update).eq('id', cert.id)
  if (upErr) return NextResponse.json({ error: `PDF replaced but row update failed: ${upErr.message}` }, { status: 500 })

  return NextResponse.json({ ok: true, cert_id: cert.cert_id, photo_url: photoUrl })
}
