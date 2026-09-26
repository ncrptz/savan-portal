import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PortalHeader from '@/components/portal/PortalHeader'
import { BookOpen, Clock, CheckCircle, Radio, CalendarClock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function LearnPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/learn')

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', user.id).single()

  const { data: coursesData } = await supabase
    .from('virtual_courses')
    .select('id, title, description, duration_minutes, pass_mark')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
  const courses = (coursesData as any[]) ?? []

  // Best result per course for this user.
  const { data: attempts } = await supabase
    .from('course_attempts').select('course_id, passed, score').eq('user_id', user.id)
  const best: Record<string, { passed: boolean; score: number }> = {}
  ;((attempts as any[]) ?? []).forEach(a => {
    const cur = best[a.course_id]
    if (!cur || a.score > cur.score) best[a.course_id] = { passed: a.passed, score: a.score }
  })

  // Live & upcoming lecture sessions (live first, then soonest scheduled).
  const { data: sessionsData } = await supabase
    .from('live_sessions')
    .select('id, title, description, scheduled_at, status')
    .in('status', ['live', 'scheduled'])
    .order('scheduled_at', { ascending: true, nullsFirst: false })
  const sessions = ((sessionsData as any[]) ?? []).sort(
    (a, b) => (a.status === 'live' ? -1 : 0) - (b.status === 'live' ? -1 : 0),
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader name={profile?.full_name || ''} />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Virtual Training</h1>
        <p className="text-sm text-gray-500 mb-6">Self-paced theory courses. Study the material, then take the test for an instant result.</p>

        {sessions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Live &amp; upcoming lectures</h2>
            <div className="space-y-3">
              {sessions.map(s => {
                const isLive = s.status === 'live'
                return (
                  <Link key={s.id} href={`/learn/live/${s.id}`}
                    className={`card block hover:shadow-md transition-shadow border-l-4 ${isLive ? 'border-l-red-500' : 'border-l-[#000066]'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 truncate">{s.title}</h3>
                          {isLive && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 inline-flex items-center gap-1 flex-shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />LIVE
                            </span>
                          )}
                        </div>
                        {s.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{s.description}</p>}
                        <p className="text-xs text-gray-500 mt-2 inline-flex items-center gap-1">
                          {isLive ? <Radio className="w-3.5 h-3.5" /> : <CalendarClock className="w-3.5 h-3.5" />}
                          {s.scheduled_at ? new Date(s.scheduled_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'Time to be announced'}
                        </p>
                      </div>
                      <span className={`text-sm font-medium flex-shrink-0 ${isLive ? 'text-red-600' : 'text-[#000066]'}`}>
                        {isLive ? 'Join now →' : 'Details →'}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Self-paced courses</h2>
        {courses.length === 0 ? (
          <div className="card text-center py-12">
            <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No courses are published yet. Please check back soon.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map(c => {
              const b = best[c.id]
              return (
                <Link key={c.id} href={`/learn/${c.id}`} className="card block hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-lg text-gray-900">{c.title}</h2>
                      {c.description && <p className="text-sm text-gray-600 mt-1">{c.description}</p>}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                        {c.duration_minutes ? <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{c.duration_minutes} mins</span> : null}
                        <span>Pass mark {c.pass_mark}%</span>
                      </div>
                    </div>
                    {b && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 inline-flex items-center gap-1 ${
                        b.passed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {b.passed && <CheckCircle className="w-3.5 h-3.5" />}{b.passed ? 'Passed' : `Best ${b.score}%`}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
