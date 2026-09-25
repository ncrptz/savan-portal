import Link from 'next/link'
import { Shield, CheckCircle, Users, BookOpen, Search, Award } from 'lucide-react'
import { getSettings } from '@/lib/settings'
import { iconFor } from '@/lib/icons'
import EventsPopup from '@/components/EventsPopup'
import FloatingAdvert from '@/components/FloatingAdvert'
import { createClient } from '@/lib/supabase/server'
import { dashboardPath } from '@/lib/roles'

export default async function HomePage() {
  const s = await getSettings()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const loggedIn = !!user
  let dashHref = '/trainee'
  if (user) {
    const { data: p } = await supabase.from('profiles').select('role').eq('user_id', user.id).single()
    dashHref = dashboardPath(p?.role)
  }
  // Signed-in visitors already have an account, so the "join a training" CTAs
  // send them straight to the event sign-up page instead of the register form.
  const joinHref = loggedIn ? '/events' : s.hero_cta_href
  return (
    <div className="min-h-screen bg-white">
      {s.popup_enabled && (s.popup_title || s.popup_body || s.popup_image_url) && (
        <EventsPopup
          title={s.popup_title}
          body={s.popup_body}
          imageUrl={s.popup_image_url}
          ctaLabel={s.popup_cta_label}
          ctaHref={loggedIn ? '/events' : s.popup_cta_href}
        />
      )}
      {s.advert_enabled && s.advert_image_url && (
        <FloatingAdvert imageUrl={s.advert_image_url} href={s.advert_href} alt={s.advert_alt} />
      )}
      {/* Nav */}
      <nav className="bg-[#000066] text-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden">
              {s.logo_url
                ? <img src={s.logo_url} alt="" className="w-full h-full object-contain" />
                : <Shield className="w-6 h-6 text-[#000066]" />}
            </div>
            <div>
              <div className="font-bold text-lg leading-tight">{s.site_name}</div>
              <div className="text-xs text-blue-200 leading-tight">Save Accident Victims Association of Nigeria</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/verify" className="text-sm hover:text-blue-200 transition-colors">
              Verify Certificate
            </Link>
            <Link href={loggedIn ? dashHref : '/auth/login'} className="text-sm bg-white text-[#000066] px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors font-medium">
              {loggedIn ? 'Dashboard' : 'Sign In'}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative text-white py-20 px-6 bg-gradient-to-br from-[#000066] to-blue-900 overflow-hidden">
        {s.hero_image_url && (
          <>
            <div className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${s.hero_image_url})` }} />
            <div className="absolute inset-0 bg-[#000066]" style={{ opacity: s.hero_overlay / 100 }} />
          </>
        )}
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">
            {s.hero_title}
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            {s.hero_subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/verify" className="bg-white text-[#000066] px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
              Verify a Certificate
            </Link>
            <Link href={joinHref} className="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors">
              {s.hero_cta_label}
            </Link>
          </div>
        </div>
      </section>

      {/* Mid-page background band */}
      <div className="relative">
        {s.mid_image_url && (<>
          <div className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${s.mid_image_url})`, backgroundAttachment: 'fixed' }} />
          <div className="absolute inset-0 bg-white" style={{ opacity: s.mid_overlay / 100 }} />
        </>)}
        <div className="relative">

      {/* Verify widget */}
      <section className={`py-12 px-6 ${s.mid_image_url ? '' : 'bg-[#FFFFCC]/30'}`}>
        <div className="max-w-xl mx-auto">
          <h2 className="text-xl font-bold text-center text-[#000066] mb-6">
            Quick Certificate Verification
          </h2>
          <form action="/verify" method="GET" className="flex gap-2">
            <input
              name="q"
              type="text"
              placeholder="Enter certificate ID or recipient name..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#000066]"
            />
            <button type="submit" className="btn-primary flex items-center gap-2">
              <Search className="w-4 h-4" />
              Verify
            </button>
          </form>
          <p className="text-xs text-gray-500 text-center mt-2">
            Format: SAVAN/BLSAED/YYYY/MMS/NNN
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-[#000066] mb-12">
            {s.offer_title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {s.features.map((f, i) => {
              const Icon = iconFor(f.icon)
              return (
                <div key={i} className="text-center p-6">
                  <div className="flex justify-center mb-4"><Icon className="w-8 h-8 text-[#000066]" /></div>
                  <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-gray-600 text-sm">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#000066] text-white py-8 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-blue-200">{s.footer_text}</p>
          {s.footer_note && <p className="text-xs text-blue-300 mt-1">{s.footer_note}</p>}
        </div>
      </footer>
    </div>
  )
}
