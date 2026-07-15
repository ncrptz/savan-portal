'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Shield } from 'lucide-react'

type AccountType = 'trainee' | 'organisation'

export default function RegisterPage() {
  const router = useRouter()
  const [type, setType]         = useState<AccountType>('trainee')
  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [phone, setPhone]       = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signUp({
      email, password,
      options: {
        data: {
          full_name: type === 'organisation' ? orgName : fullName,
          role: type,
          phone,
        }
      }
    })
    if (err) { setError(err.message); setLoading(false); return }
    setDone(true)
  }

  if (done) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold mb-2">Check your email</h2>
        <p className="text-gray-600 text-sm mb-4">
          We sent a confirmation link to <strong>{email}</strong>.
          Click it to activate your account.
        </p>
        <Link href="/auth/login" className="btn-primary inline-block">Go to sign in</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#000066] rounded-full mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#000066]">Create Account</h1>
        </div>
        <div className="card">
          {/* Account type toggle */}
          <div className="flex rounded-lg border border-gray-200 mb-6 overflow-hidden">
            {(['trainee','organisation'] as AccountType[]).map(t => (
              <button key={t} onClick={() => setType(t)}
                className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
                  type===t ? 'bg-[#000066] text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}>
                {t}
              </button>
            ))}
          </div>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}
          <form onSubmit={handleRegister} className="space-y-4">
            {type === 'organisation' ? (
              <div>
                <label className="label">Organisation Name</label>
                <input type="text" value={orgName} onChange={e=>setOrgName(e.target.value)}
                  className="input" required />
              </div>
            ) : (
              <div>
                <label className="label">Full Name</label>
                <input type="text" value={fullName} onChange={e=>setFullName(e.target.value)}
                  className="input" placeholder="As it should appear on certificate" required />
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                className="input" required />
            </div>
            <div>
              <label className="label">Phone</label>
              <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)}
                className="input" placeholder="+234..." />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                className="input" minLength={8} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-[#000066] hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'
