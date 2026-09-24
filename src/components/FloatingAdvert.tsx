'use client'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  imageUrl: string
  href: string
  alt: string
}

// Stable key from the advert content, so editing it re-shows the widget to
// people who dismissed the previous one; an unchanged advert stays dismissed.
function contentKey(p: Props): string {
  const raw = [p.imageUrl, p.href, p.alt].join('|')
  let h = 0
  for (let i = 0; i < raw.length; i++) { h = (h * 31 + raw.charCodeAt(i)) | 0 }
  return 'savan_advert_' + (h >>> 0).toString(36)
}

export default function FloatingAdvert(p: Props) {
  const [show, setShow] = useState(false)
  const key = contentKey(p)

  useEffect(() => {
    let dismissed = false
    try { dismissed = localStorage.getItem(key) === '1' } catch {}
    if (!dismissed) {
      const t = setTimeout(() => setShow(true), 1200)
      return () => clearTimeout(t)
    }
  }, [key])

  function dismiss() {
    setShow(false)
    try { localStorage.setItem(key, '1') } catch {}
  }

  if (!show) return null

  const hasLink = !!p.href
  const inner = (
    <img src={p.imageUrl} alt={p.alt || 'Advertisement'} className="block w-full h-auto" />
  )

  return (
    <div className="fixed bottom-4 right-4 z-[90] w-[220px] sm:w-[260px] max-w-[calc(100vw-2rem)]
      rounded-xl shadow-2xl overflow-hidden bg-white border border-gray-200">
      <button onClick={dismiss} aria-label="Dismiss"
        className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center">
        <X className="w-3.5 h-3.5" />
      </button>
      {hasLink
        ? <a href={p.href} target="_blank" rel="noopener noreferrer">{inner}</a>
        : inner}
    </div>
  )
}
