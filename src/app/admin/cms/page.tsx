'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Image as ImageIcon } from 'lucide-react'

interface Settings {
  site_name: string; hero_title: string; hero_subtitle: string
  hero_image_url: string | null; hero_overlay: number
  logo_url: string | null; favicon_url: string | null; footer_text: string; footer_note: string
  mid_image_url: string | null; mid_overlay: number
}
const EMPTY: Settings = {
  site_name: '', hero_title: '', hero_subtitle: '',
  hero_image_url: null, hero_overlay: 70, logo_url: null, favicon_url: null, footer_text: '', footer_note: '', mid_image_url: null, mid_overlay: 88,
}

export default function CmsPage() {
  const [role, setRole] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [s, setS] = useState<Settings>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    (async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        const { data: p } = await sb.from('profiles').select('role').eq('user_id', user.id).single()
        setRole(p?.role ?? null)
      }
      const { data } = await sb.from('site_settings').select('*').eq('id', true).single()
      if (data) setS({
        site_name: data.site_name || '', hero_title: data.hero_title || '', hero_subtitle: data.hero_subtitle || '',
        hero_image_url: data.hero_image_url, hero_overlay: data.hero_overlay ?? 70,
        logo_url: data.logo_url, favicon_url: data.favicon_url, footer_text: data.footer_text || '', footer_note: data.footer_note || '', mid_image_url: data.mid_image_url, mid_overlay: data.mid_overlay ?? 88,
      })
      setReady(true)
    })()
  }, [])

  function set<K extends keyof Settings>(k: K, v: Settings[K]) { setS(prev => ({ ...prev, [k]: v })) }

  async function upload(kind: 'logo' | 'favicon' | 'hero' | 'mid', file: File): Promise<string | null> {
    const sb = createClient()
    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    const path = `${kind}.${ext}`
    const { error } = await sb.storage.from('cms').upload(path, file, { upsert: true, contentType: file.type || 'image/png' })
    if (error) { setErr(error.message); return null }
    const { data } = sb.storage.from('cms').getPublicUrl(path)
    return data?.publicUrl ? `${data.publicUrl}?t=${Date.now()}` : null
  }

  async function onFile(kind: 'logo' | 'favicon' | 'hero' | 'mid', e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true); setErr(''); setMsg('')
    const url = await upload(kind, file)
    setBusy(false)
    if (url) {
      if (kind === 'logo') set('logo_url', url)
      else if (kind === 'favicon') set('favicon_url', url)
      else if (kind === 'mid') set('mid_image_url', url)
      else set('hero_image_url', url)
      setMsg('Image uploaded — remember to Save.')
    }
  }

  async function save() {
    setBusy(true); setErr(''); setMsg('')
    const { error } = await createClient().from('site_settings').update({
      site_name: s.site_name, hero_title: s.hero_title, hero_subtitle: s.hero_subtitle,
      hero_image_url: s.hero_image_url, hero_overlay: s.hero_overlay,
      logo_url: s.logo_url, favicon_url: s.favicon_url, footer_text: s.footer_text, footer_note: s.footer_note, mid_image_url: s.mid_image_url, mid_overlay: s.mid_overlay,
      updated_at: new Date().toISOString(),
    }).eq('id', true)
    setBusy(false)
    if (error) { setErr(error.message); return }
    setMsg('Saved. Public pages update on their next load.')
  }

  if (!ready) return <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
  if (role !== 'superadmin')
    return <div className="max-w-xl mx-auto card text-center text-gray-600">Site content is managed by superadmins only.</div>

  const Img = ({ url }: { url: string | null }) => url
    ? <img src={url} alt="" className="h-12 object-contain rounded bg-gray-50 border border-gray-100 mt-2" />
    : <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center mt-2"><ImageIcon className="w-5 h-5 text-gray-300" /></div>

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Site content</h1>
      <p className="text-sm text-gray-500 mb-6">Branding and homepage content for the public site.</p>
      {msg && <p className="text-sm text-green-700 mb-3 flex items-center gap-1.5"><CheckCircle className="w-4 h-4" />{msg}</p>}
      {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

      <div className="space-y-6">
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Branding</h2>
          <div>
            <label className="label">Site name</label>
            <input className="input" value={s.site_name} onChange={e => set('site_name', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Logo</label>
              <input type="file" accept="image/*" className="input text-sm py-1.5" onChange={e => onFile('logo', e)} />
              <Img url={s.logo_url} />
            </div>
            <div>
              <label className="label">Favicon <span className="text-gray-400">(browser tab icon)</span></label>
              <input type="file" accept="image/*" className="input text-sm py-1.5" onChange={e => onFile('favicon', e)} />
              <Img url={s.favicon_url} />
            </div>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Homepage hero</h2>
          <div>
            <label className="label">Headline</label>
            <input className="input" value={s.hero_title} onChange={e => set('hero_title', e.target.value)} />
          </div>
          <div>
            <label className="label">Subtitle</label>
            <textarea className="input" rows={2} value={s.hero_subtitle} onChange={e => set('hero_subtitle', e.target.value)} />
          </div>
          <div>
            <label className="label">Background image <span className="text-gray-400">(e.g. a BLS training photo)</span></label>
            <input type="file" accept="image/*" className="input text-sm py-1.5" onChange={e => onFile('hero', e)} />
            <Img url={s.hero_image_url} />
          </div>
          <div>
            <label className="label">Image fade — {s.hero_overlay}% overlay</label>
            <input type="range" min={0} max={100} value={s.hero_overlay}
              onChange={e => set('hero_overlay', Number(e.target.value))} className="w-full" />
            <p className="text-xs text-gray-400">Higher = darker blue overlay so the text stays readable. 0 shows the image fully.</p>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Mid-page background</h2>
          <p className="text-xs text-gray-500">A fixed image shown behind the Quick Verification and What We Offer sections as visitors scroll.</p>
          <div>
            <label className="label">Background image</label>
            <input type="file" accept="image/*" className="input text-sm py-1.5" onChange={e => onFile('mid', e)} />
            <Img url={s.mid_image_url} />
          </div>
          <div>
            <label className="label">Lighten — {s.mid_overlay}% white overlay</label>
            <input type="range" min={0} max={100} value={s.mid_overlay}
              onChange={e => set('mid_overlay', Number(e.target.value))} className="w-full" />
            <p className="text-xs text-gray-400">Higher = whiter (content stays readable). Lower shows more of the image.</p>
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Footer</h2>
          <div>
            <label className="label">Footer text</label>
            <input className="input" value={s.footer_text} onChange={e => set('footer_text', e.target.value)} />
          </div>
          <div>
            <label className="label">Footer sub-line <span className="text-gray-400">(e.g. "Portal managed by …")</span></label>
            <input className="input" value={s.footer_note} onChange={e => set('footer_note', e.target.value)} />
          </div>
        </div>

        <button onClick={save} disabled={busy} className="btn-primary px-8">
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
