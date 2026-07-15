'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Shield, LayoutDashboard, Calendar, Award,
  Building2, Users, BookOpen, LogOut, Menu, X, ChevronRight
} from 'lucide-react'

const nav = [
  { href: '/admin',               label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/admin/events',        label: 'Training Events', icon: Calendar },
  { href: '/admin/certificates',  label: 'Certificates',   icon: Award },
  { href: '/admin/organisations', label: 'Organisations',  icon: Building2 },
  { href: '/admin/users',         label: 'Users',          icon: Users },
  { href: '/admin/virtual',       label: 'Virtual Training',icon: BookOpen },
]

export default function AdminShell({
  children, role
}: { children: React.ReactNode; role?: string }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [open, setOpen] = useState(false)

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-blue-800">
        <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-[#000066]" />
        </div>
        <div>
          <div className="font-bold text-white text-sm leading-tight">SAVAN Portal</div>
          <div className="text-blue-300 text-xs capitalize">{role || 'Admin'}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(item => {
          const active = pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-white/20 text-white font-medium'
                  : 'text-blue-200 hover:bg-white/10 hover:text-white'
              }`}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
              {active && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-blue-800">
        <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-blue-200 hover:text-white text-sm">
          <Shield className="w-4 h-4" />Public Site
        </Link>
        <button onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 text-sm mt-1">
          <LogOut className="w-4 h-4" />Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-[#000066] flex-col flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-56 bg-[#000066] flex flex-col">
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-[#000066] text-white">
          <button onClick={() => setOpen(!open)}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-semibold">SAVAN Portal</span>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
