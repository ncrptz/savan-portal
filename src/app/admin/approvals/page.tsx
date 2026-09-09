'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ClipboardCheck } from 'lucide-react'

interface Req {
  id: string
  request_reason: string
  created_at: string
  requested_by_role: string | null
  certificate: { cert_id: string; trainee_name: string } | null
}

export default function ApprovalsPage() {
  const [role, setRole]   = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [reqs, setReqs]   = useState<Req[]>([])
  const [modal, setModal] = useState<{ req: Req; approve: boolean } | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy]   = useState(false)
  const [err, setErr]     = useState('')

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    let rl: string | null = null
    if (user) {
      const { data: p } = await supabase.from('profiles').select('role').eq('user_id', user.id).single()
      rl = p?.role ?? null
    }
    setRole(rl)
    if (rl === 'admin1' || rl === 'superadmin') {
      const { data } = await supabase
        .from('reversal_requests')
        .select('id, request_reason, created_at, requested_by_role, certificate:certificates(cert_id, trainee_name)')
        .eq('status', 'pending')
        .order('created_at')
      setReqs((data as any) ?? [])
    }
    setReady(true)
  }
  useEffect(() => { load() }, [])

  function open(req: Req, approve: boolean) { setModal({ req, approve }); setReason(''); setErr('') }

  async function submit() {
    if (!modal) return
    if (!reason.trim()) { setErr('A reason is required.'); return }
    setBusy(true); setErr('')
    const supabase = createClient()
    const { error } = await supabase.rpc('review_reversal',
      { p_request_id: modal.req.id, p_approve: modal.approve, p_reason: reason })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setModal(null); await load()
  }

  if (!ready) return <div className="text-sm text-gray-400 py-12 text-center">Loading…</div>
  if (role !== 'admin1' && role !== 'superadmin')
    return <div className="max-w-xl mx-auto card text-center text-gray-600">
      This page is available to senior admins and superadmins only.
    </div>

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Reversal approvals</h1>
      <p className="text-sm text-gray-500 mb-6">{reqs.length} pending request{reqs.length !== 1 ? 's' : ''}</p>

      {reqs.length === 0 ? (
        <div className="card text-center py-12">
          <ClipboardCheck className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">No pending reversal requests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reqs.map(r => (
            <div key={r.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-gray-500">{r.certificate?.cert_id ?? '—'}</p>
                  <p className="font-medium text-gray-900">{r.certificate?.trainee_name ?? '—'}</p>
                  <p className="text-sm text-gray-600 mt-1">{r.request_reason}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    requested by {r.requested_by_role ?? 'admin'} · {new Date(r.created_at).toLocaleString('en-GB')}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => open(r, true)}
                    className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700">
                    Approve
                  </button>
                  <button onClick={() => open(r, false)}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-xs font-medium hover:bg-gray-50">
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {modal.approve ? 'Approve reversal' : 'Reject reversal'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {modal.req.certificate?.cert_id} — {modal.req.certificate?.trainee_name}
            </p>
            <label className="block text-sm text-gray-700 mt-4">Reason <span className="text-red-500">*</span></label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              className="input mt-1" placeholder="State the reason (required, recorded in the audit log)…" />
            {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setModal(null)} className="btn-secondary px-5">Cancel</button>
              <button onClick={submit} disabled={busy}
                className={`px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-40 ${modal.approve ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {busy ? 'Working…' : modal.approve ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
