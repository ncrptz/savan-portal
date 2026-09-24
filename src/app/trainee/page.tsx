import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PortalHeader from '@/components/portal/PortalHeader'
import PendingClaim from '@/components/portal/PendingClaim'
import RequestRelease from '@/components/portal/RequestRelease'
import { formatCertDate } from '@/lib/date'
import { Award, ExternalLink, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default async function TraineePortal(
  { searchParams }: { searchParams: { welcome?: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('full_name').eq('user_id', user.id).single()
  const fullName = profile?.full_name || ''

  const { data: regsData } = await supabase
    .from('event_registrations')
    .select('id, training_id, status, event:training_events(title, training_date)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  const regs = (regsData as any[]) ?? []
  const regIds = regs.map(r => r.id)

  const { data: certsData } = regIds.length
    ? await supabase.from('certificates')
        .select('cert_id, issue_date, pdf_url, verify_token, registration_id')
        .in('registration_id', regIds)
    : { data: [] as any[] }
  const certByReg: Record<string, any> = {}
  ;((certsData as any[]) ?? []).forEach(c => { if (c.registration_id) certByReg[c.registration_id] = c })

  const statusLabel = (s: string) =>
    s === 'certified' ? <span className="text-[#000066] font-medium">Certified</span>
    : s === 'trained' ? <span className="text-green-700 font-medium">Trained — certificate pending</span>
    : <span className="text-amber-600 font-medium">Scheduled</span>

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader name={fullName} />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <PendingClaim />
        {searchParams.welcome && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800 text-sm">Your email is verified and you&apos;re signed in. Welcome to SAVAN!</p>
          </div>
        )}

        <h1 className="text-2xl font-bold text-gray-900 mb-1">My Trainings</h1>
        <p className="text-sm text-gray-500 mb-6">Trainings linked to your account and their certificates.</p>

        {regs.length > 0 ? (
          <div className="space-y-3">
            {regs.map(r => {
              const cert = certByReg[r.id]
              return (
                <div key={r.id} className="card flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{r.event?.title ?? 'BLS &amp; AED Training'}</p>
                    <p className="font-mono text-xs text-gray-500 mt-0.5">Training ID: {r.training_id}</p>
                    <p className="text-xs mt-1">
                      {statusLabel(r.status)}
                      {cert?.issue_date && <span className="text-gray-400"> · issued {formatCertDate(cert.issue_date)}</span>}
                    </p>
                  </div>
                  {cert && (
                    <div className="flex items-center gap-4 flex-shrink-0 text-sm">
                      {cert.pdf_url && (
                        <a href={cert.pdf_url} target="_blank" rel="noreferrer"
                          className="text-[#000066] hover:underline inline-flex items-center gap-1">
                          PDF <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {cert.verify_token && (
                        <Link href={`/verify?token=${cert.verify_token}`} className="text-[#000066] hover:underline">Verify</Link>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="card text-center py-12">
            <Award className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-600">No trainings are linked to your account yet.</p>
            <p className="text-gray-400 text-sm mt-1">
              If you attended a SAVAN training, use the claim link your trainer shared to link it here,
              or <Link href="/events" className="text-[#000066] hover:underline">browse upcoming events</Link> to register.
            </p>
          </div>
        )}
        <RequestRelease defaultName={fullName} />
      </div>
    </div>
  )
}
