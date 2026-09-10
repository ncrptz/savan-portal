import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createHmac, randomUUID } from 'crypto'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single()
  if (!profile || !['superadmin','admin1','admin2'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const form          = await req.formData()
  const eventId       = form.get('event_id') as string
  const templateType  = form.get('template_type') as string
  const year          = parseInt(form.get('year') as string)
  const month         = parseInt(form.get('month') as string)
  const session       = parseInt(form.get('session') as string)
  const sponsoredBy   = (form.get('sponsored_by') as string) || ''
  const collabName    = (form.get('collab_signer_name') as string) || ''
  const collabTitle   = (form.get('collab_signer_title') as string) || ''
  const participants  = JSON.parse(form.get('participants') as string)

  const renderUrl = process.env.RENDER_API_URL
  if (!renderUrl) {
    return NextResponse.json({ error: 'RENDER_API_URL not configured' }, { status: 500 })
  }
  const signingSecret = process.env.CERT_SIGNING_SECRET
  if (!signingSecret) {
    return NextResponse.json({ error: 'CERT_SIGNING_SECRET not configured' }, { status: 500 })
  }

  // Wake up Render service first (free tier spins down)
  try {
    await fetch(`${renderUrl}/health`, { signal: AbortSignal.timeout(10_000) })
  } catch {
    // Continue even if health check times out
  }

  // Reserve a contiguous block of numbers for this batch in one atomic step.
  // A number, once reserved, is never reused — even across deletes/revocations.
  const { data: firstSeq, error: seqErr } = await adminSupabase
    .rpc('next_cert_seq_block', { p_event_id: eventId, p_n: participants.length })
  if (seqErr || typeof firstSeq !== 'number') {
    return NextResponse.json(
      { error: `Certificate numbering failed: ${seqErr?.message || 'no sequence returned'}` },
      { status: 500 })
  }
  const seqBase = firstSeq - 1  // participant i (0-based) → firstSeq + i

  // A verify token per participant, generated up front so it can be embedded in
  // the QR at render time and stored on the certificate row afterwards.
  const tokens: string[] = participants.map(() => randomUUID())
  const verifyBaseUrl = process.env.NEXT_PUBLIC_VERIFY_BASE_URL || ''

  // Build render form
  const renderForm = new FormData()
  renderForm.append('params', JSON.stringify({
    template:             templateType,
    sponsored_by:         sponsoredBy,
    collab_signer_name:   collabName,
    collab_signer_title:  collabTitle,
    verify_base_url:      verifyBaseUrl,
    participants: participants.map((p: any, i: number) => ({
      name: p.name, year, month, session, seq: seqBase + i + 1, date: p.date, token: tokens[i],
    })),
  }))

  const collabLogo = form.get('collab_logo') as File | null
  const collabSig  = form.get('collab_sig')  as File | null

  // Load any logo/signature already saved on this event (or its organisation),
  // so repeat batches don't need a re-upload.
  let eventRow: any = null
  if (templateType === 'T2') {
    const { data } = await adminSupabase
      .from('training_events')
      .select('collab_logo_url, collab_sig_url, organisation:organisations(logo_url)')
      .eq('id', eventId)
      .single()
    eventRow = data
  }

  // Resolve one collaborator asset: a freshly uploaded file is used AND saved
  // to storage + the event row; otherwise fall back to the saved/org URL.
  async function resolveAsset(
    uploaded: File | null,
    savedUrl: string | null | undefined,
    orgUrl: string | null | undefined,
    kind: 'logo' | 'sig',
    urlColumn: 'collab_logo_url' | 'collab_sig_url',
  ): Promise<{ blob: Blob; filename: string } | null> {
    if (uploaded && uploaded.size > 0) {
      const ext  = (uploaded.name.split('.').pop() || 'png').toLowerCase()
      const type = uploaded.type || 'image/png'
      const buf  = Buffer.from(await uploaded.arrayBuffer())
      const path = `events/${eventId}/${kind}.${ext}`
      const { error: upErr } = await adminSupabase.storage
        .from('logos').upload(path, buf, { contentType: type, upsert: true })
      if (!upErr) {
        const { data: pub } = adminSupabase.storage.from('logos').getPublicUrl(path)
        if (pub?.publicUrl) {
          await adminSupabase.from('training_events')
            .update({ [urlColumn]: pub.publicUrl }).eq('id', eventId)
        }
      }
      return { blob: new Blob([buf], { type }), filename: `${kind}.${ext}` }
    }
    const url = savedUrl || (kind === 'logo' ? orgUrl : null)
    if (url) {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(10_000) })
        if (r.ok) {
          const ab = await r.arrayBuffer()
          return { blob: new Blob([ab], { type: r.headers.get('content-type') || 'image/png' }),
                   filename: `${kind}.png` }
        }
      } catch { /* fall back to no asset */ }
    }
    return null
  }

  if (templateType === 'T2') {
    const logo = await resolveAsset(collabLogo, eventRow?.collab_logo_url,
                                    eventRow?.organisation?.logo_url, 'logo', 'collab_logo_url')
    if (logo) renderForm.append('collab_logo', logo.blob, logo.filename)
    const sig = await resolveAsset(collabSig, eventRow?.collab_sig_url,
                                   null, 'sig', 'collab_sig_url')
    if (sig) renderForm.append('collab_sig', sig.blob, sig.filename)
  } else {
    if (collabLogo) renderForm.append('collab_logo', collabLogo)
    if (collabSig)  renderForm.append('collab_sig',  collabSig)
  }

  // Attach photos to the render request AND persist each so the verification
  // page can show it. Index-aligned with participants.
  const photoUrls: (string | null)[] = participants.map(() => null)
  for (let i = 0; i < participants.length; i++) {
    const photo = form.get(`photo_${i}`) as File | null
    if (!photo) continue
    renderForm.append(`photo_${i}`, photo)
    try {
      const ext  = (photo.name.split('.').pop() || 'jpg').toLowerCase()
      const pbuf = Buffer.from(await photo.arrayBuffer())
      const ppath = `events/${eventId}/photo_${seqBase + i + 1}.${ext}`
      const { error: pe } = await adminSupabase.storage
        .from('photos').upload(ppath, pbuf, { contentType: photo.type || 'image/jpeg', upsert: true })
      if (!pe) {
        const { data: pu } = adminSupabase.storage.from('photos').getPublicUrl(ppath)
        photoUrls[i] = pu?.publicUrl || null
      }
    } catch { /* photo persistence is best-effort */ }
  }

  // Call Render service
  let renderResult: any
  try {
    const res = await fetch(`${renderUrl}/render`, {
      method: 'POST',
      body:   renderForm,
      signal: AbortSignal.timeout(55_000),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Render service ${res.status}: ${text}`)
    }
    renderResult = await res.json()
  } catch (err: any) {
    return NextResponse.json(
      { error: `Render failed: ${err.message}` },
      { status: 502 }
    )
  }

  // Store results
  const issued: any[] = []
  for (const cert of renderResult.certificates) {
    if (!cert.cert_id || cert.error) {
      issued.push({ cert_id: '', name: cert.name, pdf_url: '', error: cert.error })
      continue
    }

    const pdfBuffer   = Buffer.from(cert.pdf_base64, 'base64')
    const storagePath = `events/${eventId}/${cert.cert_id.replace(/\//g, '_')}.pdf`

    await adminSupabase.storage
      .from('certificates')
      .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true })

    const { data: urlData } = adminSupabase.storage
      .from('certificates').getPublicUrl(storagePath)

    const { data: trainee } = await adminSupabase
      .from('trainees')
      .upsert({ full_name: cert.name, email: '' }, { onConflict: 'full_name' })
      .select('id').single()

    const seqNum = parseInt(String(cert.cert_id).split('/').pop() || '') || 0
    const idx = seqNum - firstSeq            // 0-based participant index
    const verifyToken = (idx >= 0 && idx < tokens.length) ? tokens[idx] : randomUUID()
    const photoUrl    = (idx >= 0 && idx < photoUrls.length) ? photoUrls[idx] : null
    const signature = createHmac('sha256', signingSecret)
      .update(`${cert.cert_id}|${cert.name}|${eventId}|${verifyToken}`)
      .digest('base64')

    await adminSupabase.from('certificates').insert({
      cert_id:      cert.cert_id,
      event_id:     eventId,
      trainee_id:   trainee?.id ?? null,
      trainee_name: cert.name,
      issued_at:    cert.date,
      pdf_url:      urlData?.publicUrl || '',
      photo_url:    photoUrl,
      seq:          seqNum || null,
      verify_token: verifyToken,
      signature,
    })

    issued.push({ cert_id: cert.cert_id, name: cert.name, pdf_url: urlData?.publicUrl || '' })
  }

  if (issued.filter(c => c.cert_id).length > 0) {
    await adminSupabase.from('training_events')
      .update({ participant_count: issued.length, status: 'completed' })
      .eq('id', eventId)
  }

  return NextResponse.json({ certificates: issued })
}
