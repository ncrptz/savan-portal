'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

interface Props {
  title: string
  body: string
  imageUrl: string | null
  ctaLabel: string
  ctaHref: string
}

// Short stable hash of the popup content. When the admin edits the popup, the
// key changes, so visitors who dismissed the previous announcement see the new
// one. Dismissal of an unchanged popup persists across visits.
function contentKey(p: Props): string {
  const raw = [p.title, p.body, p.imageUrl, p.ctaLabel, p.ctaHref].join('|')
  let h = 0
  for (let i = 0; i < raw.length; i++) { h = (h * 31 + raw.charCodeAt(i)) | 0 }
  return 'savan_popup_' + (h >>> 0).toString(36)
}

export default function EventsPopup(p: Props) {
  const [open, setOpen] = useState(false)
  const key = contentKey(p)

  useEffect(() => {
    let dismissed = false
    try { dismissed = localStorage.getItem(key) === '1' } catch {}
    if (!dismissed) {
      const t = setTimeout(() => setOpen(true), 700)
      return () => clearTimeout(t)
    }
  }, [key])

  function dismiss() {
    setOpen(false)
    try { localStorage.setItem(key, '1') } catch {}
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={dismiss} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <button onClick={dismiss} aria-label="Close"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-gray-600 shadow">
          <X className="w-4 h-4" />
        </button>
        {p.imageUrl && (
          <img src={p.imageUrl} alt="" className="w-full max-h-56 object-cover" />
        )}
        <div className="p-6">
          <h3 className="text-xl font-bold text-[#000066] mb-2">{p.title}</h3>
          {p.body && <p className="text-sm text-gray-600 whitespace-pre-line mb-5">{p.body}</p>}
          <div className="flex items-center gap-3">
            {p.ctaLabel && p.ctaHref && (
              <Link href={p.ctaHref} onClick={dismiss}
                className="btn-primary px-5 py-2.5 text-sm">
                {p.ctaLabel}
              </Link>
            )}
            <button onClick={dismiss} className="text-sm text-gray-500 hover:text-gray-700">
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
