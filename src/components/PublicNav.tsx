'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Consistent branded header for the public pages (verify, events, auth, claim).
// Pulls the CMS logo + site name so branding stays in sync with the homepage.
export default function PublicNav() {
  const [logo, setLogo] = useState<string | null>(null)
  const [name, setName] = useState('SAVAN')

  useEffect(() => {
    createClient().from('site_settings').select('logo_url, site_name').eq('id', true).single()
      .then(({ data }) => {
        if (data?.logo_url) setLogo(data.logo_url)
        if (data?.site_name) setName(data.site_name)
      })
  }, [])

  return (
    <nav className="bg-[#000066] text-white px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
            {logo
              ? <img src={logo} alt="" className="w-full h-full object-contain" />
              : <Shield className="w-5 h-5 text-[#000066]" />}
          </div>
          <span className="font-bold">{name}</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/events" className="hover:text-blue-200 transition-colors">Training Events</Link>
          <Link href="/verify" className="hover:text-blue-200 transition-colors">Verify</Link>
          <Link href="/auth/login" className="bg-white text-[#000066] px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors font-medium">
            Sign In
          </Link>
        </div>
      </div>
    </nav>
  )
}
