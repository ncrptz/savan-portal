import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { Shield, ArrowLeft } from 'lucide-react'
import EventsBrowser, { PublicEvent } from '@/components/EventsBrowser'

export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  const s = await getSettings()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // RLS returns only publicly-listed events (opened at some point, or completed).
  const { data: eventsData } = await supabase
    .from('training_events')
    .select('id, title, training_date, venue, registration_open, status')
    .order('training_date', { ascending: false })
  const events = (eventsData as PublicEvent[]) ?? []

  // Which of these the signed-in user is already registered for.
  let registeredIds: string[] = []
  if (user && events.length) {
    const { data: regs } = await supabase
      .from('event_registrations')
      .select('event_id')
      .eq('user_id', user.id)
      .in('event_id', events.map(e => e.id))
    registeredIds = ((regs as any[]) ?? []).map(r => r.event_id)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-[#000066] text-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center overflow-hidden">
              {s.logo_url
                ? <img src={s.logo_url} alt="" className="w-full h-full object-contain" />
                : <Shield className="w-5 h-5 text-[#000066]" />}
            </div>
            <span className="font-bold">{s.site_name}</span>
          </Link>
          {user
            ? <Link href="/trainee" className="text-sm hover:text-blue-200">My dashboard</Link>
            : <Link href="/auth/login" className="text-sm bg-white text-[#000066] px-4 py-1.5 rounded-lg font-medium hover:bg-blue-50">Sign In</Link>}
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#000066] mb-6">
          <ArrowLeft className="w-4 h-4" />Back to home
        </Link>
        <h1 className="text-3xl font-bold text-[#000066] mb-2">Training Events</h1>
        <p className="text-gray-600 mb-8">
          SAVAN BLS &amp; AED training sessions. {user ? 'Register for any open session, or browse past and upcoming ones.' : 'Sign in to register for an open session.'}
        </p>

        {events.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">No training sessions have been published yet. Please check back soon.</p>
          </div>
        ) : (
          <EventsBrowser events={events} registeredIds={registeredIds} loggedIn={!!user} />
        )}
      </div>
    </div>
  )
}
