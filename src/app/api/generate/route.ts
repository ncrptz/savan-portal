import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
  const startSeq      = parseInt(form.get('start_seq') as string)
  const sponsoredBy   = (form.get('sponsored_by') as string) || ''
  const collabName    = (form.get('collab_signer_name') as string) || ''
  const collabTitle   = (form.get('collab_signer_title') as string) || ''
  const participants  = JSON.parse(form.get('participants') as string)

  const renderUrl = process.env.RENDER_API_URL
  if (!renderUrl) {
    return NextResponse.json({ error: 'RENDER_API_URL not configured' }, { status: 500 })
  }

  // Wake up Render service first (free tier spins down)
  try {
    await fetch(`${renderUrl}/health`, { signal: AbortSignal.timeout(10_000) })
  } catch {
    // Continue even if health check times out
  }

  // Build render form
  const renderForm = new FormData()
  renderForm.append('params', JSON.stringify({
    template:             templateType,
    sponsored_by:         sponsoredBy,
    collab_signer_name:   collabName,
    collab_signer_title:  collabTitle,
    participants: participants.map((p: any, i: number) => ({
      name: p.name, year, month, session, seq: startSeq + i, date: p.date,
    })),
  }))

  const collabLogo = form.get('collab_logo') as File | null
  const collabSig  = form.get('collab_sig')  as File | null
  if (collabLogo) renderForm.append('collab_logo', collabLogo)
  if (collabSig)  renderForm.append('collab_sig',  collabSig)
  participants.forEach((_: any, i: number) => {
    const photo = form.get(`photo_${i}`) as File | null
    if (photo) renderForm.append(`photo_${i}`, photo)
  })

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

    await adminSupabase.from('certificates').upsert({
      cert_id:      cert.cert_id,
      event_id:     eventId,
      trainee_id:   trainee?.id ?? null,
      trainee_name: cert.name,
      issued_at:    cert.date,
      pdf_url:      urlData?.publicUrl || '',
    }, { onConflict: 'cert_id' })

    issued.push({ cert_id: cert.cert_id, name: cert.name, pdf_url: urlData?.publicUrl || '' })
  }

  if (issued.filter(c => c.cert_id).length > 0) {
    await adminSupabase.from('training_events')
      .update({ participant_count: issued.length, status: 'completed' })
      .eq('id', eventId)
  }

  return NextResponse.json({ certificates: issued })
}
