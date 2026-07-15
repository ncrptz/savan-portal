import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { spawn } from 'child_process'
import { writeFile, mkdir, readFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

function pad(n: number, len = 3) { return String(n).padStart(len, '0') }

function buildCertId(year: number, month: number, session: number, seq: number) {
  return `SAVAN/BLSAED/${year}/${pad(month, 2)}${session}/${pad(seq)}`
}

export async function POST(req: NextRequest) {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  // Auth check
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
  const participants  = JSON.parse(form.get('participants') as string) as { name: string; date: string }[]

  // Create temp working directory
  const workDir = join(tmpdir(), `savan-${randomUUID()}`)
  await mkdir(workDir, { recursive: true })

  // Save uploaded files to temp dir
  async function saveFile(key: string, name: string) {
    const file = form.get(key) as File | null
    if (!file) return null
    const buf  = Buffer.from(await file.arrayBuffer())
    const path = join(workDir, name)
    await writeFile(path, buf)
    return path
  }

  const collabLogoPath = await saveFile('collab_logo', 'collab_logo.png')
  const collabSigPath  = await saveFile('collab_sig',  'collab_sig.png')

  // Save participant photos
  const photoPaths: Record<number, string> = {}
  for (let i = 0; i < participants.length; i++) {
    const path = await saveFile(`photo_${i}`, `photo_${i}.jpg`)
    if (path) photoPaths[i] = path
  }

  // Persistent assets path
  const assetsPath = join(process.cwd(), 'scripts', 'persistent_assets.json')

  // Build render args
  const renderArgs = {
    work_dir:     workDir,
    assets_path:  assetsPath,
    template:     templateType,
    participants: participants.map((p, i) => ({
      name:  p.name,
      date:  p.date,
      photo: photoPaths[i] || null,
      year, month, session,
      seq:  startSeq + i,
    })),
    sponsored_by:       sponsoredBy,
    collab_logo_path:   collabLogoPath,
    collab_sig_path:    collabSigPath,
    collab_signer_name: collabName,
    collab_signer_title: collabTitle,
  }

  const argsPath = join(workDir, 'args.json')
  await writeFile(argsPath, JSON.stringify(renderArgs))

  // Run Python render engine
  const result = await new Promise<{ success: boolean; certificates: any[]; error?: string }>(
    (resolve) => {
      const py = spawn(
        process.env.PYTHON_EXECUTABLE || 'python3',
        [join(process.cwd(), 'scripts', 'render_certificate.py'), argsPath],
        { env: { ...process.env } }
      )
      let stdout = ''; let stderr = ''
      py.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
      py.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
      py.on('close', (code: number) => {
        if (code !== 0) {
          resolve({ success: false, certificates: [], error: stderr || 'Render failed' })
          return
        }
        try {
          resolve(JSON.parse(stdout))
        } catch {
          resolve({ success: false, certificates: [], error: 'Invalid render output' })
        }
      })
    }
  )

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // Upload PDFs to Supabase Storage + save certificate records
  const issued: { cert_id: string; name: string; pdf_url: string }[] = []

  for (const cert of result.certificates) {
    const pdfBuf  = await readFile(cert.pdf_path)
    const storagePath = `events/${eventId}/${cert.cert_id.replace(/\//g, '_')}.pdf`

    await adminSupabase.storage
      .from('certificates')
      .upload(storagePath, pdfBuf, { contentType: 'application/pdf', upsert: true })

    const { data: urlData } = adminSupabase.storage
      .from('certificates')
      .getPublicUrl(storagePath)

    // Upsert trainee
    const { data: trainee } = await adminSupabase
      .from('trainees')
      .upsert({ full_name: cert.name }, { onConflict: 'full_name' })
      .select('id')
      .single()

    // Insert certificate record
    await adminSupabase.from('certificates').insert({
      cert_id:      cert.cert_id,
      event_id:     eventId,
      trainee_id:   trainee?.id,
      trainee_name: cert.name,
      issued_at:    cert.date,
      pdf_url:      urlData?.publicUrl,
    })

    issued.push({ cert_id: cert.cert_id, name: cert.name, pdf_url: urlData?.publicUrl || '' })
  }

  // Update event participant count
  await adminSupabase
    .from('training_events')
    .update({ participant_count: participants.length, status: 'completed' })
    .eq('id', eventId)

  return NextResponse.json({ certificates: issued })
}
