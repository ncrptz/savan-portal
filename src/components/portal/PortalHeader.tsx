'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Shield, LogOut, UserCog, LayoutDashboard, Calendar, Building2 } from 'lucide-react'

export default function PortalHeader({ name }: { name: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const [logo, setLogo] = useState<string | null>(null)
  const [siteName, setSiteName] = useState('SAVAN Portal')
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    const s = createClient()
    s.from('site_settings').select('logo_url, site_name').eq('id', true).single()
      .then(({ data }) => {
        if (data?.logo_url) setLogo(data.logo_url)
        if (data?.site_name) setSiteName(data.site_name)
      })
    s.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      s.from('profiles').select('role').eq('user_id', user.id).single()
        .then(({ data }) => setRole(data?.role ?? null))
    })
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const isOrg = role === 'organisation'
  const home = isOrg ? '/org' : '/trainee'
  const tabs = isOrg
    ? [
        { href: '/org',    label: 'Organisation',      icon: Building2 },
        { href: '/events', label: 'Upcoming Trainings', icon: Calendar },
      ]
    : [
        { href: '/trainee', label: 'My Trainings',       icon: LayoutDashboard },
        { href: '/events',  label: 'Upcoming Trainings', icon: Calendar },
      ]

  return (
    <nav className="bg-[#000066] text-white px-6 py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 min-w-0">
          <Link href={home} className="flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center overflow-hidden">
              {logo
                ? <img src={logo} alt="" className="w-full h-full object-contain" />
                : <Shield className="w-5 h-5 text-[#000066]" />}
            </div>
            <div className="font-bold hidden sm:block">{siteName}</div>
          </Link>
          <div className="flex items-center gap-1">
            {tabs.map(t => {
              const active = pathname === t.href
              return (
                <Link key={t.href} href={t.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    active ? 'bg-white/15 font-medium' : 'text-blue-200 hover:text-white hover:bg-white/10'
                  }`}>
                  <t.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm flex-shrink-0">
          {name && <span className="text-blue-200 hidden md:inline">{name}</span>}
          <Link href="/profile" className="flex items-center gap-1.5 hover:text-blue-200 transition-colors">
            <UserCog className="w-4 h-4" /> <span className="hidden sm:inline">Profile</span>
          </Link>
          <button onClick={signOut} className="flex items-center gap-1.5 hover:text-blue-200 transition-colors">
            <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
