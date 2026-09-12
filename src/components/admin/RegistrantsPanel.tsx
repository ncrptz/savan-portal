'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Check, DoorOpen, DoorClosed, Award } from 'lucide-react'

interface Reg { id: string; training_id: string; full_name: string; status: string; created_at: string }

export default function RegistrantsPanel(
  { eventId, registrationOpen }: { eventId: string; registrationOpen: boolean }
) {
  const [regs, setRegs]   = useState<Reg[]>([])
  const [open, setOpen]   = useState(registrationOpen)
  const [sel, setSel]     = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]   = useState(false)
  const [msg, setMsg]     = useState('')
  const [err, setErr]     = useState('')
  const [genErrors, setGenErrors] = useState<{ name: string; error: string }[]>([])

  async function load(preselectTrained = false) {
    const { data } = await createClient().from('event_registrations')
      .select('id, training_id, full_name, status, created_at')
      .eq('event_id', eventId).order('created_at')
    const rows: Reg[] = (data as any) ?? []
    setRegs(rows)
    if (preselectTrained) setSel(new Set(rows.filter(r => r.status === 'trained').map(r => r.id)))
    setLoading(false)
  }
  useEffect(() => { load(true) }, [])

  async function toggleOpen() {
    setBusy(true); setErr('')
    const { error } = await createClient()
      .from('training_events').update({ registration_open: !open }).eq('id', eventId)
    setBusy(false)
    if (error) { setErr(error.message); return }
    setOpen(!open)
  }

  function toggleSel(id: string) {
    const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n)
  }

  async function confirmTrained(ids: string[]) {
    if (!ids.length) return
    setBusy(true); setErr(''); setMsg(''); setGenErrors([])
    const s = createClient()
    for (const id of ids) {
      const { error } = await s.rpc('confirm_trained', { p_registration_id: id })
      if (error) { setErr(error.message); setBusy(false); return }
    }
    setBusy(false); setMsg(`Marked ${ids.length} as trained.`); await load(true)
  }

  async function unconfirm(id: string) {
    setBusy(true); setErr(''); setMsg(''); setGenErrors([])
    const { error } = await createClient().rpc('unconfirm_trained', { p_registration_id: id })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setMsg('Reverted to scheduled.'); await load(true)
  }

  async function generate(ids: string[]) {
    const chosen = regs.filter(r => ids.includes(r.id) && r.status === 'trained')
    if (!chosen.length) return
    setBusy(true); setErr(''); setMsg(''); setGenErrors([])
    const s = createClient()
    const { data: ev } = await s.from('training_events')
      .select('template_type, sponsored_by, collab_signer_name, collab_signer_title, year, month, session_in_month, training_date')
      .eq('id', eventId).single()
    if (!ev) { setErr('Could not load event settings'); setBusy(false); return }
    const date = String(ev.training_date || '').slice(0, 10)
    const fd = new FormData()
    fd.append('event_id', eventId)
    fd.append('template_type', ev.template_type || 'T1')
    fd.append('year', String(ev.year || new Date().getFullYear()))
    fd.append('month', String(ev.month || (new Date().getMonth() + 1)))
    fd.append('session', String(ev.session_in_month || 1))
    fd.append('sponsored_by', ev.sponsored_by || '')
    fd.append('collab_signer_name', ev.collab_signer_name || '')
    fd.append('collab_signer_title', ev.collab_signer_title || '')
    fd.append('participants', JSON.stringify(
      chosen.map(r => ({ name: r.full_name, date, registration_id: r.id }))))
    try {
      const res = await fetch('/api/generate', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setErr(data.error || 'Generation failed'); setBusy(false); return }
      const ok = (data.certificates || []).filter((c: any) => c.cert_id).length
      const errs = (data.certificates || []).filter((c: any) => c.error)
        .map((c: any) => ({ name: c.name, error: c.error }))
      setGenErrors(errs)
      setMsg(`Generated ${ok} certificate${ok !== 1 ? 's' : ''}.` +
             (errs.length ? ` ${errs.length} could not be issued.` : ''))
    } catch (e: any) { setErr(e.message) }
    setBusy(false)
    await load(true)
  }

  const selScheduled = Array.from(sel).filter(id => regs.find(r => r.id === id)?.status === 'scheduled')
  const selTrained   = Array.from(sel).filter(id => regs.find(r => r.id === id)?.status === 'trained')

  const badge = (st: string) =>
    st === 'certified' ? <span className="text-[#000066] text-xs font-medium">Certified</span>
    : st === 'trained' ? <span className="text-green-700 text-xs font-medium">Trained</span>
    : <span className="text-amber-600 text-xs font-medium">Scheduled</span>

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-[#000066]">
          <Users className="w-5 h-5" />
          <h2 className="font-semibold text-gray-900">Registrants ({regs.length})</h2>
        </div>
        <button onClick={toggleOpen} disabled={busy}
          className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border ${
            open ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
          {open ? <><DoorOpen className="w-4 h-4" />Registration open</>
                : <><DoorClosed className="w-4 h-4" />Registration closed</>}
        </button>
      </div>

      {(selScheduled.length > 0 || selTrained.length > 0) && (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          {selScheduled.length > 0 && (
            <button onClick={() => confirmTrained(selScheduled)} disabled={busy}
              className="btn-secondary text-sm flex items-center gap-1.5 px-4 py-1.5">
              <Check className="w-4 h-4" />Mark {selScheduled.length} as trained
            </button>
          )}
          {selTrained.length > 0 && (
            <button onClick={() => generate(selTrained)} disabled={busy}
              className="btn-primary text-sm flex items-center gap-1.5 px-4 py-1.5">
              <Award className="w-4 h-4" />
              {busy ? 'Generating…' : `Generate ${selTrained.length} certificate${selTrained.length !== 1 ? 's' : ''}`}
            </button>
          )}
          <button onClick={() => setSel(new Set())} className="text-sm text-gray-500 hover:text-gray-700">Clear</button>
        </div>
      )}
      {busy && <p className="text-xs text-gray-400 mb-2">Working… certificate generation can take up to a minute.</p>}
      {msg && <p className="text-sm text-green-700 mb-2">{msg}</p>}
      {err && <p className="text-sm text-red-600 mb-2">{err}</p>}
      {genErrors.length > 0 && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
          <p className="font-medium text-amber-800">Some certificates weren&apos;t issued:</p>
          <ul className="mt-1 text-amber-700 list-disc list-inside">
            {genErrors.map((g, i) => <li key={i}>{g.name}: {g.error}</li>)}
          </ul>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400 py-6 text-center">Loading…</p>
      ) : regs.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">
            No registrants yet.{open
              ? ' Registration is open — share the event so people can sign up.'
              : ' Open registration to let people sign up.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 text-left text-gray-500">
              <th className="py-2 px-2 w-8"></th>
              <th className="py-2 px-2 font-medium">Training ID</th>
              <th className="py-2 px-2 font-medium">Name</th>
              <th className="py-2 px-2 font-medium">Status</th>
              <th className="py-2 px-2 font-medium text-right">Action</th>
            </tr></thead>
            <tbody>
              {regs.map(r => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-2">
                    {(r.status === 'scheduled' || r.status === 'trained') &&
                      <input type="checkbox" checked={sel.has(r.id)} onChange={() => toggleSel(r.id)} />}
                  </td>
                  <td className="py-2 px-2 font-mono text-xs text-gray-600">{r.training_id}</td>
                  <td className="py-2 px-2 text-gray-900">{r.full_name}</td>
                  <td className="py-2 px-2">{badge(r.status)}</td>
                  <td className="py-2 px-2 text-right">
                    {r.status === 'scheduled' && (
                      <button onClick={() => confirmTrained([r.id])} disabled={busy}
                        className="text-[#000066] hover:underline text-xs">Confirm trained</button>
                    )}
                    {r.status === 'trained' && (
                      <button onClick={() => unconfirm(r.id)} disabled={busy}
                        className="text-gray-500 hover:text-red-600 hover:underline text-xs">Undo</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
