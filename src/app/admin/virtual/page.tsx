'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, Plus, Trash2, Pencil, Check } from 'lucide-react'

interface Question { q: string; options: string[]; answer: number }
interface Course {
  id: string; title: string; description: string; status: string
  video_url: string | null; material_url: string | null; lesson_html: string | null
  duration_minutes: number | null; pass_mark: number
}
const BLANK = {
  title: '', description: '', video_url: '', material_url: '', lesson_html: '',
  duration_minutes: 0, pass_mark: 70, status: 'draft',
}

export default function AdminVirtualPage() {
  const [role, setRole] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({ ...BLANK })
  const [questions, setQuestions] = useState<Question[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function load() {
    const s = createClient()
    const { data: { user } } = await s.auth.getUser()
    if (user) {
      const { data: p } = await s.from('profiles').select('role').eq('user_id', user.id).single()
      setRole(p?.role ?? null)
    }
    const { data } = await s.from('virtual_courses')
      .select('id, title, description, status, video_url, material_url, lesson_html, duration_minutes, pass_mark')
      .order('created_at', { ascending: false })
    setCourses((data as any) ?? [])
    setReady(true)
  }
  useEffect(() => { load() }, [])

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) { setForm(f => ({ ...f, [k]: v })) }
  function resetForm() { setForm({ ...BLANK }); setQuestions([]); setEditId(null) }

  async function startNew() { resetForm(); setShow(true); setMsg(''); setErr('') }
  async function startEdit(c: Course) {
    setEditId(c.id)
    setForm({
      title: c.title || '', description: c.description || '', video_url: c.video_url || '',
      material_url: c.material_url || '', lesson_html: c.lesson_html || '',
      duration_minutes: c.duration_minutes || 0, pass_mark: c.pass_mark || 70, status: c.status || 'draft',
    })
    const { data } = await createClient().from('course_quizzes').select('questions').eq('course_id', c.id).single()
    setQuestions((data?.questions as Question[]) ?? [])
    setShow(true); setMsg(''); setErr('')
  }

  // quiz builder helpers
  function addQ() { setQuestions(q => [...q, { q: '', options: ['', ''], answer: 0 }]) }
  function setQ(i: number, patch: Partial<Question>) { setQuestions(qs => qs.map((q, j) => j === i ? { ...q, ...patch } : q)) }
  function delQ(i: number) { setQuestions(qs => qs.filter((_, j) => j !== i)) }
  function addOpt(i: number) { setQuestions(qs => qs.map((q, j) => j === i ? { ...q, options: [...q.options, ''] } : q)) }
  function setOpt(i: number, oi: number, v: string) { setQuestions(qs => qs.map((q, j) => j === i ? { ...q, options: q.options.map((o, k) => k === oi ? v : o) } : q)) }
  function delOpt(i: number, oi: number) {
    setQuestions(qs => qs.map((q, j) => {
      if (j !== i) return q
      const options = q.options.filter((_, k) => k !== oi)
      return { ...q, options, answer: q.answer >= options.length ? 0 : q.answer }
    }))
  }

  async function onMaterial(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setBusy(true); setErr('')
    const s = createClient()
    const ext = (file.name.split('.').pop() || 'pdf').toLowerCase()
    const path = `materials/${Date.now()}.${ext}`
    const { error } = await s.storage.from('courses').upload(path, file, { upsert: true, contentType: file.type || 'application/pdf' })
    setBusy(false)
    if (error) { setErr(error.message); return }
    const { data } = s.storage.from('courses').getPublicUrl(path)
    set('material_url', data?.publicUrl ? `${data.publicUrl}` : '')
    setMsg('Material uploaded — remember to Save.')
  }

  async function save() {
    if (!form.title.trim()) { setErr('Title is required.'); return }
    // Validate quiz
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.q.trim()) { setErr(`Question ${i + 1} has no text.`); return }
      if (q.options.filter((o: string) => o.trim()).length < 2) { setErr(`Question ${i + 1} needs at least 2 options.`); return }
    }
    setBusy(true); setErr(''); setMsg('')
    const s = createClient()
    const payload = {
      title: form.title.trim(), description: form.description.trim() || null,
      video_url: form.video_url.trim() || null, material_url: form.material_url.trim() || null,
      lesson_html: form.lesson_html.trim() || null,
      duration_minutes: form.duration_minutes || null, pass_mark: form.pass_mark || 70, status: form.status,
    }
    let courseId = editId
    if (editId) {
      const { error } = await s.from('virtual_courses').update(payload).eq('id', editId)
      if (error) { setErr(error.message); setBusy(false); return }
    } else {
      const { data, error } = await s.from('virtual_courses').insert(payload).select('id').single()
      if (error) { setErr(error.message); setBusy(false); return }
      courseId = data?.id ?? null
    }
    if (courseId) {
      const { error } = await s.from('course_quizzes')
        .upsert({ course_id: courseId, questions, updated_at: new Date().toISOString() }, { onConflict: 'course_id' })
      if (error) { setErr(error.message); setBusy(false); return }
    }
    setBusy(false); setShow(false); resetForm(); setMsg('Course saved.'); await load()
  }

  if (!ready) return <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
  if (role !== 'superadmin' && role !== 'admin1' && role !== 'admin2')
    return <div className="max-w-xl mx-auto card text-center text-gray-600">Virtual Training is managed by admins.</div>

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><BookOpen className="w-6 h-6 text-[#000066]" />Virtual Training</h1>
          <p className="text-sm text-gray-500 mt-0.5">Self-paced theory courses with an instant graded test.</p>
        </div>
        <button onClick={startNew} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />New course</button>
      </div>

      {msg && <p className="text-sm text-green-700 mb-3">{msg}</p>}
      {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

      {show && (
        <div className="card mb-6 space-y-4">
          <h2 className="font-semibold text-gray-900">{editId ? 'Edit course' : 'New course'}</h2>
          <div>
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. BLS Theory & Principles" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Video link <span className="text-gray-400">(YouTube/Vimeo)</span></label>
              <input className="input" value={form.video_url} onChange={e => set('video_url', e.target.value)} placeholder="https://youtu.be/…" />
            </div>
            <div>
              <label className="label">Material (PDF/slides)</label>
              <input type="file" accept=".pdf,.ppt,.pptx" className="input text-sm py-1.5" onChange={onMaterial} />
              {form.material_url && <p className="text-xs text-green-700 mt-1">Uploaded ✓</p>}
            </div>
          </div>
          <div>
            <label className="label">Written lesson <span className="text-gray-400">(optional)</span></label>
            <textarea className="input" rows={5} value={form.lesson_html} onChange={e => set('lesson_html', e.target.value)} placeholder="Type the lesson content. Line breaks are preserved." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Duration (mins)</label>
              <input type="number" min={0} className="input" value={form.duration_minutes} onChange={e => set('duration_minutes', Math.max(0, +e.target.value || 0))} />
            </div>
            <div>
              <label className="label">Pass mark (%)</label>
              <input type="number" min={0} max={100} className="input" value={form.pass_mark} onChange={e => set('pass_mark', Math.min(100, Math.max(0, +e.target.value || 0)))} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          {/* Quiz builder */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">Test questions ({questions.length})</h3>
              <button type="button" onClick={addQ} className="text-sm text-[#000066] hover:underline inline-flex items-center gap-1"><Plus className="w-4 h-4" />Add question</button>
            </div>
            <p className="text-xs text-gray-500 mb-3">Tick the correct option for each question. Learners never see the answer key.</p>
            <div className="space-y-4">
              {questions.map((q, i) => (
                <div key={i} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-gray-400 pt-2">{i + 1}.</span>
                    <input className="input flex-1" value={q.q} onChange={e => setQ(i, { q: e.target.value })} placeholder="Question text" />
                    <button type="button" onClick={() => delQ(i)} className="text-gray-400 hover:text-red-600 pt-2"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="mt-2 space-y-1.5 pl-6">
                    {q.options.map((o, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input type="radio" name={`ans-${i}`} checked={q.answer === oi} onChange={() => setQ(i, { answer: oi })} title="Correct answer" />
                        <input className="input text-sm py-1.5 flex-1" value={o} onChange={e => setOpt(i, oi, e.target.value)} placeholder={`Option ${oi + 1}`} />
                        {q.options.length > 2 && <button type="button" onClick={() => delOpt(i, oi)} className="text-gray-300 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>}
                      </div>
                    ))}
                    <button type="button" onClick={() => addOpt(i)} className="text-xs text-[#000066] hover:underline">+ option</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={save} disabled={busy} className="btn-primary px-6">{busy ? 'Saving…' : 'Save course'}</button>
            <button onClick={() => { setShow(false); resetForm() }} className="btn-secondary px-6">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {courses.map(c => (
          <div key={c.id} className="card flex items-center justify-between">
            <div className="min-w-0">
              <p className="font-medium text-gray-900">{c.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                <span className={`capitalize ${c.status === 'published' ? 'text-green-700' : 'text-amber-600'}`}>{c.status}</span>
                {c.duration_minutes ? ` · ${c.duration_minutes} mins` : ''} · pass {c.pass_mark}%
              </p>
            </div>
            <button onClick={() => startEdit(c)} className="text-sm text-[#000066] hover:underline inline-flex items-center gap-1"><Pencil className="w-3.5 h-3.5" />Edit</button>
          </div>
        ))}
        {!courses.length && <div className="card text-center py-10 text-gray-400 text-sm">No courses yet. Create one to get started.</div>}
      </div>
    </div>
  )
}
