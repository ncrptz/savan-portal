import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Calendar, Users, ChevronRight } from 'lucide-react'

export default async function EventsPage() {
  const supabase = await createClient()
  const { data: events } = await supabase
    .from('training_events')
    .select('*, organisation:organisations(name)')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Training Events</h1>
          <p className="text-sm text-gray-500 mt-0.5">{events?.length ?? 0} events</p>
        </div>
        <Link href="/admin/events/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />New Event
        </Link>
      </div>

      <div className="space-y-3">
        {events?.map(ev => (
          <Link key={ev.id} href={`/admin/events/${ev.id}`}
            className="card hover:shadow-md transition-shadow flex items-center justify-between p-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-[#000066]" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">{ev.title}</div>
                <div className="text-sm text-gray-500 mt-0.5">
                  {new Date(ev.training_date).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}
                  {ev.venue ? ` · ${ev.venue}` : ''}
                  {' · '}{ev.template_type}
                  {ev.organisation ? ` · ${ev.organisation.name}` : ''}
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className={`badge-${ev.status}`}>{ev.status}</span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Users className="w-3 h-3" />{ev.participant_count} participants
                  </span>
                  <span className="text-xs font-mono text-gray-400">
                    Serial {ev.event_serial}
                  </span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
          </Link>
        ))}

        {!events?.length && (
          <div className="card text-center py-12">
            <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No training events yet.</p>
            <Link href="/admin/events/new" className="btn-primary inline-block mt-4">
              Create First Event
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
