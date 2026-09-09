'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Award, ExternalLink } from 'lucide-react'

interface Cert {
  id: string
  cert_id: string
  trainee_name: string
  issued_at: string | null
  pdf_url: string | null
  status: string
  event: { title: string } | null
}
type ModalKind = 'revoke' | 'request' | 'reverse'

export default function CertificatesPage() {
  const [certs, setCerts]   = useState<Cert[]>([])
  const [role, setRole]     = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal]   = useState<{ kind: ModalKind; cert: Cert } | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy]     = useState(false)
  const [err, setErr]       = useState('')

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from('profiles').select('role').eq('user_id', user.id).single()
      setRole(p?.role ?? null)
    }
    const { data } = await supabase
      .from('certificates')
      .select('id, cert_id, trainee_name, issued_at, pdf_url, status, event:training_events(title)')
      .order('issued_at', { ascending: false })
    setCerts((data as any) ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function open(kind: ModalKind, cert: Cert) { setModal({ kind, cert }); setReason(''); setErr('') }

  async function submit() {
    if (!modal) return
    if (!reason.trim()) { setErr('A reason is required.'); return }
    setBusy(true); setErr('')
    const supabase = createClient()
    const fn = modal.kind === 'revoke' ? 'revoke_certificate'
             : modal.kind === 'request' ? 'request_reversal'
             : 'reverse_certificate_direct'
    const { error } = await supabase.rpc(fn, { p_cert_id: modal.cert.id, p_reason: reason })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setModal(null); await load()
  }

  const statusBadge = (s: string) =>
    s === 'active'
      ? <span className="text-green-700 text-xs font-medium">Valid</span>
      : s === 'reversal_pending'
        ? <span className="text-amber-600 text-xs font-medium">Reversal pending</span>
        : <span className="text-red-600 text-xs font-medium">Revoked</span>

  function action(c: Cert) {
    if (c.status === 'active')
      return <button onClick={() => open('revoke', c)} className="text-red-600 hover:underline text-xs">Revoke</button>
    if (role === 'superadmin')
      return <button onClick={() => open('reverse', c)} className="text-[#000066] hover:underline text-xs">Reverse</button>
    if (c.status === 'reversal_pending')
      return <span className="text-gray-400 text-xs">Awaiting approval</span>
    return <button onClick={() => open('request', c)} className="text-[#000066] hover:underline text-xs">Request reversal</button>
  }

  const modalCopy = {
    revoke:  { title: 'Revoke certificate', verb: 'Revoke', cls: 'bg-red-600 hover:bg-red-700' },
    request: { title: 'Request reversal',   verb: 'Submit request', cls: 'bg-[#000066] hover:bg-blue-900' },
    reverse: { title: 'Reverse revocation', verb: 'Reverse', cls: 'bg-[#000066] hover:bg-blue-900' },
  }

  if (loading) return <div className="text-sm text-gray-400 py-12 text-center">Loading…</div>

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Certificates</h1>
        <p className="text-sm text-gray-500 mt-0.5">{certs.length} issued</p>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Certificate ID</th>
                <th className="px-4 py-3 font-medium">Trainee</th>
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Issued</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">PDF</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {certs.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">{c.cert_id}</td>
                  <td className="px-4 py-3 text-gray-900">{c.trainee_name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.event?.title ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {c.issued_at
                      ? new Date(c.issued_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">{statusBadge(c.status)}</td>
                  <td className="px-4 py-3">
                    {c.pdf_url
                      ? <a href={c.pdf_url} target="_blank" rel="noreferrer"
                           className="inline-flex items-center gap-1 text-[#000066] hover:underline">
                          Open <ExternalLink className="w-3 h-3" />
                        </a>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">{action(c)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!certs.length && (
          <div className="text-center py-12">
            <Award className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No certificates issued yet.</p>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900">{modalCopy[modal.kind].title}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {modal.cert.cert_id} — {modal.cert.trainee_name}
            </p>
            <label className="block text-sm text-gray-700 mt-4">Reason <span className="text-red-500">*</span></label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              className="input mt-1" placeholder="State the reason (required, recorded in the audit log)…" />
            {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setModal(null)} className="btn-secondary px-5">Cancel</button>
              <button onClick={submit} disabled={busy}
                className={`px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-40 ${modalCopy[modal.kind].cls}`}>
                {busy ? 'Working…' : modalCopy[modal.kind].verb}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
