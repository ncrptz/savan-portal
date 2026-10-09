'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera } from 'lucide-react'

// Add or replace the passport photo on an already-issued certificate.
// Re-renders the PDF in place (same cert ID, QR link and issue date).
export default function CertPhotoButton({
  certId, certLabel, hasPhoto, photoUrl,
}: { certId: string; certLabel: string; hasPhoto: boolean; photoUrl?: string | null }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg]   = useState<{ ok: boolean; text: string } | null>(null)
  const [bust, setBust] = useState(0)

  async function onFile(file: File) {
    setBusy(true); setMsg(null)
    const fd = new FormData()
    fd.append('cert_id', certId)
    fd.append('photo', file)
    try {
      const res  = await fetch('/api/certificates/rerender', { method: 'POST', body: fd })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `Failed (${res.status})`)
      setMsg({ ok: true, text: 'Photo attached' })
      setBust(Date.now())
      router.refresh()
    } catch (e: any) {
      setMsg({ ok: false, text: e.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      {photoUrl && (
        <img src={`${photoUrl}?t=${bust}`} alt="" className="w-6 h-6 rounded object-cover border border-gray-200" />
      )}
      <label className={`inline-flex items-center gap-1 text-xs ${busy ? 'text-gray-400' : 'text-[#000066] hover:underline cursor-pointer'}`}
             title={`Re-issue ${certLabel} with a passport photo (same ID and QR link)`}>
        <Camera className="w-3 h-3" />
        {busy ? 'Rendering…' : hasPhoto ? 'Replace photo' : 'Add photo'}
        <input type="file" accept="image/*" className="hidden" disabled={busy}
          onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onFile(f) }} />
      </label>
      {msg && <span className={`text-xs ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</span>}
    </span>
  )
}
