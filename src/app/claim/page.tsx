'use client'
import { Suspense, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle } from 'lucide-react'

function ClaimInner() {
  const params = useSearchParams()
  const router = useRouter()
  const token  = params.get('token') || ''
  const [state, setState] = useState<'loading' | 'need-auth' | 'ok' | 'error'>('loading')
  const [msg, setMsg] = useState('')

  useEffect(() => { run() }, [])

  async function run() {
    if (!token) { setState('error'); setMsg('This claim link is missing its code.'); return }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { try { localStorage.setItem('savan_pending_claim', token) } catch {} ; setState('need-auth'); return }
    const { error } = await supabase.rpc('claim_registration', { p_claim_token: token })
    if (error) { setState('error'); setMsg(error.message); return }
    try { localStorage.removeItem('savan_pending_claim') } catch {}
    setState('ok')
    setTimeout(() => router.push('/trainee'), 1600)
  }

  const loginUrl = `/auth/login?redirect=${encodeURIComponent(`/claim?token=${token}`)}`

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card max-w-md w-full text-center">
        {state === 'loading' && <p className="text-gray-500 py-6">Linking your certificate…</p>}

        {state === 'need-auth' && (
          <>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Claim your certificate</h1>
            <p className="text-sm text-gray-600 mb-4">
              Sign in to link this training to your account. New here? Create an account first,
              then open this link again.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href={loginUrl} className="btn-primary px-6">Sign in</Link>
              <Link href="/auth/register" className="btn-secondary px-6">Create account</Link>
            </div>
          </>
        )}

        {state === 'ok' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h1 className="text-xl font-bold text-gray-900">Linked!</h1>
            <p className="text-sm text-gray-600 mt-1">Taking you to your dashboard…</p>
          </>
        )}

        {state === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h1 className="text-xl font-bold text-gray-900">Couldn&apos;t link this</h1>
            <p className="text-sm text-gray-600 mt-1">{msg}</p>
            <Link href="/trainee" className="btn-secondary px-6 mt-4 inline-block">Go to dashboard</Link>
          </>
        )}
      </div>
    </div>
  )
}

export default function ClaimPage() {
  return <Suspense fallback={null}><ClaimInner /></Suspense>
}
