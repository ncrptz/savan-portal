'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, Plus, Check, Ban, RotateCcw } from 'lucide-react'

interface Org {
  id: string; name: string; contact_email: string; contact_phone: string | null
  status: string; logo_url: string | null
}

export default function OrganisationsPage() {
  const [orgs, setOrgs]     = useState<Org[]>([])
  const [role, setRole]     = useState<string | null>(null)
  const [ready, setReady]   = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [busy, setBusy]     = useState(false)
  const [err, setErr]       = useState('')
  const [msg, setMsg]       = useState('')
  // new-org form
  const [name, setName]     = useState('')
  const [email, setEmail]   = useState('')
  const [phone, setPhone]   = useState('')
  const [logo, setLogo]     = useState<File | null>(null)

  async function load() {
    const s = createClient()
    const { data: { user } } = await s.auth.getUser()
    if (user) {
      const { data: p } = await s.from('profiles').select('role').eq('user_id', user.id).single()
      setRole(p?.role ?? null)
    }
    const { data } = await s.from('organisations')
      .select('id, name, contact_email, contact_phone, status, logo_url')
      .order('created_at', { ascending: false })
    setOrgs((data as any) ?? [])
    setReady(true)
  }
  useEffect(() => { load() }, [])

  async function createOrg() {
    if (!name.trim() || !email.trim()) { setErr('Name and contact email are required.'); return }
    setBusy(true); setErr(''); setMsg('')
    const s = createClient()
    const { data, error } = await s.from('organisations')
      .insert({ name: name.trim(), contact_email: email.trim(), contact_phone: phone.trim() || null, status: 'approved' })
      .select('id').single()
    if (error) { setErr(error.message); setBusy(false); return }
    if (logo && data?.id) {
      const ext = (logo.name.split('.').pop() || 'png').toLowerCase()
      const path = `orgs/${data.id}.${ext}`
      const { error: up } = await s.storage.from('logos').upload(path, logo, { upsert: true, contentType: logo.type || 'image/png' })
      if (!up) {
        const { data: pub } = s.storage.from('logos').getPublicUrl(path)
        await s.from('organisations').update({ logo_url: pub?.publicUrl }).eq('id', data.id)
      }
    }
    setBusy(false); setName(''); setEmail(''); setPhone(''); setLogo(null); setShowNew(false)
    setMsg('Organisation created.'); await load()
  }

  async function setStatus(id: string, status: string) {
    setBusy(true); setErr(''); setMsg('')
    const { error } = await createClient().from('organisations').update({ status }).eq('id', id)
    setBusy(false)
    if (error) { setErr(error.message); return }
    await load()
  }

  const badge = (s: string) =>
    s === 'approved' ? <span className="text-green-700 text-xs font-medium">Approved</span>
    : s === 'suspended' ? <span className="text-red-600 text-xs font-medium">Suspended</span>
    : <span className="text-amber-600 text-xs font-medium">Pending</span>

  if (!ready) return <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
  if (role !== 'superadmin' && role !== 'admin1')
    return <div className="max-w-xl mx-auto card text-center text-gray-600">
      Organisation management is available to senior admins and superadmins.
    </div>

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organisations</h1>
          <p className="text-sm text-gray-500 mt-0.5">{orgs.length} partner organisation{orgs.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />New organisation
        </button>
      </div>

      {msg && <p className="text-sm text-green-700 mb-3">{msg}</p>}
      {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

      {showNew && (
        <div className="card mb-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Organisation name *</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. University of Benin" />
            </div>
            <div>
              <label className="label">Contact email *</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@org.edu" />
            </div>
            <div>
              <label className="label">Contact phone</label>
              <input className="input" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="label">Logo <span className="text-gray-400">(optional)</span></label>
              <input type="file" accept="image/png,image/jpeg" className="input text-sm py-1.5"
                onChange={e => setLogo(e.target.files?.[0] || null)} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={createOrg} disabled={busy} className="btn-primary px-6">
              {busy ? 'Creating…' : 'Create'}
            </button>
            <button onClick={() => setShowNew(false)} className="btn-secondary px-6">Cancel</button>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Organisation</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orgs.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      {o.logo_url
                        ? <img src={o.logo_url} alt="" className="w-8 h-8 rounded object-contain bg-white border border-gray-100" />
                        : <span className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center"><Building2 className="w-4 h-4 text-gray-300" /></span>}
                      <span className="font-medium text-gray-900">{o.name}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    <div>{o.contact_email}</div>
                    {o.contact_phone && <div className="text-xs text-gray-400">{o.contact_phone}</div>}
                  </td>
                  <td className="px-4 py-3">{badge(o.status)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {o.status !== 'approved' && (
                      <button onClick={() => setStatus(o.id, 'approved')} disabled={busy}
                        className="text-green-700 hover:underline text-xs inline-flex items-center gap-1 mr-3">
                        <Check className="w-3 h-3" />Approve
                      </button>
                    )}
                    {o.status !== 'suspended' ? (
                      <button onClick={() => setStatus(o.id, 'suspended')} disabled={busy}
                        className="text-red-600 hover:underline text-xs inline-flex items-center gap-1">
                        <Ban className="w-3 h-3" />Suspend
                      </button>
                    ) : (
                      <button onClick={() => setStatus(o.id, 'approved')} disabled={busy}
                        className="text-[#000066] hover:underline text-xs inline-flex items-center gap-1">
                        <RotateCcw className="w-3 h-3" />Reinstate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!orgs.length && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No organisations yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
