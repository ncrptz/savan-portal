'use client'
import { useState } from 'react'
import { Calendar, MapPin } from 'lucide-react'
import { formatCertDate } from '@/lib/date'
import EventRegisterButton from '@/components/EventRegisterButton'

export interface PublicEvent {
  id: string
  title: string
  training_date: string
  venue: string | null
  registration_open: boolean
  status: string
}

type Filter = 'all' | 'open' | 'upcoming' | 'closed' | 'past'
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open now' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'closed', label: 'Closed' },
  { key: 'past', label: 'Past' },
]

function startOfToday() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d
}
function isPast(ev: PublicEvent) {
  if (ev.status === 'completed') return true
  const d = new Date(ev.training_date)
  return !isNaN(d.getTime()) && d < startOfToday()
}
function stateOf(ev: PublicEvent): { label: string; cls: string } {
  if (isPast(ev)) return { label: 'Past', cls: 'bg-gray-100 text-gray-500' }
  if (ev.registration_open) return { label: 'Open', cls: 'bg-green-100 text-green-700' }
  return { label: 'Closed', cls: 'bg-amber-100 text-amber-700' }
}

export default function EventsBrowser({
  events, registeredIds, loggedIn,
}: { events: PublicEvent[]; registeredIds: string[]; loggedIn: boolean }) {
  const [filter, setFilter] = useState<Filter>('all')
  const regSet = new Set(registeredIds)

  const counts: Record<Filter, number> = {
    all: events.length,
    open: events.filter(e => e.registration_open && !isPast(e)).length,
    upcoming: events.filter(e => !isPast(e)).length,
    closed: events.filter(e => !e.registration_open && !isPast(e)).length,
    past: events.filter(e => isPast(e)).length,
  }

  const shown = events.filter(e => {
    switch (filter) {
      case 'open':     return e.registration_open && !isPast(e)
      case 'upcoming': return !isPast(e)
      case 'closed':   return !e.registration_open && !isPast(e)
      case 'past':     return isPast(e)
      default:         return true
    }
  }).sort((a, b) => {
    const da = new Date(a.training_date).getTime(), db = new Date(b.training_date).getTime()
    return filter === 'past' ? db - da : da - db   // past: newest first, else soonest first
  })

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3.5 py-1.5 rounded-full text-sm transition-colors ${
              filter === f.key
                ? 'bg-[#000066] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {f.label} <span className={filter === f.key ? 'text-blue-200' : 'text-gray-400'}>{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">No events in this view.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {shown.map(ev => {
            const st = stateOf(ev)
            const registerable = ev.registration_open && !isPast(ev)
            return (
              <div key={ev.id} className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-lg text-gray-900">{ev.title}</h2>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                  </div>
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
                  loggedIn={loggedIn}
                  registrationOpen={registerable}
                  alreadyRegistered={regSet.has(ev.id)}
                />
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
