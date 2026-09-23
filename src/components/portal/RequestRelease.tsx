'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, ChevronDown, ChevronUp } from 'lucide-react'

interface OrgOpt { id: string; name: string }

export default function RequestRelease({ defaultName }: { defaultName: string }) {
  const [open, setOpen] = useState(false)
  const [orgs, setOrgs] = useState<OrgOpt[]>([])
  const [orgId, setOrgId] = useState('')
  const [name, setName] = useState(defaultName)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    createClient().from('organisations').select('id, name').eq('status', 'approved').order('name')
      .then(({ data }) => setOrgs((data as any) ?? []))
  }, [])

  async function submit() {
    if (!orgId || !name.trim()) { setErr('Choose the organisation and enter your name as registered.'); return }
    setBusy(true); setErr(''); setMsg('')
    const { error } = await createClient().rpc('request_release',
      { p_organisation_id: orgId, p_event_id: null, p_full_name: name.trim(), p_message: message.trim() || null })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setMsg('Request sent. The organisation will review and release your certificate to this account.')
    setMessage('')
  }

  return (
    <div className="card mt-6">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between">
        <span className="flex items-center gap-2 text-[#000066] font-medium">
          <Building2 className="w-5 h-5" />Request an organisation-held certificate
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-gray-500">
            Trained through an organisation and want your certificate on this personal account? Send a request —
            the organisation will match and release it to you.
          </p>
          <div>
            <label className="label">Organisation</label>
            <select className="input" value={orgId} onChange={e => setOrgId(e.target.value)}>
              <option value="">— Select organisation —</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Your name as registered</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Message <span className="text-gray-400">(optional)</span></label>
            <textarea className="input" rows={2} value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Anything that helps them find you — training date, event, etc." />
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          {msg && <p className="text-sm text-green-700">{msg}</p>}
          <button onClick={submit} disabled={busy} className="btn-primary px-6">
            {busy ? 'Sending…' : 'Send request'}
          </button>
        </div>
      )}
    </div>
  )
}
