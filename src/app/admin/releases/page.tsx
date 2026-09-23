'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ClipboardCheck } from 'lucide-react'

interface Req {
  id: string; claimed_full_name: string; message: string | null; created_at: string
  organisation_id: string | null; event_id: string | null
  organisation: { name: string } | null
}
interface Reg { id: string; full_name: string; training_id: string; status: string; organisation_id: string | null }

export default function AdminReleasesPage() {
  const [role, setRole] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [reqs, setReqs] = useState<Req[]>([])
  const [regs, setRegs] = useState<Reg[]>([])
  const [match, setMatch] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  async function load() {
    const s = createClient()
    const { data: { user } } = await s.auth.getUser()
    let rl: string | null = null
    if (user) {
      const { data: p } = await s.from('profiles').select('role').eq('user_id', user.id).single()
      rl = p?.role ?? null
    }
    setRole(rl)
    if (['superadmin', 'admin1', 'admin2'].includes(rl || '')) {
      const { data: rq } = await s.from('release_requests')
        .select('id, claimed_full_name, message, created_at, organisation_id, event_id, organisation:organisations(name)')
        .eq('status', 'pending').order('created_at')
      setReqs((rq as any) ?? [])
      const { data: rg } = await s.from('event_registrations')
        .select('id, full_name, training_id, status, organisation_id').is('user_id', null).order('created_at')
      setRegs((rg as any) ?? [])
    }
    setReady(true)
  }
  useEffect(() => { load() }, [])

  async function approve(reqId: string) {
    const regId = match[reqId]
    if (!regId) { setErr('Select the registration that matches this person first.'); return }
    setBusy(true); setErr(''); setMsg('')
    const { error } = await createClient().rpc('approve_release', { p_request_id: reqId, p_registration_id: regId })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setMsg('Certificate released to the requester.'); await load()
  }
  async function reject(reqId: string) {
    setBusy(true); setErr(''); setMsg('')
    const { error } = await createClient().rpc('reject_release', { p_request_id: reqId, p_reason: null })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setMsg('Request rejected.'); await load()
  }

  if (!ready) return <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
  if (!['superadmin', 'admin1', 'admin2'].includes(role || ''))
    return <div className="max-w-xl mx-auto card text-center text-gray-600">This page is for administrators.</div>

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Certificate release requests</h1>
      <p className="text-sm text-gray-500 mb-6">{reqs.length} pending request{reqs.length !== 1 ? 's' : ''}</p>
      {msg && <p className="text-sm text-green-700 mb-3">{msg}</p>}
      {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

      {reqs.length === 0 ? (
        <div className="card text-center py-12">
          <ClipboardCheck className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">No pending release requests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reqs.map(rq => {
            const candidates = regs.filter(r => !rq.organisation_id || r.organisation_id === rq.organisation_id)
            return (
              <div key={rq.id} className="card">
                <p className="font-medium text-gray-900">{rq.claimed_full_name}</p>
                <p className="text-xs text-gray-500">Organisation: {rq.organisation?.name ?? '—'}</p>
                {rq.message && <p className="text-sm text-gray-600 mt-1">{rq.message}</p>}
                <p className="text-xs text-gray-400 mt-0.5">{new Date(rq.created_at).toLocaleString('en-GB')}</p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <select className="input text-sm py-1.5 min-w-[240px]"
                    value={match[rq.id] || ''} onChange={e => setMatch({ ...match, [rq.id]: e.target.value })}>
                    <option value="">— Match to a registration —</option>
                    {candidates.map(r => (
                      <option key={r.id} value={r.id}>{r.full_name} · {r.training_id} ({r.status})</option>
                    ))}
                  </select>
                  <button onClick={() => approve(rq.id)} disabled={busy}
                    className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700">Approve &amp; release</button>
                  <button onClick={() => reject(rq.id)} disabled={busy}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-xs hover:bg-gray-50">Reject</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
