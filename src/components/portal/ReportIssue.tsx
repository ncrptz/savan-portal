'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MessageSquarePlus, X, CheckCircle } from 'lucide-react'

interface Props {
  userName?: string
  label?: string
  category?: string
  certificateId?: string | null
  certRef?: string | null
  defaultSubject?: string
  variant?: 'button' | 'link'
}

export default function ReportIssue({
  userName, label = 'Contact admin', category = 'general',
  certificateId = null, certRef = null, defaultSubject = '', variant = 'link',
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState(defaultSubject)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)

  async function submit() {
    if (!subject.trim() || !message.trim()) { setErr('Please add a subject and a message.'); return }
    setBusy(true); setErr('')
    const s = createClient()
    const { data: { user } } = await s.auth.getUser()
    if (!user) { setErr('Your session expired — please sign in again.'); setBusy(false); return }
    const { error } = await s.from('support_tickets').insert({
      user_id: user.id, user_name: userName || null, category,
      certificate_id: certificateId, cert_ref: certRef,
      subject: subject.trim(), message: message.trim(), status: 'open',
    })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setDone(true); router.refresh()
  }

  const trigger = variant === 'button'
    ? <button onClick={() => setOpen(true)} className="btn-secondary text-sm inline-flex items-center gap-1.5">
        <MessageSquarePlus className="w-4 h-4" />{label}
      </button>
    : <button onClick={() => setOpen(true)} className="text-sm text-[#000066] hover:underline inline-flex items-center gap-1">
        <MessageSquarePlus className="w-3.5 h-3.5" />{label}
      </button>

  return (
    <>
      {trigger}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !busy && setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <button onClick={() => !busy && setOpen(false)} aria-label="Close"
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>

            {done ? (
              <div className="text-center py-4">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h3 className="font-bold text-gray-900 mb-1">Message sent</h3>
                <p className="text-sm text-gray-600 mb-4">An admin will review your request and respond. You&apos;ll see the reply here under &quot;My requests&quot;.</p>
                <button onClick={() => setOpen(false)} className="btn-primary px-6">Done</button>
              </div>
            ) : (
              <>
                <h3 className="font-bold text-lg text-[#000066] mb-1">Contact admin</h3>
                <p className="text-xs text-gray-500 mb-4">{certRef ? `Regarding certificate ${certRef}.` : 'Describe your issue and an admin will get back to you.'}</p>
                <div className="space-y-3">
                  <div>
                    <label className="label">Subject</label>
                    <input className="input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Short summary" />
                  </div>
                  <div>
                    <label className="label">Message</label>
                    <textarea className="input" rows={4} value={message} onChange={e => setMessage(e.target.value)} placeholder="Tell us what's wrong…" />
                  </div>
                  {err && <p className="text-sm text-red-600">{err}</p>}
                  <div className="flex gap-3 pt-1">
                    <button onClick={submit} disabled={busy} className="btn-primary px-6">{busy ? 'Sending…' : 'Send'}</button>
                    <button onClick={() => setOpen(false)} disabled={busy} className="btn-secondary px-6">Cancel</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
