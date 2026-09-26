import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PortalHeader from '@/components/portal/PortalHeader'
import { embedUrl } from '@/lib/embed'
import { ArrowLeft, Radio, CalendarClock, ExternalLink, CheckCircle2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function LiveSessionPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?redirect=/learn/live/${params.id}`)

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', user.id).single()

  const { data: session } = await supabase
    .from('live_sessions')
    .select('id, title, description, scheduled_at, join_url, status')
    .eq('id', params.id).single()
  if (!session) notFound()

  const isLive = session.status === 'live'
  const isEnded = session.status === 'ended'
  const embed = isLive ? embedUrl(session.join_url) : null

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader name={profile?.full_name || ''} />
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Link href="/learn" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#000066] mb-4">
          <ArrowLeft className="w-4 h-4" />All sessions
        </Link>

        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-gray-900">{session.title}</h1>
          {isLive && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />LIVE
            </span>
          )}
        </div>
        {session.description && <p className="text-gray-600 mb-6">{session.description}</p>}

        {/* LIVE: embed if YouTube/Vimeo, else a Join button */}
        {isLive && (
          <div className="mb-6">
            {embed ? (
              <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
                <iframe src={embed} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              </div>
            ) : session.join_url ? (
              <a href={session.join_url} target="_blank" rel="noreferrer" className="btn-primary inline-flex items-center gap-2 px-6">
                <ExternalLink className="w-4 h-4" />Join the live session
              </a>
            ) : (
              <div className="card text-gray-500 text-sm">This session is live, but no join link has been provided yet. Please check back shortly.</div>
            )}
          </div>
        )}

        {/* SCHEDULED: countdown info + link if provided */}
        {session.status === 'scheduled' && (
          <div className="card">
            <div className="flex items-center gap-2 text-[#000066] font-medium">
              <CalendarClock className="w-5 h-5" />
              {session.scheduled_at
                ? new Date(session.scheduled_at).toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })
                : 'Date and time to be announced'}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              This session hasn&apos;t started yet. Come back to this page when it&apos;s time — the lecture will play here once the instructor goes live.
            </p>
            {session.join_url && (
              <a href={session.join_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-[#000066] hover:underline mt-3">
                <ExternalLink className="w-4 h-4" />Preview the join link
              </a>
            )}
          </div>
        )}

        {/* ENDED */}
        {isEnded && (
          <div className="card text-center py-10">
            <CheckCircle2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">This live session has ended.</p>
            <p className="text-sm text-gray-500 mt-1">A recording may be added as a self-paced course. Check the courses below.</p>
            <Link href="/learn" className="btn-secondary inline-flex mt-4 px-6">Back to courses</Link>
          </div>
        )}
      </div>
    </div>
  )
}
