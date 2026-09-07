'use client'
import { useState, useCallback, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Upload, User, Camera, PenLine, Building2,
  FileText, ChevronDown, ChevronUp, AlertCircle,
  CheckCircle, Download, Plus, Trash2, Eye
} from 'lucide-react'

type TemplateType = 'T1' | 'T2'

interface ParticipantRow {
  id: string
  name: string
  date: string
  photo?: File
  photoPreview?: string
}

interface IssuedCert {
  cert_id: string
  name: string
  pdf_url: string
  error?: string
}

function uid() { return Math.random().toString(36).slice(2) }
function pad(n: number, len = 3) { return String(n).padStart(len, '0') }
function buildCertId(year: number, month: number, session: number, seq: number) {
  return `SAVAN/BLSAED/${year}/${pad(month, 2)}${session}/${pad(seq)}`
}

async function parseBulkFile(file: File): Promise<ParticipantRow[]> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'txt') {
    const text = await file.text()
    return text.split('\n').filter(l => l.trim())
      .map(name => ({ id: uid(), name: name.trim(), date: '' }))
  }
  if (ext === 'csv') {
    const Papa = (await import('papaparse')).default
    const text = await file.text()
    const result = Papa.parse(text, { header: true, skipEmptyLines: true })
    return (result.data as Record<string, string>[]).map(row => ({
      id: uid(), name: row.name || row.Name || '', date: row.date || row.Date || '',
    })).filter(r => r.name)
  }
  if (ext === 'xlsx' || ext === 'xls') {
    const XLSX = await import('xlsx')
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws)
    return rows.map(row => ({
      id: uid(), name: String(row.name || row.Name || ''), date: String(row.date || row.Date || ''),
    })).filter(r => r.name)
  }
  if (ext === 'xml') {
    const text = await file.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(text, 'application/xml')
    const nodes = Array.from(doc.querySelectorAll('participant'))
    return nodes.map(n => ({
      id: uid(),
      name: n.querySelector('name')?.textContent?.trim() || '',
      date: n.querySelector('date')?.textContent?.trim() || '',
    })).filter(r => r.name)
  }
  return []
}

export default function GeneratePage() {
  const { id: eventId } = useParams<{ id: string }>()

  const [templateType, setTemplateType] = useState<TemplateType>('T1')
  const [year, setYear]       = useState(new Date().getFullYear())
  const [month, setMonth]     = useState(new Date().getMonth() + 1)
  const [session, setSession] = useState(1)
  const [startSeq, setStartSeq] = useState(1)
  const [batchDate, setBatchDate] = useState(() => new Date().toISOString().split('T')[0])
  const [sponsoredBy, setSponsoredBy] = useState('')
  const [collabLogo, setCollabLogo]   = useState<File | null>(null)
  const [collabLogoPreview, setCollabLogoPreview] = useState('')
  const [collabSignerName, setCollabSignerName]   = useState('')
  const [collabSignerTitle, setCollabSignerTitle] = useState('')
  const [collabSigImage, setCollabSigImage]       = useState<File | null>(null)
  const [collabSigPreview, setCollabSigPreview]   = useState('')
  const [savedLogo, setSavedLogo] = useState(false)
  const [savedSig, setSavedSig]   = useState(false)
  const [participants, setParticipants] = useState<ParticipantRow[]>([
    { id: uid(), name: '', date: '' }
  ])
  const [showBulkPanel, setShowBulkPanel] = useState(false)
  const [bulkLoading, setBulkLoading]     = useState(false)
  const [generating, setGenerating]       = useState(false)
  const [results, setResults]             = useState<IssuedCert[]>([])
  const [error, setError]                 = useState('')

  // Load the event this generate screen belongs to, so the template and
  // collaborator details are pre-filled (and the T2 fields actually appear).
  useEffect(() => {
    if (!eventId) return
    const supabase = createClient()
    supabase
      .from('training_events')
      .select('template_type, year, month, session_in_month, training_date, sponsored_by, collab_signer_name, collab_signer_title, collab_logo_url, collab_sig_url')
      .eq('id', eventId)
      .single()
      .then(({ data }) => {
        if (!data) return
        setTemplateType((data.template_type as TemplateType) || 'T1')
        if (data.year)             setYear(data.year)
        if (data.month)            setMonth(data.month)
        if (data.session_in_month) setSession(data.session_in_month)
        if (data.training_date)    setBatchDate(String(data.training_date).split('T')[0])
        setSponsoredBy(data.sponsored_by || '')
        setCollabSignerName(data.collab_signer_name || '')
        setCollabSignerTitle(data.collab_signer_title || '')
        if (data.collab_logo_url) { setCollabLogoPreview(data.collab_logo_url); setSavedLogo(true) }
        if (data.collab_sig_url)  { setCollabSigPreview(data.collab_sig_url);   setSavedSig(true) }
      })
  }, [eventId])

  const previewId = buildCertId(year, month, session, startSeq)

  function addRow() {
    setParticipants(p => [...p, { id: uid(), name: '', date: '' }])
  }
  function removeRow(id: string) {
    setParticipants(p => p.filter(r => r.id !== id))
  }
  function updateRow(id: string, field: keyof ParticipantRow, value: any) {
    setParticipants(p => p.map(r => {
      if (r.id !== id) return r
      if (field === 'photo' && value instanceof File) {
        return { ...r, photo: value, photoPreview: URL.createObjectURL(value) }
      }
      return { ...r, [field]: value }
    }))
  }

  async function handleBulkFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBulkLoading(true)
    try {
      const rows = await parseBulkFile(file)
      setParticipants(rows.map(r => ({ ...r, date: r.date || batchDate })))
      setShowBulkPanel(false)
    } catch {
      setError('Could not parse file. Please check the format.')
    } finally {
      setBulkLoading(false)
    }
    e.target.value = ''
  }

  async function handleGenerate() {
    const valid = participants.filter(p => p.name.trim())
    if (!valid.length) { setError('Add at least one participant name.'); return }
    setGenerating(true); setError(''); setResults([])

    try {
      const form = new FormData()
      form.append('event_id',     eventId)
      form.append('template_type',templateType)
      form.append('year',         String(year))
      form.append('month',        String(month))
      form.append('session',      String(session))
      form.append('start_seq',    String(startSeq))
      form.append('sponsored_by', sponsoredBy)
      form.append('collab_signer_name',  collabSignerName)
      form.append('collab_signer_title', collabSignerTitle)
      if (collabLogo)    form.append('collab_logo', collabLogo)
      if (collabSigImage) form.append('collab_sig', collabSigImage)
      form.append('participants', JSON.stringify(
        valid.map(p => ({ name: p.name.trim(), date: p.date || batchDate }))
      ))
      valid.forEach((p, i) => {
        if (p.photo) form.append(`photo_${i}`, p.photo)
      })

      const res  = await fetch('/api/generate', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setResults(data.certificates)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const validCount = participants.filter(p => p.name.trim()).length

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/admin/events/${eventId}`} className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to event
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Generate Certificates</h1>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Batch Settings */}
      <Section title="Batch Settings" icon={<FileText className="w-5 h-5" />}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Template</label>
            <select value={templateType} onChange={e => setTemplateType(e.target.value as TemplateType)} className="input">
              <option value="T1">T1 — SAVAN only</option>
              <option value="T2">T2 — With collaborator</option>
            </select>
          </div>
          <div>
            <label className="label">Year</label>
            <input type="number" value={year} onChange={e => setYear(+e.target.value)} className="input" min={2020} max={2099} />
          </div>
          <div>
            <label className="label">Month (1–12)</label>
            <input type="number" value={month} onChange={e => setMonth(+e.target.value)} className="input" min={1} max={12} />
          </div>
          <div>
            <label className="label">Session # this month</label>
            <input type="number" value={session} onChange={e => setSession(+e.target.value)} className="input" min={1} max={9} />
          </div>
          <div>
            <label className="label">Start serial</label>
            <input type="number" value={startSeq} onChange={e => setStartSeq(+e.target.value)} className="input" min={1} />
          </div>
          <div>
            <label className="label">Default issue date</label>
            <input type="date" value={batchDate} onChange={e => setBatchDate(e.target.value)} className="input" />
          </div>
          <div className="col-span-2">
            <label className="label">Cert ID preview</label>
            <div className="input bg-gray-50 font-mono text-xs text-blue-800">{previewId}</div>
          </div>
        </div>
      </Section>

      {/* T1 Sponsor */}
      {templateType === 'T1' && (
        <Section title="Sponsor (optional)" icon={<Building2 className="w-5 h-5" />}>
          <div>
            <label className="label">Sponsored by / Promoted by</label>
            <input type="text" value={sponsoredBy} onChange={e => setSponsoredBy(e.target.value)}
              className="input" placeholder="e.g. Okomu Oil Palm Company Plc" />
            <p className="text-xs text-gray-400 mt-1">Leave blank to omit.</p>
          </div>
        </Section>
      )}

      {/* T2 Collaborator */}
      {templateType === 'T2' && (
        <Section title="Collaborating Organisation" icon={<Building2 className="w-5 h-5" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Collaborator logo <span className="text-gray-400">(PNG)</span></label>
              <input type="file" accept="image/png,image/jpeg" onChange={e => {
                const f = e.target.files?.[0]
                if (f) { setCollabLogo(f); setCollabLogoPreview(URL.createObjectURL(f)) }
              }} className="input text-sm py-1.5" />
              {collabLogoPreview && <img src={collabLogoPreview} alt="" className="mt-2 h-16 object-contain" />}
              {savedLogo && !collabLogo && <p className="text-xs text-green-700 mt-1">Saved logo will be used — choose a file only to replace it.</p>}
            </div>
            <div>
              <label className="label">Collaborator signature <span className="text-gray-400">(optional PNG)</span></label>
              <input type="file" accept="image/png,image/jpeg" onChange={e => {
                const f = e.target.files?.[0]
                if (f) { setCollabSigImage(f); setCollabSigPreview(URL.createObjectURL(f)) }
              }} className="input text-sm py-1.5" />
              {collabSigPreview && <img src={collabSigPreview} alt="" className="mt-2 h-12 object-contain" />}
              {savedSig && !collabSigImage && <p className="text-xs text-green-700 mt-1">Saved signature will be used — choose a file only to replace it.</p>}
            </div>
            <div>
              <label className="label">Signatory name</label>
              <input type="text" value={collabSignerName} onChange={e => setCollabSignerName(e.target.value)}
                className="input" placeholder="Prof. Raphael Eze Uwechue" />
            </div>
            <div>
              <label className="label">Signatory designation</label>
              <input type="text" value={collabSignerTitle} onChange={e => setCollabSignerTitle(e.target.value)}
                className="input" placeholder="Vice-Chancellor, University of Benin" />
            </div>
          </div>
        </Section>
      )}

      {/* Participants */}
      <Section
        title={`Participants (${validCount})`}
        icon={<User className="w-5 h-5" />}
        action={
          <button onClick={() => setShowBulkPanel(!showBulkPanel)}
            className="flex items-center gap-1.5 text-sm text-blue-700 hover:underline">
            <Upload className="w-4 h-4" />Bulk upload
            {showBulkPanel ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
          </button>
        }
      >
        {showBulkPanel && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-3">Bulk Upload Participants</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Upload file</label>
                <input type="file" accept=".csv,.xlsx,.xls,.xml,.docx,.txt"
                  onChange={handleBulkFile} className="input text-sm py-1.5 bg-white"
                  disabled={bulkLoading} />
                {bulkLoading && <p className="text-xs text-blue-600 mt-1">Parsing…</p>}
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <p className="font-medium">Supported formats:</p>
                <p>• CSV — columns: name, date</p>
                <p>• Excel (.xlsx) — same columns</p>
                <p>• XML — &lt;participant&gt;&lt;name&gt;…&lt;/name&gt;&lt;/participant&gt;</p>
                <p>• Word (.docx) — one name per paragraph</p>
                <p>• Text (.txt) — one name per line</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="hidden md:grid grid-cols-12 gap-2 px-1 text-xs font-medium text-gray-500">
            <div className="col-span-5">Full Name *</div>
            <div className="col-span-3">Issue Date</div>
            <div className="col-span-3">Passport Photo</div>
            <div className="col-span-1"></div>
          </div>

          {participants.map((p, idx) => (
            <div key={p.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-12 md:col-span-5">
                <input type="text" value={p.name}
                  onChange={e => updateRow(p.id, 'name', e.target.value)}
                  className="input" placeholder={`Participant ${idx + 1} full name`} />
              </div>
              <div className="col-span-6 md:col-span-3">
                <input type="date" value={p.date || batchDate}
                  onChange={e => updateRow(p.id, 'date', e.target.value)}
                  className="input text-sm" />
              </div>
              <div className="col-span-5 md:col-span-3">
                <label className="cursor-pointer flex items-center gap-1.5 border border-dashed border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors">
                  {p.photoPreview
                    ? <img src={p.photoPreview} alt="" className="w-6 h-6 object-cover rounded" />
                    : <Camera className="w-4 h-4" />}
                  {p.photoPreview ? 'Change' : 'Photo'}
                  <input type="file" accept="image/*" className="sr-only"
                    onChange={e => { const f = e.target.files?.[0]; if (f) updateRow(p.id, 'photo', f) }} />
                </label>
              </div>
              <div className="col-span-1 flex justify-center">
                {participants.length > 1 && (
                  <button onClick={() => removeRow(p.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="col-span-12 -mt-1 pl-1">
                <span className="text-xs font-mono text-gray-400">
                  → {buildCertId(year, month, session, startSeq + idx)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <button onClick={addRow} className="mt-4 flex items-center gap-2 text-sm text-blue-700 hover:underline">
          <Plus className="w-4 h-4" />Add participant
        </button>
      </Section>

      {/* Generate button */}
      <div className="flex gap-4">
        <button onClick={handleGenerate} disabled={generating}
          className="btn-primary px-8 py-3 text-base flex items-center gap-2">
          {generating
            ? <><span className="animate-spin inline-block">⟳</span> Generating…</>
            : <><PenLine className="w-5 h-5" />Generate {validCount} Certificate{validCount !== 1 ? 's' : ''}</>}
        </button>
        <Link href={`/admin/events/${eventId}`} className="btn-secondary px-8 py-3 text-base">
          Cancel
        </Link>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <Section
          title={`${results.length} Certificate${results.length !== 1 ? 's' : ''} Generated`}
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
        >
          <div className="space-y-2">
            {results.map(r => (
              <div key={r.cert_id || r.name}
                className={`flex items-center justify-between p-3 rounded-lg ${r.error ? 'bg-red-50' : 'bg-green-50'}`}>
                <div>
                  <div className="font-medium text-sm text-gray-900">{r.name}</div>
                  {r.cert_id
                    ? <div className="text-xs font-mono text-gray-500">{r.cert_id}</div>
                    : <div className="text-xs text-red-600">{r.error}</div>}
                </div>
                {r.cert_id && (
                  <div className="flex gap-2">
                    <a href={`/verify?q=${r.cert_id}`} target="_blank"
                      className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors" title="Verify">
                      <Eye className="w-4 h-4" />
                    </a>
                    {r.pdf_url && (
                      <a href={r.pdf_url} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors" title="Download PDF">
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function Section({ title, icon, children, action }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-blue-800">
          {icon}
          <h2 className="font-semibold text-gray-900">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
