'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, Download, Trash2 } from 'lucide-react'

export default function MaintenancePage() {
  const [role, setRole]         = useState<string | null>(null)
  const [ready, setReady]       = useState(false)
  const [testEvents, setTestEvents] = useState(0)
  const [testCerts, setTestCerts]   = useState(0)
  const [confirm, setConfirm]   = useState('')
  const [busy, setBusy]         = useState(false)
  const [msg, setMsg]           = useState('')
  const [err, setErr]           = useState('')

  async function loadCounts() {
    const supabase = createClient()
    const { data: ids } = await supabase.from('training_events').select('id').eq('is_test', true)
    const eventIds = (ids ?? []).map((e: any) => e.id)
    setTestEvents(eventIds.length)
    if (eventIds.length) {
      const { count } = await supabase.from('certificates')
        .select('id', { count: 'exact', head: true }).in('event_id', eventIds)
      setTestCerts(count ?? 0)
    } else setTestCerts(0)
  }

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: p } = await supabase.from('profiles').select('role').eq('user_id', user.id).single()
        setRole(p?.role ?? null)
        if (p?.role === 'superadmin') await loadCounts()
      }
      setReady(true)
    })()
  }, [])

  async function handleExport() {
    setErr(''); setMsg('')
    const supabase = createClient()
    const { data: events } = await supabase.from('training_events').select('*').eq('is_test', true)
    const eventIds = (events ?? []).map((e: any) => e.id)
    const { data: certs } = eventIds.length
      ? await supabase.from('certificates').select('*').in('event_id', eventIds)
      : { data: [] }
    const payload = { exported_at: new Date().toISOString(), test_events: events ?? [], certificates: certs ?? [] }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `savan-test-data-${new Date().toISOString().slice(0,10)}.json`
    a.click(); URL.revokeObjectURL(url)
    setMsg('Exported test data to a JSON download.')
  }

  async function handleReset() {
    setErr(''); setMsg(''); setBusy(true)
    const supabase = createClient()
    const { data, error } = await supabase.rpc('reset_test_data', { p_confirm: confirm })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setConfirm('')
    setMsg(`Done — removed ${data.events} test event(s), ${data.certificates} certificate(s), ${data.trainees_removed} trainee(s).`)
    await loadCounts()
  }

  if (!ready) return <div className="text-sm text-gray-400 py-12 text-center">Loading…</div>
  if (role !== 'superadmin')
    return <div className="max-w-xl mx-auto card text-center text-gray-600">
      This page is available to superadmins only.
    </div>

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Maintenance</h1>
      <p className="text-sm text-gray-500 mb-6">Superadmin-only tools.</p>

      <div className="card border border-red-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">Reset test data</h2>
            <p className="text-sm text-gray-600 mt-1">
              Permanently deletes every event marked <strong>“test event”</strong> and the
              certificates and trainees it created. Real (non-test) certificates are never
              touched. This cannot be undone — export first.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{testEvents}</div>
                <div className="text-gray-500">test events</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{testCerts}</div>
                <div className="text-gray-500">test certificates</div>
              </div>
            </div>

            <button onClick={handleExport}
              className="btn-secondary mt-4 flex items-center gap-2">
              <Download className="w-4 h-4" /> Export test data (JSON)
            </button>

            <div className="mt-5 pt-4 border-t border-gray-100">
              <label className="text-sm text-gray-700">
                Type <span className="font-mono font-semibold">RESET</span> to confirm:
              </label>
              <input value={confirm} onChange={e => setConfirm(e.target.value)}
                className="input mt-1" placeholder="RESET" />
              <button onClick={handleReset}
                disabled={busy || confirm !== 'RESET' || testEvents === 0}
                className="mt-3 flex items-center gap-2 px-6 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">
                <Trash2 className="w-4 h-4" />
                {busy ? 'Resetting…' : 'Permanently delete test data'}
              </button>
            </div>

            {msg && <p className="mt-4 text-sm text-green-700">{msg}</p>}
            {err && <p className="mt-4 text-sm text-red-600">{err}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
