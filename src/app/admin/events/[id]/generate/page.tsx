'use client'
import { useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Upload, User, Camera, PenLine, Building2,
  FileText, ChevronDown, ChevronUp, AlertCircle,
  CheckCircle, Download, Plus, Trash2, Eye
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
type TemplateType = 'T1' | 'T2'

interface ParticipantRow {
  id: string
  name: string
  date: string
  photo?: File
  photoPreview?: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2) }
function pad(n: number, len = 3) { return String(n).padStart(len, '0') }

function buildCertId(year: number, month: number, session: number, seq: number) {
  return `SAVAN/BLSAED/${year}/${pad(month, 2)}${session}/${pad(seq)}`
}

// ── Bulk upload parsers ───────────────────────────────────────────────────────
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
      id: uid(),
      name: row.name || row.Name || '',
      date: row.date || row.Date || '',
    })).filter(r => r.name)
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const XLSX = await import('xlsx')
    const buf  = await file.arrayBuffer()
    const wb   = XLSX.read(buf)
    const ws   = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws)
    return rows.map(row => ({
      id: uid(),
      name: String(row.name || row.Name || ''),
      date: String(row.date || row.Date || ''),
    })).filter(r => r.name)
  }

  if (ext === 'xml') {
    const text    = await file.text()
    const parser  = new DOMParser()
    const doc     = parser.parseFromString(text, 'application/xml')
    const nodes   = Array.from(doc.querySelectorAll('participant'))
    return nodes.map(n => ({
      id:   uid(),
      name: n.querySelector('name')?.textContent?.trim() || '',
      date: n.querySelector('date')?.textContent?.trim() || '',
    })).filter(r => r.name)
  }

  if (ext === 'docx') {
    // Basic: extract plain text paragraphs
    const mammoth = (await import('mammoth' as any))
    const buf  = await file.arrayBuffer()
    const { value } = await mammoth.extractRawText({ arrayBuffer: buf })
    return value.split('\n').filter((l: string) => l.trim())
      .map((name: string) => ({ id: uid(), name: name.trim(), date: '' }))
  }

  return []
}

// ─────────────────────────────────────────────────────────────────────────────
export default function GeneratePage() {
  const { id: eventId } = useParams<{ id: string }>()

  // ── Event / batch settings ──────────────────────────────────────────────────
  const [templateType, setTemplateType] = useState<TemplateType>('T1')
  const [year,       setYear]       = useState(new Date().getFullYear())
  const [month,      setMonth]      = useState(new Date().getMonth() + 1)
  const [session,    setSession]    = useState(1)
  const [startSeq,   setStartSeq]   = useState(1)
  const [batchDate,  setBatchDate]  = useState(() => new Date().toISOString().split('T')[0])

  // ── T1 optional ─────────────────────────────────────────────────────────────
  const [sponsoredBy, setSponsoredBy] = useState('')

  // ── T2 fields ───────────────────────────────────────────────────────────────
  const [collabLogo,       setCollabLogo]       = useState<File | null>(null)
  const [collabLogoPreview,setCollabLogoPreview] = useState('')
  const [collabSignerName, setCollabSignerName] = useState('')
  const [collabSignerTitle,setCollabSignerTitle] = useState('')
  const [collabSigImage,   setCollabSigImage]   = useState<File | null>(null)
  const [collabSigPreview, setCollabSigPreview] = useState('')

  // ── Participants ─────────────────────────────────────────────────────────────
  const [participants, setParticipants] = useState<ParticipantRow[]>([
    { id: uid(), name: '', date: '' }
  ])

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [showBulkPanel,  setShowBulkPanel]  = useState(false)
  const [bulkLoading,    setBulkLoading]    = useState(false)
  const [generating,     setGenerating]     = useState(false)
  const [results,        setResults]        = useState<{ cert_id: string; name: string; pdf_url: string }[]>([])
  const [error,          setError]          = useState('')

  // ── Cert ID preview ──────────────────────────────────────────────────────────
  const previewId = buildCertId(year, month, session, startSeq)

  // ── Participant CRUD ─────────────────────────────────────────────────────────
  function addRow() {
    setParticipants(p => [...p, { id: uid(), name: '', date: '' }])
  }

  function removeRow(id: string) {
    setParticipants(p => p.filter(r => r.id !== id))
  }

  function updateRow(id: string, field: keyof ParticipantRow, value: string | File) {
    setParticipants(p => p.map(r => {
      if (r.id !== id) return r
      if (field === 'photo' && value instanceof File) {
        return { ...r, photo: value, photoPreview: URL.createObjectURL(value) }
      }
      return { ...r, [field]: value }
    }))
  }

  // ── Bulk upload ───────────────────────────────────────────────────────────────
  async function handleBulkFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBulkLoading(true)
    try {
      const rows = await parseBulkFile(file)
      setParticipants(rows.map(r => ({
        ...r,
        date: r.date || batchDate,
      })))
      setShowBulkPanel(false)
    } catch (err) {
      setError('Could not parse file. Please check the format.')
    } finally {
      setBulkLoading(false)
    }
    e.target.value = ''
  }

  // ── File handlers ──────────────────────────────────────────────────────────────
  function handleCollabLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) { setCollabLogo(f); setCollabLogoPreview(URL.createObjectURL(f)) }
  }

  function handleCollabSig(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) { setCollabSigImage(f); setCollabSigPreview(URL.createObjectURL(f)) }
  }

  // ── Generate ───────────────────────────────────────────────────────────────────
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
      if (collabLogo)     form.append('collab_logo',    collabLogo)
      if (collabSigImage) form.append('collab_sig',     collabSigImage)

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

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
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

      {/* ── SECTION 1: Batch Settings ──────────────────────────────────────── */}
      <Section title="Batch Settings" icon={<FileText className="w-5 h-5" />}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Template</label>
            <select value={templateType} onChange={e => setTemplateType(e.target.value as TemplateType)}
              className="input">
              <option value="T1">T1 — SAVAN only</option>
              <option value="T2">T2 — With collaborator</option>
            </select>
          </div>
          <div>
            <label className="label">Year</label>
            <input type="number" value={year} onChange={e => setYear(+e.target.value)}
              className="input" min={2020} max={2099} />
          </div>
          <div>
            <label className="label">Month (1–12)</label>
            <input type="number" value={month} onChange={e => setMonth(+e.target.value)}
              className="input" min={1} max={12} />
          </div>
          <div>
            <label className="label">Session # this month</label>
            <input type="number" value={session} onChange={e => setSession(+e.target.value)}
              className="input" min={1} max={9} />
          </div>
          <div>
            <label className="label">Start serial (NNN)</label>
            <input type="number" value={startSeq} onChange={e => setStartSeq(+e.target.value)}
              className="input" min={1} />
          </div>
          <div>
            <label className="label">Default issue date</label>
            <input type="date" value={batchDate} onChange={e => setBatchDate(e.target.value)}
              className="input" />
          </div>
          <div className="col-span-2">
            <label className="label">Cert ID preview</label>
            <div className="input bg-gray-50 font-mono text-xs text-[#000066] flex items-center">
              {previewId}
            </div>
          </div>
        </div>
      </Section>

      {/* ── SECTION 2: T1 Sponsor ──────────────────────────────────────────── */}
      {templateType === 'T1' && (
        <Section title="Sponsor (optional)" icon={<Building2 className="w-5 h-5" />}>
          <div>
            <label className="label">Sponsored by / Promoted by</label>
            <input type="text" value={sponsoredBy} onChange={e => setSponsoredBy(e.target.value)}
              className="input" placeholder="e.g. Okomu Oil Palm Company Plc" />
            <p className="text-xs text-gray-400 mt-1">
              Appears as italic line at the bottom of the certificate. Leave blank to omit.
            </p>
          </div>
        </Section>
      )}

      {/* ── SECTION 3: T2 Collaborator ────────────────────────────────────── */}
      {templateType === 'T2' && (
        <Section title="Collaborating Organisation" icon={<Building2 className="w-5 h-5" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Collaborator logo <span className="text-gray-400">(PNG, transparent bg)</span></label>
              <input type="file" accept="image/png,image/jpeg" onChange={handleCollabLogo}
                className="input text-sm py-1.5" />
              {collabLogoPreview && (
                <img src={collabLogoPreview} alt="Collab logo" className="mt-2 h-16 object-contain" />
              )}
            </div>
            <div>
              <label className="label">Collaborator signatory signature <span className="text-gray-400">(optional PNG)</span></label>
              <input type="file" accept="image/png,image/jpeg" onChange={handleCollabSig}
                className="input text-sm py-1.5" />
              {collabSigPreview && (
                <img src={collabSigPreview} alt="Sig" className="mt-2 h-12 object-contain" />
              )}
            </div>
            <div>
              <label className="label">Signatory name</label>
              <input type="text" value={collabSignerName}
                onChange={e => setCollabSignerName(e.target.value)}
                className="input" placeholder="Prof. Raphael Eze Uwechue" />
            </div>
            <div>
              <label className="label">Signatory designation</label>
              <input type="text" value={collabSignerTitle}
                onChange={e => setCollabSignerTitle(e.target.value)}
                className="input" placeholder="Vice-Chancellor, University of Benin" />
            </div>
          </div>
        </Section>
      )}

      {/* ── SECTION 4: Participants ────────────────────────────────────────── */}
      <Section
        title={`Participants (${participants.filter(p=>p.name.trim()).length})`}
        icon={<User className="w-5 h-5" />}
        action={
          <button onClick={() => setShowBulkPanel(!showBulkPanel)}
            className="flex items-center gap-1.5 text-sm text-[#000066] hover:underline">
            <Upload className="w-4 h-4" />
            Bulk upload
            {showBulkPanel ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
          </button>
        }
      >
        {/* Bulk upload panel */}
        {showBulkPanel && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-[#000066] mb-3">Bulk Upload Participants</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Upload file</label>
                <input type="file"
                  accept=".csv,.xlsx,.xls,.xml,.docx,.txt"
                  onChange={handleBulkFile}
                  className="input text-sm py-1.5 bg-white"
                  disabled={bulkLoading} />
                {bulkLoading && <p className="text-xs text-blue-600 mt-1">Parsing…</p>}
              </div>
              <div className="text-xs text-gray-600 space-y-1">
                <p className="font-medium">Supported formats:</p>
                <p>• <strong>CSV</strong> — columns: name, date, photo</p>
                <p>• <strong>Excel (.xlsx)</strong> — same columns</p>
                <p>• <strong>XML</strong> — &lt;participant&gt;&lt;name&gt;…&lt;/name&gt;&lt;/participant&gt;</p>
                <p>• <strong>Word (.docx)</strong> — one name per paragraph</p>
                <p>• <strong>Text (.txt)</strong> — one name per line</p>
              </div>
            </div>
          </div>
        )}

        {/* Participant rows */}
        <div className="space-y-3">
          {/* Column headers */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-1 text-xs font-medium text-gray-500">
            <div className="col-span-5">Full Name *</div>
            <div className="col-span-3">Issue Date</div>
            <div className="col-span-3">Passport Photo</div>
            <div className="col-span-1"></div>
          </div>

          {participants.map((p, idx) => (
            <div key={p.id} className="grid grid-cols-12 gap-2 items-center">
              {/* Name */}
              <div className="col-span-12 md:col-span-5">
                <input
                  type="text"
                  value={p.name}
                  onChange={e => updateRow(p.id, 'name', e.target.value)}
                  className="input"
                  placeholder={`Participant ${idx + 1} full name`}
                />
              </div>
              {/* Date */}
              <div className="col-span-6 md:col-span-3">
                <input
                  type="date"
                  value={p.date || batchDate}
                  onChange={e => updateRow(p.id, 'date', e.target.value)}
                  className="input text-sm"
                />
              </div>
              {/* Photo */}
              <div className="col-span-5 md:col-span-3 flex items-center gap-2">
                <label className="cursor-pointer flex items-center gap-1.5 border border-dashed border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-500 hover:border-[#000066] hover:text-[#000066] transition-colors flex-1">
                  {p.photoPreview ? (
                    <img src={p.photoPreview} alt="" className="w-6 h-6 object-cover rounded" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                  {p.photoPreview ? 'Change' : 'Photo'}
                  <input type="file" accept="image/*" className="sr-only"
                    onChange={e => { const f=e.target.files?.[0]; if(f) updateRow(p.id,'photo',f) }} />
                </label>
              </div>
              {/* Remove */}
              <div className="col-span-1 flex justify-center">
                {participants.length > 1 && (
                  <button onClick={() => removeRow(p.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Cert ID preview for this row */}
              <div className="col-span-12 -mt-1 pl-1">
                <span className="text-xs font-mono text-gray-400">
                  → {buildCertId(year, month, session, startSeq + idx)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <button onClick={addRow}
          className="mt-4 flex items-center gap-2 text-sm text-[#000066] hover:underline">
          <Plus className="w-4 h-4" />Add participant
        </button>
      </Section>

      {/* ── GENERATE BUTTON ────────────────────────────────────────────────── */}
      <div className="flex gap-4">
        <button onClick={handleGenerate} disabled={generating}
          className="btn-primary px-8 py-3 text-base flex items-center gap-2">
          {generating
            ? <><span className="animate-spin">⟳</span> Generating…</>
            : <><PenLine className="w-5 h-5" />Generate {participants.filter(p=>p.name.trim()).length} Certificate{participants.filter(p=>p.name.trim()).length!==1?'s':''}</>
          }
        </button>
        <Link href={`/admin/events/${eventId}`} className="btn-secondary px-8 py-3 text-base">
          Cancel
        </Link>
      </div>

      {/* ── RESULTS ────────────────────────────────────────────────────────── */}
      {results.length > 0 && (
        <Section title={`${results.length} Certificate${results.length!==1?'s':''} Generated`}
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}>
          <div className="space-y-2">
            {results.map(r => (
              <div key={r.cert_id}
                className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <div className="font-medium text-sm text-gray-900">{r.name}</div>
                  <div className="text-xs font-mono text-gray-500">{r.cert_id}</div>
                </div>
                <div className="flex gap-2">
                  <a href={`/verify?q=${r.cert_id}`} target="_blank"
                    className="p-1.5 text-gray-400 hover:text-[#000066] transition-colors" title="Verify">
                    <Eye className="w-4 h-4" />
                  </a>
                  {r.pdf_url && (
                    <a href={r.pdf_url} target="_blank"
                      className="p-1.5 text-gray-400 hover:text-[#000066] transition-colors" title="Download PDF">
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-3">
            <Link href="/api/generate/batch-pdf" className="btn-secondary flex items-center gap-2">
              <Download className="w-4 h-4" />Download All (PDF)
            </Link>
            <Link href="/api/generate/manifest" className="btn-secondary flex items-center gap-2">
              <FileText className="w-4 h-4" />Download Manifest (CSV)
            </Link>
          </div>
        </Section>
      )}
    </div>
  )
}

// ── Section component ──────────────────────────────────────────────────────────
function Section({
  title, icon, children, action
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-[#000066]">
          {icon}
          <h2 className="font-semibold text-gray-900">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
