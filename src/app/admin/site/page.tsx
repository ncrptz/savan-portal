'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Globe, Megaphone, Newspaper, Image as ImageIcon, Plus, Trash2, Pencil, Sparkles, Building2, Video as VideoIcon } from 'lucide-react'

type Tab = 'adverts' | 'blog' | 'photos' | 'hero' | 'orgs' | 'video'
const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80)

// Shared image upload -> public 'site' bucket
async function uploadImage(folder: string, file: File): Promise<{ url?: string; error?: string }> {
  const s = createClient()
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${folder}/${Date.now()}.${ext}`
  const { error } = await s.storage.from('site').upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' })
  if (error) return { error: error.message }
  const { data } = s.storage.from('site').getPublicUrl(path)
  return { url: data?.publicUrl }
}

export default function AdminSitePage() {
  const [role, setRole] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState<Tab>('hero')

  useEffect(() => {
    const s = createClient()
    s.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setReady(true); return }
      s.from('profiles').select('role').eq('user_id', user.id).single()
        .then(({ data }) => { setRole(data?.role ?? null); setReady(true) })
    })
  }, [])

  if (!ready) return <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
  if (!role || !['superadmin', 'admin1', 'admin2'].includes(role))
    return <div className="max-w-xl mx-auto card text-center text-gray-600">The main site is managed by admins.</div>

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'hero', label: 'Hero', icon: Sparkles },
    { id: 'video', label: 'Video', icon: VideoIcon },
    { id: 'adverts', label: 'Adverts', icon: Megaphone },
    { id: 'blog', label: 'Blog', icon: Newspaper },
    { id: 'photos', label: 'Photos', icon: ImageIcon },
    { id: 'orgs', label: 'Organisations', icon: Building2 },
  ]

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-1"><Globe className="w-6 h-6 text-[#000066]" />Main site</h1>
      <p className="text-sm text-gray-500 mb-4">Content for the public site at savan-ngo.org — hero, adverts, blog posts and featured photos.</p>

      <div className="flex gap-2 mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3.5 py-1.5 rounded-full text-sm inline-flex items-center gap-1.5 ${tab === t.id ? 'bg-[#000066] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'hero' && <Hero />}
      {tab === 'video' && <Video />}
      {tab === 'adverts' && <Adverts />}
      {tab === 'blog' && <Blog />}
      {tab === 'photos' && <Photos />}
      {tab === 'orgs' && <Orgs />}
    </div>
  )
}

/* ---------------- Organisations ---------------- */
interface Org { id: string; name: string; logo_url: string | null; mono: string | null; sort: number; active: boolean }
const O_BLANK = { name: '', logo_url: '', mono: '', sort: 0, active: true }

function Orgs() {
  const [rows, setRows] = useState<Org[]>([])
  const [show, setShow] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...O_BLANK })
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(''); const [err, setErr] = useState('')

  async function load() {
    const { data } = await createClient().from('site_orgs').select('*').order('sort').order('created_at', { ascending: false })
    setRows((data as any) ?? [])
  }
  useEffect(() => { load() }, [])
  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }))
  const reset = () => { setForm({ ...O_BLANK }); setEditId(null) }

  async function onImg(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true); setErr('')
    const { url, error } = await uploadImage('orgs', file); setBusy(false)
    if (error) { setErr(error); return }
    set('logo_url', url); setMsg('Logo uploaded — remember to Save.')
  }
  async function save() {
    if (!form.name.trim()) { setErr('A name is required.'); return }
    setBusy(true); setErr(''); setMsg('')
    const payload: any = {
      name: form.name.trim(), logo_url: form.logo_url || null,
      mono: form.mono.trim() || null, sort: form.sort || 0, active: form.active,
    }
    const s = createClient()
    const { error } = editId
      ? await s.from('site_orgs').update(payload).eq('id', editId)
      : await s.from('site_orgs').insert(payload)
    setBusy(false)
    if (error) { setErr(error.message); return }
    setShow(false); reset(); setMsg('Organisation saved.'); load()
  }
  async function remove(id: string) {
    if (!confirm('Delete this organisation?')) return
    const { error } = await createClient().from('site_orgs').delete().eq('id', id)
    if (error) { setErr(error.message); return }
    load()
  }
  function startEdit(o: Org) {
    setEditId(o.id)
    setForm({ name: o.name, logo_url: o.logo_url || '', mono: o.mono || '', sort: o.sort, active: o.active })
    setShow(true); setMsg(''); setErr('')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">The scrolling partner strip on the homepage. Upload a logo, or leave it blank to show the short monogram.</p>
        <button onClick={() => { reset(); setShow(true); setMsg(''); setErr('') }} className="btn-primary flex items-center gap-2 flex-shrink-0"><Plus className="w-4 h-4" />New org</button>
      </div>
      {msg && <p className="text-sm text-green-700 mb-3">{msg}</p>}
      {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

      {show && (
        <div className="card mb-6 space-y-4">
          <h3 className="font-semibold text-gray-900">{editId ? 'Edit organisation' : 'New organisation'}</h3>
          <div><label className="label">Name *</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. University of Benin" /></div>
          <div><label className="label">Logo <span className="text-gray-400">(transparent PNG works best)</span></label>
            <input type="file" accept="image/*" className="input text-sm py-1.5" onChange={onImg} />
            {form.logo_url && <img src={form.logo_url} alt="" className="h-16 mt-2 rounded border border-gray-100 object-contain bg-white p-1" />}</div>
          <div><label className="label">Monogram <span className="text-gray-400">(shown if no logo, e.g. UNIBEN)</span></label>
            <input className="input w-40" value={form.mono} onChange={e => set('mono', e.target.value)} maxLength={8} /></div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} />Active</label>
            <label className="flex items-center gap-2 text-sm">Order <input type="number" className="input w-20 py-1" value={form.sort} onChange={e => set('sort', +e.target.value || 0)} /></label>
          </div>
          <div className="flex gap-3">
            <button onClick={save} disabled={busy} className="btn-primary px-6">{busy ? 'Saving…' : 'Save'}</button>
            <button onClick={() => { setShow(false); reset() }} className="btn-secondary px-6">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {rows.map(o => (
          <div key={o.id} className="card flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {o.logo_url
                ? <img src={o.logo_url} alt="" className="w-11 h-11 rounded-full object-contain bg-white border border-gray-100 p-1 flex-shrink-0" />
                : <span className="w-11 h-11 rounded-full bg-[#000066] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{o.mono || '—'}</span>}
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{o.name}</p>
                <p className="text-xs mt-0.5"><span className={o.active ? 'text-green-700' : 'text-gray-400'}>{o.active ? 'Active' : 'Hidden'}</span> · #{o.sort}{o.logo_url ? ' · logo' : ' · monogram'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 text-xs">
              <button onClick={() => startEdit(o)} className="inline-flex items-center gap-1 text-[#000066] hover:underline"><Pencil className="w-3.5 h-3.5" />Edit</button>
              <button onClick={() => remove(o.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {!rows.length && <div className="card text-center py-10 text-gray-400 text-sm">No organisations yet.</div>}
      </div>
    </div>
  )
}

/* ---------------- Hero ---------------- */
function Hero() {
  const [form, setForm] = useState({ hero_url: '', hero_title: '', hero_subtitle: '' })
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(''); const [err, setErr] = useState('')

  useEffect(() => {
    createClient().from('main_site').select('hero_url,hero_title,hero_subtitle').eq('id', true).single()
      .then(({ data }) => {
        if (data) setForm({ hero_url: data.hero_url || '', hero_title: data.hero_title || '', hero_subtitle: data.hero_subtitle || '' })
      })
  }, [])
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function onImg(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true); setErr('')
    const { url, error } = await uploadImage('hero', file); setBusy(false)
    if (error) { setErr(error); return }
    set('hero_url', url || ''); setMsg('Image uploaded — remember to Save.')
  }
  async function save() {
    setBusy(true); setErr(''); setMsg('')
    const { error } = await createClient().from('main_site').upsert({
      id: true,
      hero_url: form.hero_url || null,
      hero_title: form.hero_title.trim() || null,
      hero_subtitle: form.hero_subtitle.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setMsg('Hero saved. The homepage updates on its next load.')
  }

  return (
    <div className="card space-y-4 max-w-xl">
      <p className="text-sm text-gray-500">The homepage hero on savan-ngo.org. Leave a field blank to use the built-in default.</p>
      {msg && <p className="text-sm text-green-700">{msg}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div>
        <label className="label">Background image</label>
        <input type="file" accept="image/*" className="input text-sm py-1.5" onChange={onImg} />
        {form.hero_url && <img src={form.hero_url} alt="" className="w-full h-40 mt-2 rounded object-cover border border-gray-100" />}
        <p className="text-xs text-gray-400 mt-1">Landscape, ~1600×780px. A dark overlay is applied automatically so text stays readable.</p>
      </div>
      <div>
        <label className="label">Headline</label>
        <input className="input" value={form.hero_title} onChange={e => set('hero_title', e.target.value)} placeholder="Saving lives before the hospital." />
      </div>
      <div>
        <label className="label">Subtitle</label>
        <textarea className="input" rows={3} value={form.hero_subtitle} onChange={e => set('hero_subtitle', e.target.value)} placeholder="SAVAN improves the survival of accident and emergency victims…" />
      </div>
      <button onClick={save} disabled={busy} className="btn-primary px-6">{busy ? 'Saving…' : 'Save hero'}</button>
    </div>
  )
}

/* ---------------- Video ---------------- */
function Video() {
  const [form, setForm] = useState({ video_url: '', video_title: '', video_active: false, video_autoplay: false })
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(''); const [err, setErr] = useState('')

  useEffect(() => {
    createClient().from('main_site').select('video_url,video_title,video_active,video_autoplay').eq('id', true).single()
      .then(({ data }) => {
        if (data) setForm({
          video_url: data.video_url || '', video_title: data.video_title || '',
          video_active: !!data.video_active, video_autoplay: !!data.video_autoplay,
        })
      })
  }, [])
  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }))

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true); setErr('')
    const { url, error } = await uploadImage('video', file); setBusy(false)
    if (error) { setErr(error); return }
    set('video_url', url || ''); setMsg('Video uploaded — remember to Save.')
  }
  async function save() {
    setBusy(true); setErr(''); setMsg('')
    const { error } = await createClient().from('main_site').upsert({
      id: true,
      video_url: form.video_url.trim() || null,
      video_title: form.video_title.trim() || null,
      video_active: form.video_active,
      video_autoplay: form.video_autoplay,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setMsg('Video saved. The homepage updates on its next load.')
  }

  return (
    <div className="card space-y-4 max-w-xl">
      <p className="text-sm text-gray-500">A video section on the homepage. Paste a YouTube/Vimeo link, or upload a video file.</p>
      {msg && <p className="text-sm text-green-700">{msg}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={form.video_active} onChange={e => set('video_active', e.target.checked)} />
        Show the video on the homepage
      </label>

      <div>
        <label className="label">Video link <span className="text-gray-400">(YouTube or Vimeo)</span></label>
        <input className="input" value={form.video_url} onChange={e => set('video_url', e.target.value)} placeholder="https://youtu.be/… or https://vimeo.com/…" />
      </div>

      <div>
        <label className="label">…or upload a video file <span className="text-gray-400">(MP4)</span></label>
        <input type="file" accept="video/*" className="input text-sm py-1.5" onChange={onFile} />
        {form.video_url && !/youtu|vimeo/.test(form.video_url) && <p className="text-xs text-green-700 mt-1">File set ✓</p>}
        <p className="text-xs text-gray-400 mt-1">Keep uploads small (ideally under ~50MB). For long videos, a YouTube/Vimeo link is better.</p>
      </div>

      <div>
        <label className="label">Section title</label>
        <input className="input" value={form.video_title} onChange={e => set('video_title', e.target.value)} placeholder="Watch SAVAN in action" />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.video_autoplay} onChange={e => set('video_autoplay', e.target.checked)} />
        Autoplay <span className="text-gray-400">(plays muted on load; viewers can unmute)</span>
      </label>

      <button onClick={save} disabled={busy} className="btn-primary px-6">{busy ? 'Saving…' : 'Save video'}</button>
    </div>
  )
}

/* ---------------- Adverts ---------------- */
interface Advert { id: string; title: string | null; image_url: string; link_url: string | null; active: boolean; sort: number; starts_at: string | null; ends_at: string | null }
const A_BLANK = { title: '', image_url: '', link_url: '', active: true, sort: 0, starts_at: '', ends_at: '' }
const toLocal = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso); if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function Adverts() {
  const [rows, setRows] = useState<Advert[]>([])
  const [show, setShow] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...A_BLANK })
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(''); const [err, setErr] = useState('')

  async function load() {
    const { data } = await createClient().from('site_adverts').select('*').order('sort').order('created_at', { ascending: false })
    setRows((data as any) ?? [])
  }
  useEffect(() => { load() }, [])
  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }))
  const reset = () => { setForm({ ...A_BLANK }); setEditId(null) }

  async function onImg(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true); setErr('')
    const { url, error } = await uploadImage('adverts', file); setBusy(false)
    if (error) { setErr(error); return }
    set('image_url', url); setMsg('Image uploaded — remember to Save.')
  }
  async function save() {
    if (!form.image_url) { setErr('An advert image is required.'); return }
    setBusy(true); setErr(''); setMsg('')
    const payload: any = {
      title: form.title.trim() || null, image_url: form.image_url, link_url: form.link_url.trim() || null,
      active: form.active, sort: form.sort || 0,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    }
    const s = createClient()
    const { error } = editId
      ? await s.from('site_adverts').update(payload).eq('id', editId)
      : await s.from('site_adverts').insert(payload)
    setBusy(false)
    if (error) { setErr(error.message); return }
    setShow(false); reset(); setMsg('Advert saved.'); load()
  }
  async function remove(id: string) {
    if (!confirm('Delete this advert?')) return
    const { error } = await createClient().from('site_adverts').delete().eq('id', id)
    if (error) { setErr(error.message); return }
    load()
  }
  function startEdit(a: Advert) {
    setEditId(a.id)
    setForm({ title: a.title || '', image_url: a.image_url, link_url: a.link_url || '', active: a.active, sort: a.sort, starts_at: toLocal(a.starts_at), ends_at: toLocal(a.ends_at) })
    setShow(true); setMsg(''); setErr('')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Promo banners shown on the homepage. Toggle active and set optional start/end dates.</p>
        <button onClick={() => { reset(); setShow(true); setMsg(''); setErr('') }} className="btn-primary flex items-center gap-2 flex-shrink-0"><Plus className="w-4 h-4" />New advert</button>
      </div>
      {msg && <p className="text-sm text-green-700 mb-3">{msg}</p>}
      {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

      {show && (
        <div className="card mb-6 space-y-4">
          <h3 className="font-semibold text-gray-900">{editId ? 'Edit advert' : 'New advert'}</h3>
          <div><label className="label">Title <span className="text-gray-400">(internal)</span></label>
            <input className="input" value={form.title} onChange={e => set('title', e.target.value)} /></div>
          <div><label className="label">Image *</label>
            <input type="file" accept="image/*" className="input text-sm py-1.5" onChange={onImg} />
            {form.image_url && <img src={form.image_url} alt="" className="h-24 mt-2 rounded border border-gray-100 object-contain bg-gray-50" />}</div>
          <div><label className="label">Link URL <span className="text-gray-400">(where the advert points)</span></label>
            <input className="input" value={form.link_url} onChange={e => set('link_url', e.target.value)} placeholder="https://…" /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="label">Starts</label><input type="datetime-local" className="input" value={form.starts_at} onChange={e => set('starts_at', e.target.value)} /></div>
            <div><label className="label">Ends</label><input type="datetime-local" className="input" value={form.ends_at} onChange={e => set('ends_at', e.target.value)} /></div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} />Active</label>
            <label className="flex items-center gap-2 text-sm">Order <input type="number" className="input w-20 py-1" value={form.sort} onChange={e => set('sort', +e.target.value || 0)} /></label>
          </div>
          <div className="flex gap-3">
            <button onClick={save} disabled={busy} className="btn-primary px-6">{busy ? 'Saving…' : 'Save'}</button>
            <button onClick={() => { setShow(false); reset() }} className="btn-secondary px-6">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {rows.map(a => (
          <div key={a.id} className="card flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img src={a.image_url} alt="" className="w-14 h-14 rounded object-cover bg-gray-50 flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{a.title || 'Untitled advert'}</p>
                <p className="text-xs mt-0.5"><span className={a.active ? 'text-green-700' : 'text-gray-400'}>{a.active ? 'Active' : 'Inactive'}</span>{a.link_url ? ' · linked' : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 text-xs">
              <button onClick={() => startEdit(a)} className="inline-flex items-center gap-1 text-[#000066] hover:underline"><Pencil className="w-3.5 h-3.5" />Edit</button>
              <button onClick={() => remove(a.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {!rows.length && <div className="card text-center py-10 text-gray-400 text-sm">No adverts yet.</div>}
      </div>
    </div>
  )
}

/* ---------------- Blog ---------------- */
interface Post { id: string; slug: string; title: string; excerpt: string | null; cover_url: string | null; body: string | null; status: string; published_at: string | null }
const B_BLANK = { slug: '', title: '', excerpt: '', cover_url: '', body: '', status: 'draft' }

function Blog() {
  const [rows, setRows] = useState<Post[]>([])
  const [show, setShow] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [slugTouched, setSlugTouched] = useState(false)
  const [form, setForm] = useState({ ...B_BLANK })
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(''); const [err, setErr] = useState('')

  async function load() {
    const { data } = await createClient().from('blog_posts').select('id,slug,title,excerpt,cover_url,body,status,published_at').order('created_at', { ascending: false })
    setRows((data as any) ?? [])
  }
  useEffect(() => { load() }, [])
  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }))
  const reset = () => { setForm({ ...B_BLANK }); setEditId(null); setSlugTouched(false) }

  function onTitle(v: string) {
    set('title', v)
    if (!slugTouched) set('slug', slugify(v))
  }
  async function onCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true); setErr('')
    const { url, error } = await uploadImage('blog', file); setBusy(false)
    if (error) { setErr(error); return }
    set('cover_url', url); setMsg('Cover uploaded — remember to Save.')
  }
  async function save() {
    if (!form.title.trim()) { setErr('Title is required.'); return }
    if (!form.slug.trim()) { setErr('Slug is required.'); return }
    setBusy(true); setErr(''); setMsg('')
    const s = createClient()
    const { data: { user } } = await s.auth.getUser()
    const isPub = form.status === 'published'
    const payload: any = {
      slug: slugify(form.slug), title: form.title.trim(), excerpt: form.excerpt.trim() || null,
      cover_url: form.cover_url || null, body: form.body || null, status: form.status,
      updated_at: new Date().toISOString(),
    }
    if (!editId) payload.author_id = user?.id ?? null
    if (isPub) payload.published_at = new Date().toISOString()
    const { error } = editId
      ? await s.from('blog_posts').update(payload).eq('id', editId)
      : await s.from('blog_posts').insert(payload)
    setBusy(false)
    if (error) { setErr(error.message.includes('duplicate') ? 'That slug is already used — change it.' : error.message); return }
    setShow(false); reset(); setMsg('Post saved.'); load()
  }
  async function remove(id: string) {
    if (!confirm('Delete this post?')) return
    const { error } = await createClient().from('blog_posts').delete().eq('id', id)
    if (error) { setErr(error.message); return }
    load()
  }
  function startEdit(p: Post) {
    setEditId(p.id); setSlugTouched(true)
    setForm({ slug: p.slug, title: p.title, excerpt: p.excerpt || '', cover_url: p.cover_url || '', body: p.body || '', status: p.status })
    setShow(true); setMsg(''); setErr('')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Stories &amp; news. Published posts feed the homepage and the /blog page.</p>
        <button onClick={() => { reset(); setShow(true); setMsg(''); setErr('') }} className="btn-primary flex items-center gap-2 flex-shrink-0"><Plus className="w-4 h-4" />New post</button>
      </div>
      {msg && <p className="text-sm text-green-700 mb-3">{msg}</p>}
      {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

      {show && (
        <div className="card mb-6 space-y-4">
          <h3 className="font-semibold text-gray-900">{editId ? 'Edit post' : 'New post'}</h3>
          <div><label className="label">Title *</label>
            <input className="input" value={form.title} onChange={e => onTitle(e.target.value)} placeholder="e.g. SAVAN trains 200 first responders in Benin City" /></div>
          <div><label className="label">Slug *</label>
            <input className="input font-mono text-sm" value={form.slug} onChange={e => { setSlugTouched(true); set('slug', e.target.value) }} />
            <p className="text-xs text-gray-400 mt-1">Web address: /blog/{form.slug || 'your-post'}</p></div>
          <div><label className="label">Excerpt <span className="text-gray-400">(short summary for cards)</span></label>
            <textarea className="input" rows={2} value={form.excerpt} onChange={e => set('excerpt', e.target.value)} /></div>
          <div><label className="label">Cover image</label>
            <input type="file" accept="image/*" className="input text-sm py-1.5" onChange={onCover} />
            {form.cover_url && <img src={form.cover_url} alt="" className="h-28 mt-2 rounded border border-gray-100 object-cover" />}</div>
          <div><label className="label">Body</label>
            <textarea className="input" rows={10} value={form.body} onChange={e => set('body', e.target.value)} placeholder="Write the story. Line breaks are preserved." /></div>
          <div><label className="label">Status</label>
            <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="draft">Draft</option><option value="published">Published</option>
            </select></div>
          <div className="flex gap-3">
            <button onClick={save} disabled={busy} className="btn-primary px-6">{busy ? 'Saving…' : 'Save post'}</button>
            <button onClick={() => { setShow(false); reset() }} className="btn-secondary px-6">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {rows.map(p => (
          <div key={p.id} className="card flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {p.cover_url
                ? <img src={p.cover_url} alt="" className="w-14 h-14 rounded object-cover bg-gray-50 flex-shrink-0" />
                : <div className="w-14 h-14 rounded bg-gray-100 flex items-center justify-center flex-shrink-0"><Newspaper className="w-5 h-5 text-gray-300" /></div>}
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{p.title}</p>
                <p className="text-xs mt-0.5"><span className={p.status === 'published' ? 'text-green-700' : 'text-amber-600'}>{p.status}</span>{p.published_at ? ` · ${new Date(p.published_at).toLocaleDateString('en-GB')}` : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 text-xs">
              <button onClick={() => startEdit(p)} className="inline-flex items-center gap-1 text-[#000066] hover:underline"><Pencil className="w-3.5 h-3.5" />Edit</button>
              <button onClick={() => remove(p.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {!rows.length && <div className="card text-center py-10 text-gray-400 text-sm">No posts yet.</div>}
      </div>
    </div>
  )
}

/* ---------------- Photos ---------------- */
interface Photo { id: string; image_url: string; caption: string | null; sort: number; active: boolean }
const P_BLANK = { image_url: '', caption: '', sort: 0, active: true }

function Photos() {
  const [rows, setRows] = useState<Photo[]>([])
  const [show, setShow] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...P_BLANK })
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(''); const [err, setErr] = useState('')

  async function load() {
    const { data } = await createClient().from('site_photos').select('*').order('sort').order('created_at', { ascending: false })
    setRows((data as any) ?? [])
  }
  useEffect(() => { load() }, [])
  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }))
  const reset = () => { setForm({ ...P_BLANK }); setEditId(null) }

  async function onImg(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true); setErr('')
    const { url, error } = await uploadImage('photos', file); setBusy(false)
    if (error) { setErr(error); return }
    set('image_url', url); setMsg('Image uploaded — remember to Save.')
  }
  async function save() {
    if (!form.image_url) { setErr('A photo is required.'); return }
    setBusy(true); setErr(''); setMsg('')
    const payload: any = { image_url: form.image_url, caption: form.caption.trim() || null, sort: form.sort || 0, active: form.active }
    const s = createClient()
    const { error } = editId
      ? await s.from('site_photos').update(payload).eq('id', editId)
      : await s.from('site_photos').insert(payload)
    setBusy(false)
    if (error) { setErr(error.message); return }
    setShow(false); reset(); setMsg('Photo saved.'); load()
  }
  async function remove(id: string) {
    if (!confirm('Delete this photo?')) return
    const { error } = await createClient().from('site_photos').delete().eq('id', id)
    if (error) { setErr(error.message); return }
    load()
  }
  function startEdit(p: Photo) {
    setEditId(p.id)
    setForm({ image_url: p.image_url, caption: p.caption || '', sort: p.sort, active: p.active })
    setShow(true); setMsg(''); setErr('')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">The &ldquo;SAVAN in action&rdquo; strip on the homepage. Lower order shows first.</p>
        <button onClick={() => { reset(); setShow(true); setMsg(''); setErr('') }} className="btn-primary flex items-center gap-2 flex-shrink-0"><Plus className="w-4 h-4" />New photo</button>
      </div>
      {msg && <p className="text-sm text-green-700 mb-3">{msg}</p>}
      {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

      {show && (
        <div className="card mb-6 space-y-4">
          <h3 className="font-semibold text-gray-900">{editId ? 'Edit photo' : 'New photo'}</h3>
          <div><label className="label">Photo *</label>
            <input type="file" accept="image/*" className="input text-sm py-1.5" onChange={onImg} />
            {form.image_url && <img src={form.image_url} alt="" className="h-28 mt-2 rounded border border-gray-100 object-cover" />}</div>
          <div><label className="label">Caption</label>
            <input className="input" value={form.caption} onChange={e => set('caption', e.target.value)} placeholder="e.g. CPR demonstration on an adult manikin" /></div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} />Active</label>
            <label className="flex items-center gap-2 text-sm">Order <input type="number" className="input w-20 py-1" value={form.sort} onChange={e => set('sort', +e.target.value || 0)} /></label>
          </div>
          <div className="flex gap-3">
            <button onClick={save} disabled={busy} className="btn-primary px-6">{busy ? 'Saving…' : 'Save'}</button>
            <button onClick={() => { setShow(false); reset() }} className="btn-secondary px-6">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {rows.map(p => (
          <div key={p.id} className="card p-2">
            <img src={p.image_url} alt={p.caption || ''} className="w-full h-28 object-cover rounded" />
            <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">{p.caption || <span className="text-gray-300">No caption</span>}</p>
            <div className="flex items-center justify-between mt-1 text-xs">
              <span className={p.active ? 'text-green-700' : 'text-gray-400'}>{p.active ? 'Active' : 'Hidden'} · #{p.sort}</span>
              <span className="flex items-center gap-2">
                <button onClick={() => startEdit(p)} className="text-[#000066] hover:underline">Edit</button>
                <button onClick={() => remove(p.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </span>
            </div>
          </div>
        ))}
        {!rows.length && <div className="card text-center py-10 text-gray-400 text-sm col-span-full">No photos yet.</div>}
      </div>
    </div>
  )
}
