'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'

const KEY = 'savan_pending_claim'

export default function PendingClaim() {
  const router = useRouter()
  const [claimed, setClaimed] = useState(false)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem(KEY) : null
    if (!token) return
    (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return                       // not signed in yet; try again next load
      const { error } = await supabase.rpc('claim_registration', { p_claim_token: token })
      localStorage.removeItem(KEY)            // single attempt regardless of outcome
      if (!error) { setClaimed(true); router.refresh() }
    })()
  }, [])

  if (!claimed) return null
  return (
    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
      <p className="text-green-800 text-sm">Your certificate has been linked to your account.</p>
    </div>
  )
}
