'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import PortalHeader from '@/components/portal/PortalHeader'
import { formatCertDate } from '@/lib/date'
import { Building2, ExternalLink, ClipboardCheck } from 'lucide-react'
import Link from 'next/link'

interface Reg { id: string; training_id: string; full_name: string; status: string; user_id: string | null }
interface Cert { registration_id: string | null; cert_id: string; issue_date: string | null; pdf_url: string | null; verify_token: string | null }
interface Req { id: string; claimed_full_name: string; message: string | null; created_at: string; event_id: string | null }

export default function OrgPortal() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [orgName, setOrgName] = useState('')
  const [fullName, setFullName] = useState('')
  const [regs, setRegs] = useState<Reg[]>([])
  const [certByReg, setCertByReg] = useState<Record<string, Cert>>({})
  const [reqs, setReqs] = useState<Req[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [matchReg, setMatchReg] = useState<Record<string, string>>({}) // requestId -> registrationId

  async function load() {
    const s = createClient()
    const { data: { user } } = await s.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    const { data: p } = await s.from('profiles').select('full_name, org_id').eq('user_id', user.id).single()
    setFullName(p?.full_name || '')
    if (!p?.org_id) { setReady(true); return }
    setOrgId(p.org_id)
    const { data: org } = await s.from('organisations').select('name').eq('id', p.org_id).single()
    setOrgName(org?.name || '')
    const { data: regRows } = await s.from('event_registrations')
      .select('id, training_id, full_name, status, user_id').eq('organisation_id', p.org_id).order('created_at')
    const rs: Reg[] = (regRows as any) ?? []
    setRegs(rs)
    const ids = rs.map(r => r.id)
    if (ids.length) {
      const { data: certs } = await s.from('certificates')
        .select('registration_id, cert_id, issue_date, pdf_url, verify_token').in('registration_id', ids)
      const map: Record<string, Cert> = {}
      ;((certs as any[]) ?? []).forEach(c => { if (c.registration_id) map[c.registration_id] = c })
      setCertByReg(map)
    }
    const { data: rq } = await s.from('release_requests')
      .select('id, claimed_full_name, message, created_at, event_id').eq('organisation_id', p.org_id).eq('status', 'pending').order('created_at')
    setReqs((rq as any) ?? [])
    setReady(true)
  }
  useEffect(() => { load() }, [])

  async function approve(reqId: string) {
    const regId = matchReg[reqId]
    if (!regId) { setErr('Pick the registration that matches this person first.'); return }
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

  const statusBadge = (s: string) =>
    s === 'certified' ? <span className="text-[#000066] text-xs font-medium">Certified</span>
    : s === 'trained' ? <span className="text-green-700 text-xs font-medium">Trained</span>
    : <span className="text-amber-600 text-xs font-medium">Scheduled</span>

  // registrations not yet linked to an account — candidates for release matching
  const unclaimed = regs.filter(r => !r.user_id)

  if (!ready) return <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader name={fullName} />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{orgName || 'Organisation'} Portal</h1>
        {msg && <p className="text-sm text-green-700 mb-3">{msg}</p>}
        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

        {!orgId ? (
          <div className="card text-center py-12">
            <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-600">Your account isn&apos;t linked to an organisation yet.</p>
            <p className="text-gray-400 text-sm mt-1 max-w-md mx-auto">
              Ask a SAVAN administrator to link your account to your organisation. Once linked, your
              participants and certificates will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Release requests */}
            {reqs.length > 0 && (
              <div className="card mb-6">
                <div className="flex items-center gap-2 text-[#000066] mb-3">
                  <ClipboardCheck className="w-5 h-5" />
                  <h2 className="font-semibold text-gray-900">Release requests ({reqs.length})</h2>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Someone with a personal account is requesting access to a certificate held under your organisation.
                  Match them to the correct registration, then approve.
                </p>
                <div className="space-y-3">
                  {reqs.map(rq => (
                    <div key={rq.id} className="border border-gray-100 rounded-lg p-3">
                      <p className="font-medium text-gray-900">{rq.claimed_full_name}</p>
                      {rq.message && <p className="text-sm text-gray-600 mt-0.5">{rq.message}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(rq.created_at).toLocaleString('en-GB')}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <select className="input text-sm py-1.5 min-w-[220px]"
                          value={matchReg[rq.id] || ''} onChange={e => setMatchReg({ ...matchReg, [rq.id]: e.target.value })}>
                          <option value="">— Match to a registration —</option>
                          {unclaimed.map(r => (
                            <option key={r.id} value={r.id}>{r.full_name} · {r.training_id} ({r.status})</option>
                          ))}
                        </select>
                        <button onClick={() => approve(rq.id)} disabled={busy}
                          className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700">Approve &amp; release</button>
                        <button onClick={() => reject(rq.id)} disabled={busy}
                          className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-xs hover:bg-gray-50">Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Held registrations + certificates */}
            <div className="card">
              <div className="flex items-center gap-2 text-[#000066] mb-3">
                <Building2 className="w-5 h-5" />
                <h2 className="font-semibold text-gray-900">Participants &amp; certificates ({regs.length})</h2>
              </div>
              {regs.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">No participants registered under your organisation yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-100 text-left text-gray-500">
                      <th className="py-2 px-2 font-medium">Name</th>
                      <th className="py-2 px-2 font-medium">Training ID</th>
                      <th className="py-2 px-2 font-medium">Status</th>
                      <th className="py-2 px-2 font-medium text-right">Certificate</th>
                    </tr></thead>
                    <tbody>
                      {regs.map(r => {
                        const c = certByReg[r.id]
                        return (
                          <tr key={r.id} className="border-b border-gray-50">
                            <td className="py-2 px-2 text-gray-900">{r.full_name}
                              {r.user_id && <span className="ml-2 text-xs text-gray-400">(claimed)</span>}</td>
                            <td className="py-2 px-2 font-mono text-xs text-gray-600">{r.training_id}</td>
                            <td className="py-2 px-2">{statusBadge(r.status)}</td>
                            <td className="py-2 px-2 text-right whitespace-nowrap">
                              {c ? (
                                <span className="inline-flex items-center gap-3">
                                  {c.cert_id && <a href={`/api/certificates/download?cid=${encodeURIComponent(c.cert_id)}`} target="_blank" rel="noreferrer" className="text-[#000066] hover:underline inline-flex items-center gap-1">PDF <ExternalLink className="w-3 h-3" /></a>}
                                  {c.verify_token && <Link href={`/verify?token=${c.verify_token}`} className="text-[#000066] hover:underline">Verify</Link>}
                                </span>
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
