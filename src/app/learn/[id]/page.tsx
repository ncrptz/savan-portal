import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import PortalHeader from '@/components/portal/PortalHeader'
import CourseTest from '@/components/learn/CourseTest'
import { embedUrl } from '@/lib/embed'
import { ArrowLeft, FileText, PlayCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CoursePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?redirect=/learn/${params.id}`)

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', user.id).single()

  const { data: course } = await supabase
    .from('virtual_courses')
    .select('id, title, description, video_url, material_url, lesson_html, duration_minutes, pass_mark, status')
    .eq('id', params.id).single()
  if (!course || course.status !== 'published') notFound()

  const embed = embedUrl(course.video_url)

  // Past attempts for this user + course.
  const { data: attemptsData } = await supabase
    .from('course_attempts')
    .select('score, passed, completion_code, created_at')
    .eq('user_id', user.id).eq('course_id', params.id)
    .order('created_at', { ascending: false })
  const attempts = (attemptsData as any[]) ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader name={profile?.full_name || ''} />
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Link href="/learn" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#000066] mb-4">
          <ArrowLeft className="w-4 h-4" />All courses
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{course.title}</h1>
        {course.description && <p className="text-gray-600 mb-6">{course.description}</p>}

        {/* Material */}
        <div className="space-y-4 mb-8">
          {embed && (
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
              <iframe src={embed} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
          )}
          {!embed && course.video_url && (
            <a href={course.video_url} target="_blank" rel="noreferrer" className="card flex items-center gap-3 hover:shadow-md transition-shadow">
              <PlayCircle className="w-6 h-6 text-[#000066]" /><span className="text-sm font-medium text-[#000066]">Open the video</span>
            </a>
          )}
          {course.material_url && (
            <a href={course.material_url} target="_blank" rel="noreferrer" className="card flex items-center gap-3 hover:shadow-md transition-shadow">
              <FileText className="w-6 h-6 text-[#000066]" /><span className="text-sm font-medium text-[#000066]">Open the course material (PDF)</span>
            </a>
          )}
          {course.lesson_html && (
            <div className="card">
              <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">{course.lesson_html}</p>
            </div>
          )}
        </div>

        {/* Test */}
        <CourseTest courseId={course.id} />

        {/* Past attempts */}
        {attempts.length > 0 && (
          <div className="mt-8">
            <h3 className="font-semibold text-gray-900 mb-2">Your attempts</h3>
            <div className="space-y-2">
              {attempts.map((a, i) => (
                <div key={i} className="card flex items-center justify-between py-3">
                  <span className="text-sm text-gray-600">{new Date(a.created_at).toLocaleString('en-GB')}</span>
                  <span className="flex items-center gap-3 text-sm">
                    <span className={a.passed ? 'text-green-700 font-medium' : 'text-amber-600 font-medium'}>{a.score}% · {a.passed ? 'Passed' : 'Not passed'}</span>
                    {a.passed && a.completion_code && (
                      <Link href={`/learn/certificate/${a.completion_code}`} className="text-[#000066] hover:underline">Certificate</Link>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
