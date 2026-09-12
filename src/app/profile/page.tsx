'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, UserCircle } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const [ready, setReady]       = useState(false)
  const [role, setRole]         = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [phone, setPhone]       = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [trainings, setTrainings] = useState<{ training_id: string; title: string; status: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')
  const [err, setErr]           = useState('')

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: p } = await supabase.from('profiles')
        .select('role, full_name, email, phone, photo_url').eq('user_id', user.id).single()
      if (p) {
        setRole(p.role); setFullName(p.full_name || ''); setEmail(p.email || '')
        setPhone(p.phone || ''); setPhotoUrl(p.photo_url || '')
      }
      const { data: regs } = await supabase.from('event_registrations')
        .select('training_id, status, event:training_events(title)')
        .eq('user_id', user.id).order('created_at', { ascending: false })
      setTrainings(((regs as any[]) ?? []).map(r => ({
        training_id: r.training_id, title: r.event?.title || 'Training', status: r.status,
      })))
      setReady(true)
    })()
  }, [])

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true); setErr(''); setMsg('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }
    const ext  = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `profiles/${user.id}.${ext}`
    const { error: upErr } = await supabase.storage.from('photos')
      .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' })
    if (upErr) { setErr(upErr.message); setUploading(false); return }
    const { data: pub } = supabase.storage.from('photos').getPublicUrl(path)
    await supabase.from('profiles').update({ photo_url: pub?.publicUrl || null }).eq('user_id', user.id)
    setPhotoUrl((pub?.publicUrl || '') + '?t=' + Date.now())   // cache-bust preview
    setUploading(false); setMsg('Photo updated.')
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setErr(''); setMsg('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { error } = await supabase.from('profiles')
      .update({ full_name: fullName.trim(), phone: phone.trim() }).eq('user_id', user.id)
    setSaving(false)
    if (error) { setErr(error.message); return }
    setMsg('Profile saved.')
  }

  const backTo = role === 'organisation' ? '/org' : '/trainee'
  if (!ready) return <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-6 py-8">
        <Link href={backTo} className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Edit Profile</h1>
        <p className="text-sm text-gray-500 mb-6">Update your name and photo.</p>

        <form onSubmit={save} className="card space-y-5">
          {/* Photo */}
          <div className="flex items-center gap-4">
            {photoUrl
              ? <img src={photoUrl} alt="" className="w-20 h-20 rounded-full object-cover border border-gray-200" />
              : <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center"><UserCircle className="w-10 h-10 text-gray-300" /></div>}
            <div>
              <label className="btn-secondary text-sm cursor-pointer inline-block">
                {uploading ? 'Uploading…' : 'Change photo'}
                <input type="file" accept="image/*" className="hidden" onChange={onPhoto} disabled={uploading} />
              </label>
              <p className="text-xs text-gray-400 mt-1">JPG or PNG.</p>
            </div>
          </div>

          <div>
            <label className="label">Full name</label>
            <input className="input" value={fullName} onChange={e => setFullName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="label">Email <span className="text-gray-400">(sign-in — locked)</span></label>
            <input className="input bg-gray-50 text-gray-500" value={email} disabled readOnly />
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}
          {msg && <p className="text-sm text-green-700 flex items-center gap-1.5"><CheckCircle className="w-4 h-4" />{msg}</p>}

          <button type="submit" disabled={saving} className="btn-primary px-8">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>

        {/* Training IDs — read-only */}
        <div className="card mt-6">
          <h2 className="font-semibold text-gray-900 mb-1">My Training IDs</h2>
          <p className="text-xs text-gray-400 mb-3">Assigned when you register — used to link your certificates. These can&apos;t be changed.</p>
          {trainings.length ? (
            <ul className="space-y-2">
              {trainings.map((t, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{t.title}</span>
                  <span className="font-mono text-xs text-gray-500">{t.training_id}
                    <span className="ml-2 text-gray-400">({t.status})</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-gray-400">No training IDs yet.</p>}
        </div>
      </div>
    </div>
  )
}
