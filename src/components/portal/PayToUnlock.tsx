'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'

export default function PayToUnlock({ certificateId, amount }: { certificateId: string; amount: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function pay() {
    setBusy(true); setErr('')
    try {
      const res = await fetch('/api/payments/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certificateId }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        if (data.checkoutUrl) { window.location.href = data.checkoutUrl; return }
        router.refresh()   // unlocked (test mode), free, or already paid
        return
      }
      setErr(data.error || 'Payment could not be started.')
    } catch {
      setErr('Network error — please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="text-right">
      <button onClick={pay} disabled={busy}
        className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-1.5">
        <Lock className="w-3.5 h-3.5" />
        {busy ? 'Please wait…' : `Pay ₦${amount.toLocaleString()} to unlock`}
      </button>
      {err && <p className="text-xs text-red-600 mt-1 max-w-[240px]">{err}</p>}
    </div>
  )
}
