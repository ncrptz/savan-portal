'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function NewEventPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    title: '', training_date: '', venue: '',
    template_type: 'T1', sponsored_by: '',
    collab_signer_name: '', collab_signer_title: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    session_in_month: 1,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function set(field: string, value: string | number) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const supabase = createClient()

    // Get next event serial
    const { data: serialData } = await supabase.rpc('next_event_serial')

    const { data, error: err } = await supabase
      .from('training_events')
      .insert({
        ...form,
        event_serial: serialData,
        participant_count: 0,
        status: 'draft',
      })
      .select('id')
      .single()

    if (err) { setError(err.message); setSaving(false); return }
    router.push(`/admin/events/${data.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/events" className="text-sm text-gray-500 hover:text-gray-700">← Events</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">New Training Event</h1>
      </div>

      <form onSubmit={handleSave} className="card space-y-5">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        <div>
          <label className="label">Event Title *</label>
          <input className="input" value={form.title} onChange={e=>set('title',e.target.value)} required
            placeholder="e.g. BLS/AED Training — University of Benin, June 2026" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Training Date *</label>
            <input type="date" className="input" value={form.training_date}
              onChange={e=>set('training_date',e.target.value)} required />
          </div>
          <div>
            <label className="label">Venue</label>
            <input className="input" value={form.venue} onChange={e=>set('venue',e.target.value)}
              placeholder="e.g. UBTH Conference Hall" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Year</label>
            <input type="number" className="input" value={form.year} onChange={e=>set('year',+e.target.value)} />
          </div>
          <div>
            <label className="label">Month</label>
            <input type="number" className="input" value={form.month}
              onChange={e=>set('month',+e.target.value)} min={1} max={12} />
          </div>
          <div>
            <label className="label">Session # this month</label>
            <input type="number" className="input" value={form.session_in_month}
              onChange={e=>set('session_in_month',+e.target.value)} min={1} max={9} />
          </div>
        </div>

        <div>
          <label className="label">Certificate Template *</label>
          <select className="input" value={form.template_type} onChange={e=>set('template_type',e.target.value)}>
            <option value="T1">T1 — SAVAN only (single signatory)</option>
            <option value="T2">T2 — With collaborating organisation (two signatories)</option>
          </select>
        </div>

        {form.template_type === 'T1' && (
          <div>
            <label className="label">Sponsored by <span className="text-gray-400">(optional)</span></label>
            <input className="input" value={form.sponsored_by}
              onChange={e=>set('sponsored_by',e.target.value)}
              placeholder="e.g. Okomu Oil Palm Company Plc" />
            <p className="text-xs text-gray-400 mt-1">
              Appears as italic text at the bottom of each certificate.
            </p>
          </div>
        )}

        {form.template_type === 'T2' && (
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-[#000066]">Collaborating Organisation Signatory</p>
            <div>
              <label className="label">Signatory Full Name</label>
              <input className="input bg-white" value={form.collab_signer_name}
                onChange={e=>set('collab_signer_name',e.target.value)}
                placeholder="Prof. Raphael Eze Uwechue" />
            </div>
            <div>
              <label className="label">Signatory Designation</label>
              <input className="input bg-white" value={form.collab_signer_title}
                onChange={e=>set('collab_signer_title',e.target.value)}
                placeholder="Vice-Chancellor, University of Benin" />
            </div>
            <p className="text-xs text-gray-500">
              You can upload the organisation logo and signatory signature image when generating certificates.
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary px-8">
            {saving ? 'Creating…' : 'Create Event'}
          </button>
          <Link href="/admin/events" className="btn-secondary px-8">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
