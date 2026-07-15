import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Calendar, Award, Users, Building2, Plus, ArrowRight } from 'lucide-react'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [events, certs, trainees, orgs] = await Promise.all([
    supabase.from('training_events').select('id', { count: 'exact', head: true }),
    supabase.from('certificates').select('id', { count: 'exact', head: true }),
    supabase.from('trainees').select('id', { count: 'exact', head: true }),
    supabase.from('organisations').select('id', { count: 'exact', head: true }).eq('status','approved'),
  ])

  const stats = [
    { label: 'Training Events', value: events.count ?? 0, icon: Calendar, href: '/admin/events', color: 'bg-blue-50 text-blue-700' },
    { label: 'Certificates Issued', value: certs.count ?? 0, icon: Award,   href: '/admin/certificates', color: 'bg-green-50 text-green-700' },
    { label: 'Trainees', value: trainees.count ?? 0, icon: Users, href: '/admin/users', color: 'bg-purple-50 text-purple-700' },
    { label: 'Partner Organisations', value: orgs.count ?? 0, icon: Building2, href: '/admin/organisations', color: 'bg-orange-50 text-orange-700' },
  ]

  // Recent events
  const { data: recentEvents } = await supabase
    .from('training_events')
    .select('id, title, training_date, template_type, status, participant_count')
    .order('created_at', { ascending: false })
    .limit(5)

  // Recent certificates
  const { data: recentCerts } = await supabase
    .from('certificates')
    .select('id, cert_id, trainee_name, issued_at')
    .order('issued_at', { ascending: false })
    .limit(5)

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">SAVAN Certificate Management</p>
        </div>
        <Link href="/admin/events/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />New Event
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Link key={s.label} href={s.href}
            className="card hover:shadow-md transition-shadow group">
            <div className={`inline-flex p-2 rounded-lg ${s.color} mb-3`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{s.label}</div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 mt-2 transition-colors" />
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Events */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Training Events</h2>
            <Link href="/admin/events" className="text-sm text-[#000066] hover:underline">View all</Link>
          </div>
          {recentEvents?.length ? (
            <div className="space-y-3">
              {recentEvents.map(ev => (
                <Link key={ev.id} href={`/admin/events/${ev.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{ev.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {new Date(ev.training_date).toLocaleDateString('en-GB')} ·
                      {ev.participant_count} participants · {ev.template_type}
                    </div>
                  </div>
                  <span className={`badge-${ev.status}`}>{ev.status}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">No events yet.
              <Link href="/admin/events/new" className="text-[#000066] hover:underline ml-1">Create one</Link>
            </p>
          )}
        </div>

        {/* Recent Certificates */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Certificates</h2>
            <Link href="/admin/certificates" className="text-sm text-[#000066] hover:underline">View all</Link>
          </div>
          {recentCerts?.length ? (
            <div className="space-y-3">
              {recentCerts.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{c.trainee_name}</div>
                    <div className="text-xs font-mono text-gray-400 mt-0.5">{c.cert_id}</div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(c.issued_at).toLocaleDateString('en-GB')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">No certificates issued yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
