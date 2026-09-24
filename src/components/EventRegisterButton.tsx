'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check, Loader2 } from 'lucide-react'

interface Props {
  eventId: string
  loggedIn: boolean
  registrationOpen: boolean
  alreadyRegistered: boolean
}

export default function EventRegisterButton({ eventId, loggedIn, registrationOpen, alreadyRegistered }: Props) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'busy' | 'done'>(alreadyRegistered ? 'done' : 'idle')
  const [err, setErr] = useState('')

  if (!loggedIn) {
    return (
      <Link href="/auth/login?redirect=/events"
        className="btn-primary px-5 py-2.5 text-sm whitespace-nowrap text-center">
        Sign in to register
      </Link>
    )
  }

  if (state === 'done') {
    return (
      <div className="text-right whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5 text-green-700 font-medium text-sm">
          <Check className="w-4 h-4" />Registered
        </span>
        <Link href="/trainee" className="block text-xs text-[#000066] hover:underline mt-1">
          View in my dashboard
        </Link>
      </div>
    )
  }

  if (!registrationOpen) {
    return <span className="text-sm text-gray-400 whitespace-nowrap">Registration closed</span>
  }

  async function register() {
    setState('busy'); setErr('')
    const { error } = await createClient().rpc('self_register_for_event', { p_event_id: eventId })
    if (error) { setErr(error.message); setState('idle'); return }
    setState('done')
    router.refresh()
  }

  return (
    <div className="text-right">
      <button onClick={register} disabled={state === 'busy'}
        className="btn-primary px-5 py-2.5 text-sm whitespace-nowrap inline-flex items-center gap-2 disabled:opacity-60">
        {state === 'busy' && <Loader2 className="w-4 h-4 animate-spin" />}
        {state === 'busy' ? 'Registering…' : 'Register'}
      </button>
      {err && <p className="text-xs text-red-600 mt-1 max-w-[200px]">{err}</p>}
    </div>
  )
}
