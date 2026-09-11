import { formatCertDate } from '@/lib/date'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PortalHeader from '@/components/portal/PortalHeader'
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

  const { data: certs } = await supabase
    .from('certificates')
    .select('id, cert_id, issued_at, status, pdf_url, verify_token, event:training_events(title)')
    .ilike('trainee_name', fullName)
    .order('issued_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader name={fullName} />
      <div className="max-w-4xl mx-auto px-6 py-8">
        {searchParams.welcome && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800 text-sm">Your email is verified and you're signed in. Welcome to SAVAN!</p>
          </div>
        )}

        <h1 className="text-2xl font-bold text-gray-900 mb-1">My Certificates</h1>
        <p className="text-sm text-gray-500 mb-6">
          Certificates issued to {fullName || 'your account'}.
        </p>

        {certs && certs.length > 0 ? (
          <div className="space-y-3">
            {certs.map((c: any) => (
              <div key={c.id} className="card flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-gray-500">{c.cert_id}</p>
                  <p className="font-medium text-gray-900">{c.event?.title ?? 'BLS & AED Certification'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {c.issued_at && formatCertDate(c.issued_at)}
                    {c.status !== 'active' && <span className="ml-2 text-red-600 font-medium">Revoked</span>}
                  </p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 text-sm">
                  {c.pdf_url && (
                    <a href={c.pdf_url} target="_blank" rel="noreferrer"
                      className="text-[#000066] hover:underline inline-flex items-center gap-1">
                      PDF <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {c.verify_token && (
                    <Link href={`/verify?token=${c.verify_token}`} className="text-[#000066] hover:underline">Verify</Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <Award className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-600">No certificates are linked to your account yet.</p>
            <p className="text-gray-400 text-sm mt-1">
              Once a SAVAN training you completed is issued under your name, it will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
