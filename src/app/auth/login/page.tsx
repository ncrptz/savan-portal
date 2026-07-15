'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'

function LoginForm() {
  const router  = useRouter()
  const params  = useSearchParams()
  const redirect = params.get('redirect') || '/admin'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('')
    const supabase = createClient()
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError(err.message); setLoading(false); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', data.user.id).single()
    const role = profile?.role
    if (role === 'trainee') router.push('/trainee')
    else if (role === 'organisation') router.push('/org')
    else router.push(redirect)
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#000066] rounded-full mb-4">
          <span className="text-white text-2xl font-bold">S</span>
        </div>
        <h1 className="text-2xl font-bold text-[#000066]">SAVAN Portal</h1>
        <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#000066]"
              placeholder="you@example.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input type={showPwd?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#000066] pr-10"
                placeholder="••••••••" required />
              <button type="button" onClick={()=>setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPwd?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-[#000066] text-white py-2.5 rounded-lg font-medium hover:bg-blue-900 transition-colors">
            {loading?'Signing in…':'Sign in'}
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <Link href="/auth/register" className="text-[#000066] hover:underline font-medium">Register</Link>
        </div>
      </div>
      <p className="text-center text-xs text-gray-400 mt-6">
        <Link href="/" className="hover:underline">← Back to home</Link>
        {' · '}
        <Link href="/verify" className="hover:underline">Verify a certificate</Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  )
}
