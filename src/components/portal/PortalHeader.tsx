'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, LogOut, UserCog } from 'lucide-react'

export default function PortalHeader({ name }: { name: string }) {
  const router = useRouter()
  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }
  return (
    <nav className="bg-[#000066] text-white px-6 py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#000066]" />
          </div>
          <div className="font-bold">SAVAN Portal</div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {name && <span className="text-blue-200 hidden sm:inline">{name}</span>}
          <Link href="/profile" className="flex items-center gap-1.5 hover:text-blue-200 transition-colors">
            <UserCog className="w-4 h-4" /> Profile
          </Link>
          <button onClick={signOut} className="flex items-center gap-1.5 hover:text-blue-200 transition-colors">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
