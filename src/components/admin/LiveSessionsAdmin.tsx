'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Radio, Plus, Trash2, Pencil, Play, Square } from 'lucide-react'

interface Session {
  id: string; title: string; description: string | null
  scheduled_at: string | null; join_url: string | null; status: string
}
const BLANK = { title: '', description: '', scheduled_at: '', join_url: '' }

// datetime-local <-> ISO helpers
function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso); if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function LiveSessionsAdmin() {
  const [rows, setRows] = useState<Session[]>([])
  const [show, setShow] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...BLANK })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function load() {
    const { data } = await createClient().from('live_sessions')
      .select('id, title, description, scheduled_at, join_url, status')
      .order('scheduled_at', { ascending: false, nullsFirst: false })
    setRows((data as any) ?? [])
  }
  useEffect(() => { load() }, [])

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) { setForm(f => ({ ...f, [k]: v })) }
  function reset() { setForm({ ...BLANK }); setEditId(null) }
  function startNew() { reset(); setShow(true); setMsg(''); setErr('') }
  function startEdit(s: Session) {
    setEditId(s.id)
    setForm({ title: s.title, description: s.description || '', scheduled_at: toLocalInput(s.scheduled_at), join_url: s.join_url || '' })
    setShow(true); setMsg(''); setErr('')
  }

  async function save() {
    if (!form.title.trim()) { setErr('Title is required.'); return }
    setBusy(true); setErr(''); setMsg('')
    const payload: any = {
      title: form.title.trim(), description: form.description.trim() || null,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      join_url: form.join_url.trim() || null,
    }
    const s = createClient()
    const { data: { user } } = await s.auth.getUser()
    let error
    if (editId) ({ error } = await s.from('live_sessions').update(payload).eq('id', editId))
    else ({ error } = await s.from('live_sessions').insert({ ...payload, status: 'scheduled', created_by: user?.id ?? null }))
    setBusy(false)
    if (error) { setErr(error.message); return }
    setShow(false); reset(); setMsg('Session saved.'); await load()
  }

  async function setStatus(id: string, status: string) {
    setBusy(true); setErr('')
    const { error } = await createClient().from('live_sessions').update({ status }).eq('id', id)
    setBusy(false)
    if (error) { setErr(error.message); return }
    await load()
  }
  async function remove(id: string) {
    if (!confirm('Delete this live session?')) return
    setBusy(true); setErr('')
    const { error } = await createClient().from('live_sessions').delete().eq('id', id)
    setBusy(false)
    if (error) { setErr(error.message); return }
    await load()
  }

  const badge = (st: string) =>
    st === 'live' ? 'bg-red-100 text-red-700'
    : st === 'ended' ? 'bg-gray-100 text-gray-500'
    : 'bg-amber-100 text-amber-700'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Schedule a live lecture and flip it live when you start. Paste a Zoom/Meet link, or a YouTube/Vimeo link to embed.</p>
        <button onClick={startNew} className="btn-primary flex items-center gap-2 flex-shrink-0"><Plus className="w-4 h-4" />New session</button>
      </div>
      {msg && <p className="text-sm text-green-700 mb-3">{msg}</p>}
      {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

      {show && (
        <div className="card mb-6 space-y-4">
          <h3 className="font-semibold text-gray-900">{editId ? 'Edit session' : 'New live session'}</h3>
          <div>
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Live: BLS Q&A with the instructor" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Date &amp; time</label>
              <input type="datetime-local" className="input" value={form.scheduled_at} onChange={e => set('scheduled_at', e.target.value)} />
            </div>
            <div>
              <label className="label">Join link</label>
              <input className="input" value={form.join_url} onChange={e => set('join_url', e.target.value)} placeholder="https://zoom.us/j/… or https://youtu.be/…" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} disabled={busy} className="btn-primary px-6">{busy ? 'Saving…' : 'Save'}</button>
            <button onClick={() => { setShow(false); reset() }} className="btn-secondary px-6">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {rows.map(s => (
          <div key={s.id} className="card flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900 truncate">{s.title}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${badge(s.status)}`}>{s.status}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{s.scheduled_at ? new Date(s.scheduled_at).toLocaleString('en-GB') : 'No date set'}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 text-xs">
              {s.status !== 'live'
                ? <button onClick={() => setStatus(s.id, 'live')} disabled={busy} className="inline-flex items-center gap-1 text-red-600 hover:underline"><Play className="w-3.5 h-3.5" />Go live</button>
                : <button onClick={() => setStatus(s.id, 'ended')} disabled={busy} className="inline-flex items-center gap-1 text-gray-600 hover:underline"><Square className="w-3.5 h-3.5" />End</button>}
              <button onClick={() => startEdit(s)} disabled={busy} className="inline-flex items-center gap-1 text-[#000066] hover:underline"><Pencil className="w-3.5 h-3.5" />Edit</button>
              <button onClick={() => remove(s.id)} disabled={busy} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {!rows.length && <div className="card text-center py-10 text-gray-400 text-sm">No live sessions yet.</div>}
      </div>
    </div>
  )
}
