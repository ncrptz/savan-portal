'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, Download, Trash2, Lock } from 'lucide-react'

interface TestEvent {
  id: string; title: string; training_date: string | null; certs: number
}

export default function MaintenancePage() {
  const [role, setRole]     = useState<string | null>(null)
  const [ready, setReady]   = useState(false)
  const [events, setEvents] = useState<TestEvent[]>([])
  const [sel, setSel]       = useState<Set<string>>(new Set())
  const [ack, setAck]       = useState(false)
  const [busy, setBusy]     = useState(false)
  const [msg, setMsg]       = useState('')
  const [err, setErr]       = useState('')

  async function loadList() {
    const s = createClient()
    const { data: evs } = await s.from('training_events')
      .select('id, title, training_date').eq('is_test', true).order('created_at', { ascending: false })
    const list = (evs as any[]) ?? []
    const ids = list.map(e => e.id)
    let countByEvent: Record<string, number> = {}
    if (ids.length) {
      const { data: certs } = await s.from('certificates').select('event_id').in('event_id', ids)
      ;((certs as any[]) ?? []).forEach(c => { countByEvent[c.event_id] = (countByEvent[c.event_id] || 0) + 1 })
    }
    setEvents(list.map(e => ({ id: e.id, title: e.title, training_date: e.training_date, certs: countByEvent[e.id] || 0 })))
    setSel(new Set())
  }

  useEffect(() => {
    (async () => {
      const s = createClient()
      const { data: { user } } = await s.auth.getUser()
      if (user) {
        const { data: p } = await s.from('profiles').select('role').eq('user_id', user.id).single()
        setRole(p?.role ?? null)
        if (p?.role === 'superadmin') await loadList()
      }
      setReady(true)
    })()
  }, [])

  function toggle(id: string) {
    const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n)
  }
  function selectAll() { setSel(new Set(events.map(e => e.id))) }
  function clearSel() { setSel(new Set()) }

  async function makePermanent(id: string) {
    setBusy(true); setErr(''); setMsg('')
    const { error } = await createClient().from('training_events').update({ is_test: false }).eq('id', id)
    setBusy(false)
    if (error) { setErr(error.message); return }
    setMsg('Event made permanent — it is no longer a test item and can’t be deleted here.')
    await loadList()
  }

  async function handleExport() {
    setErr(''); setMsg('')
    const s = createClient()
    const { data: evs } = await s.from('training_events').select('*').eq('is_test', true)
    const ids = (evs ?? []).map((e: any) => e.id)
    const { data: certs } = ids.length ? await s.from('certificates').select('*').in('event_id', ids) : { data: [] }
    const payload = { exported_at: new Date().toISOString(), test_events: evs ?? [], certificates: certs ?? [] }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `savan-test-data-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url)
    setMsg('Exported test data to a JSON download.')
  }

  async function deleteSelected() {
    if (!sel.size || !ack) return
    setBusy(true); setErr(''); setMsg('')
    const { data, error } = await createClient().rpc('delete_test_events', { p_ids: Array.from(sel) })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setAck(false)
    setMsg(`Removed ${data?.events ?? 0} event(s) and ${data?.certificates ?? 0} certificate(s).`)
    await loadList()
  }

  if (!ready) return <div className="text-sm text-gray-400 py-12 text-center">Loading…</div>
  if (role !== 'superadmin')
    return <div className="max-w-xl mx-auto card text-center text-gray-600">This page is available to superadmins only.</div>

  const selCerts = events.filter(e => sel.has(e.id)).reduce((n, e) => n + e.certs, 0)

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Maintenance</h1>
      <p className="text-sm text-gray-500 mb-6">Superadmin-only tools.</p>

      <div className="card border border-red-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900">Test data</h2>
            <p className="text-sm text-gray-600 mt-1">
              Events marked <strong>“test event”</strong> are listed below. Select the ones you want to
              remove permanently (their certificates and trainees go too), or make an event
              <strong> permanent</strong> to keep it — a permanent event drops out of this list and can’t be deleted here.
              Real (non-test) records are never shown.
            </p>

            <button onClick={handleExport} className="btn-secondary mt-4 flex items-center gap-2">
              <Download className="w-4 h-4" /> Export test data (JSON)
            </button>

            {events.length === 0 ? (
              <div className="mt-5 p-4 bg-gray-50 rounded-lg text-sm text-gray-500 text-center">No test events.</div>
            ) : (
              <>
                <div className="mt-5 flex items-center justify-between text-xs">
                  <span className="text-gray-500">{events.length} test event{events.length !== 1 ? 's' : ''}</span>
                  <span className="flex gap-3">
                    <button onClick={selectAll} className="text-[#000066] hover:underline">Select all</button>
                    <button onClick={clearSel} className="text-gray-500 hover:underline">Clear</button>
                  </span>
                </div>

                <div className="mt-2 border border-gray-100 rounded-lg divide-y divide-gray-100">
                  {events.map(e => (
                    <div key={e.id} className="flex items-center gap-3 p-3">
                      <input type="checkbox" checked={sel.has(e.id)} onChange={() => toggle(e.id)} className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{e.title}</p>
                        <p className="text-xs text-gray-500">
                          {e.training_date ? new Date(e.training_date).toLocaleDateString('en-GB') : '—'} · {e.certs} certificate{e.certs !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <button onClick={() => makePermanent(e.id)} disabled={busy}
                        className="text-xs text-[#000066] hover:underline inline-flex items-center gap-1 flex-shrink-0">
                        <Lock className="w-3 h-3" />Make permanent
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100">
                  <label className="flex items-start gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} className="w-4 h-4 mt-0.5" />
                    <span>I understand this permanently deletes the <strong>{sel.size}</strong> selected event{sel.size !== 1 ? 's' : ''} and their <strong>{selCerts}</strong> certificate{selCerts !== 1 ? 's' : ''}. This cannot be undone.</span>
                  </label>
                  <button onClick={deleteSelected} disabled={busy || sel.size === 0 || !ack}
                    className="mt-3 flex items-center gap-2 px-6 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">
                    <Trash2 className="w-4 h-4" />{busy ? 'Removing…' : `Delete ${sel.size} selected`}
                  </button>
                </div>
              </>
            )}

            {msg && <p className="mt-4 text-sm text-green-700">{msg}</p>}
            {err && <p className="mt-4 text-sm text-red-600">{err}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
