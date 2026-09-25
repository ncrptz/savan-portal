import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/settings'
import { formatCertDate } from '@/lib/date'
import { Shield, ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CompletionCertificate({ params }: { params: { code: string } }) {
  const s = await getSettings()
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_completion', { p_code: params.code })
  if (!data) notFound()
  const c = data as { course_title: string; user_name: string; score: number; issued_at: string }

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4 print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto mb-4 flex items-center justify-between print:hidden">
        <Link href="/learn" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#000066]">
          <ArrowLeft className="w-4 h-4" />Back to courses
        </Link>
        <button className="btn-primary px-5" data-print>Print / Save as PDF</button>
      </div>

      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg print:shadow-none border-4 border-[#000066] p-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-14 h-14 bg-[#000066] rounded-full flex items-center justify-center overflow-hidden">
            {s.logo_url
              ? <img src={s.logo_url} alt="" className="w-full h-full object-contain bg-white" />
              : <Shield className="w-7 h-7 text-white" />}
          </div>
          <div className="text-left">
            <div className="font-bold text-lg text-[#000066] leading-tight">{s.site_name}</div>
            <div className="text-xs text-gray-500">Virtual Training</div>
          </div>
        </div>

        <p className="text-sm uppercase tracking-widest text-gray-400 mb-2">Certificate of Completion</p>
        <p className="text-gray-600 mb-1">This certifies that</p>
        <h1 className="text-3xl font-bold text-[#000066] mb-4">{c.user_name || 'Trainee'}</h1>
        <p className="text-gray-600 mb-1">has successfully completed the online course</p>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">{c.course_title}</h2>

        <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
          <div><div className="font-semibold text-gray-900">{c.score}%</div><div className="text-xs text-gray-400">Score</div></div>
          <div><div className="font-semibold text-gray-900">{formatCertDate(c.issued_at)}</div><div className="text-xs text-gray-400">Date</div></div>
          <div><div className="font-mono font-semibold text-gray-900">{params.code}</div><div className="text-xs text-gray-400">Reference</div></div>
        </div>

        <p className="text-[11px] text-gray-400 mt-8">
          This certifies completion of the theoretical component only. Practical BLS/AED certification is issued separately.
        </p>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `document.querySelector('[data-print]')?.addEventListener('click',function(){window.print()})` }} />
    </div>
  )
}
