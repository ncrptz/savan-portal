'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LifeBuoy, CheckCircle, Clock, RotateCcw } from 'lucide-react'

interface Ticket {
  id: string; user_name: string | null; category: string | null; cert_ref: string | null
  subject: string; message: string; status: string; admin_response: string | null; created_at: string
}
type Filter = 'all' | 'open' | 'in_progress' | 'resolved'

export default function SupportPage() {
  const [role, setRole] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [filter, setFilter] = useState<Filter>('open')
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState('')

  async function load() {
    const s = createClient()
    const { data: { user } } = await s.auth.getUser()
    if (user) {
      const { data: p } = await s.from('profiles').select('role').eq('user_id', user.id).single()
      setRole(p?.role ?? null)
    }
    const { data } = await s.from('support_tickets')
      .select('id, user_name, category, cert_ref, subject, message, status, admin_response, created_at')
      .order('created_at', { ascending: false })
    const rows = (data as Ticket[]) ?? []
    setTickets(rows)
    setDraft(Object.fromEntries(rows.map(t => [t.id, t.admin_response || ''])))
    setReady(true)
  }
  useEffect(() => { load() }, [])

  async function update(id: string, patch: Record<string, any>) {
    setBusy(id); setErr('')
    const { error } = await createClient().from('support_tickets')
      .update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
    setBusy(null)
    if (error) { setErr(error.message); return }
    await load()
  }
  function saveResponse(id: string) { update(id, { admin_response: draft[id] || null }) }
  async function setStatus(id: string, status: string) {
    const { data: { user } } = await createClient().auth.getUser()
    update(id, status === 'resolved'
      ? { status, resolved_by: user?.id ?? null, resolved_at: new Date().toISOString() }
      : { status })
  }

  if (!ready) return <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
  if (role !== 'superadmin' && role !== 'admin1' && role !== 'admin2')
    return <div className="max-w-xl mx-auto card text-center text-gray-600">Support requests are available to admins.</div>

  const shown = tickets.filter(t => filter === 'all' ? true : t.status === filter)
  const counts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  }
  const FILTERS: { k: Filter; label: string }[] = [
    { k: 'open', label: 'Open' }, { k: 'in_progress', label: 'In progress' },
    { k: 'resolved', label: 'Resolved' }, { k: 'all', label: 'All' },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-1"><LifeBuoy className="w-6 h-6 text-[#000066]" />
        <h1 className="text-2xl font-bold text-gray-900">Support</h1></div>
      <p className="text-sm text-gray-500 mb-6">Issues raised by trainees — respond and resolve here.</p>

      {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)}
            className={`px-3.5 py-1.5 rounded-full text-sm transition-colors ${
              filter === f.k ? 'bg-[#000066] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {f.label} <span className={filter === f.k ? 'text-blue-200' : 'text-gray-400'}>{counts[f.k]}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">No requests in this view.</div>
      ) : (
        <div className="space-y-4">
          {shown.map(t => (
            <div key={t.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{t.subject}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t.user_name || 'Trainee'} · {new Date(t.created_at).toLocaleDateString('en-GB')}
                    {t.category && t.category !== 'general' && <> · <span className="capitalize">{t.category.replace(/_/g, ' ')}</span></>}
                    {t.cert_ref && <> · <span className="font-mono">{t.cert_ref}</span></>}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                  t.status === 'resolved' ? 'bg-green-100 text-green-700'
                  : t.status === 'in_progress' ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-500'}`}>
                  {t.status === 'in_progress' ? 'In progress' : t.status === 'resolved' ? 'Resolved' : 'Open'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{t.message}</p>

              <div className="mt-3">
                <label className="label">Response to the trainee</label>
                <textarea className="input" rows={3} value={draft[t.id] ?? ''}
                  onChange={e => setDraft(d => ({ ...d, [t.id]: e.target.value }))}
                  placeholder="Write a reply the trainee will see…" />
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={() => saveResponse(t.id)} disabled={busy === t.id}
                  className="btn-primary text-sm px-4 py-1.5">{busy === t.id ? 'Saving…' : 'Save response'}</button>
                {t.status !== 'in_progress' && t.status !== 'resolved' && (
                  <button onClick={() => setStatus(t.id, 'in_progress')} disabled={busy === t.id}
                    className="btn-secondary text-sm px-4 py-1.5 inline-flex items-center gap-1.5"><Clock className="w-4 h-4" />Mark in progress</button>
                )}
                {t.status !== 'resolved' && (
                  <button onClick={() => setStatus(t.id, 'resolved')} disabled={busy === t.id}
                    className="text-sm px-4 py-1.5 rounded-lg border border-green-200 text-green-700 hover:bg-green-50 inline-flex items-center gap-1.5"><CheckCircle className="w-4 h-4" />Mark resolved</button>
                )}
                {t.status === 'resolved' && (
                  <button onClick={() => setStatus(t.id, 'open')} disabled={busy === t.id}
                    className="text-sm px-4 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 inline-flex items-center gap-1.5"><RotateCcw className="w-4 h-4" />Reopen</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
