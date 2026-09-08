import { createClient } from '@/lib/supabase/server'
import { Award, ExternalLink } from 'lucide-react'

export default async function CertificatesPage() {
  const supabase = await createClient()
  const { data: certs } = await supabase
    .from('certificates')
    .select('id, cert_id, trainee_name, issued_at, pdf_url, revoked, event:training_events(title)')
    .order('issued_at', { ascending: false })

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Certificates</h1>
        <p className="text-sm text-gray-500 mt-0.5">{certs?.length ?? 0} issued</p>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Certificate ID</th>
                <th className="px-4 py-3 font-medium">Trainee</th>
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Issued</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {certs?.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">{c.cert_id}</td>
                  <td className="px-4 py-3 text-gray-900">{c.trainee_name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.event?.title ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {c.issued_at
                      ? new Date(c.issued_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {c.revoked
                      ? <span className="text-red-600 text-xs font-medium">Revoked</span>
                      : <span className="text-green-700 text-xs font-medium">Valid</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.pdf_url
                      ? <a href={c.pdf_url} target="_blank" rel="noreferrer"
                           className="inline-flex items-center gap-1 text-[#000066] hover:underline">
                          Open <ExternalLink className="w-3 h-3" />
                        </a>
                      : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!certs?.length && (
          <div className="text-center py-12">
            <Award className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No certificates issued yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
