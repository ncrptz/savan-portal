import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { formatCertDate } from '@/lib/date'
import { Shield, Calendar, MapPin, ArrowLeft } from 'lucide-react'
import EventRegisterButton from '@/components/EventRegisterButton'

export const dynamic = 'force-dynamic'

interface EventRow {
  id: string
  title: string
  training_date: string
  venue: string | null
  registration_open: boolean
}

export default async function EventsPage() {
  const s = await getSettings()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: eventsData } = await supabase
    .from('training_events')
    .select('id, title, training_date, venue, registration_open')
    .eq('status', 'active')
    .order('training_date', { ascending: true })
  const events = (eventsData as EventRow[]) ?? []

  // Which of these the signed-in user is already registered for.
  let registeredIds = new Set<string>()
  if (user && events.length) {
    const { data: regs } = await supabase
      .from('event_registrations')
      .select('event_id')
      .eq('user_id', user.id)
      .in('event_id', events.map(e => e.id))
    registeredIds = new Set(((regs as any[]) ?? []).map(r => r.event_id))
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
          Upcoming SAVAN BLS &amp; AED training sessions. {user ? 'Register for any open session below.' : 'Sign in to register for a session.'}
        </p>

        {events.length === 0 ? (
          <div className="card text-center py-12">
            <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No training sessions are open right now. Please check back soon.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map(ev => (
              <div key={ev.id} className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-lg text-gray-900">{ev.title}</h2>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm text-gray-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />{formatCertDate(ev.training_date)}
                    </span>
                    {ev.venue && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />{ev.venue}
                      </span>
                    )}
                  </div>
                </div>
                <EventRegisterButton
                  eventId={ev.id}
                  loggedIn={!!user}
                  registrationOpen={ev.registration_open}
                  alreadyRegistered={registeredIds.has(ev.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
