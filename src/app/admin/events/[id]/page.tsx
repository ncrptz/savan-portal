import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Calendar, Users, Award, Pencil, FileText, Plus } from 'lucide-react'

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: event } = await supabase
    .from('training_events')
    .select('*, organisation:organisations(name, logo_url)')
    .eq('id', params.id)
    .single()

  if (!event) notFound()

  const { data: certs } = await supabase
    .from('certificates')
    .select('id, cert_id, trainee_name, issued_at, pdf_url, revoked')
    .eq('event_id', params.id)
    .order('cert_id')

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/events" className="text-sm text-gray-500 hover:text-gray-700">← Events</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{event.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`badge-${event.status}`}>{event.status}</span>
            <span className="text-sm text-gray-500">Serial: <span className="font-mono">{event.event_serial}</span></span>
            <span className="text-sm text-gray-500">{event.template_type}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/events/${params.id}/edit`} className="btn-secondary flex items-center gap-2">
            <Pencil className="w-4 h-4" />Edit
          </Link>
          <Link href={`/admin/events/${params.id}/generate`} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />Generate Certificates
          </Link>
        </div>
      </div>

      {/* Event details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 text-[#000066] mb-3">
            <Calendar className="w-4 h-4" /><span className="font-medium text-sm">Event Details</span>
          </div>
          <dl className="space-y-2 text-sm">
            <Row label="Date" value={new Date(event.training_date).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})} />
            <Row label="Venue" value={event.venue || '—'} />
            <Row label="Batch" value={`${event.year}/${String(event.month).padStart(2,'0')}${event.session_in_month}`} />
            {event.sponsored_by && <Row label="Sponsored by" value={event.sponsored_by} />}
          </dl>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 text-[#000066] mb-3">
            <Users className="w-4 h-4" /><span className="font-medium text-sm">Participants</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{event.participant_count}</div>
          <div className="text-sm text-gray-500 mt-1">participants registered</div>
          <div className="text-sm text-gray-500">{certs?.length ?? 0} certificates issued</div>
        </div>

        {event.template_type === 'T2' && (
          <div className="card">
            <div className="flex items-center gap-2 text-[#000066] mb-3">
              <FileText className="w-4 h-4" /><span className="font-medium text-sm">Collaborator</span>
            </div>
            <dl className="space-y-2 text-sm">
              <Row label="Organisation" value={event.organisation?.name || '—'} />
              <Row label="Signatory" value={event.collab_signer_name || '—'} />
              <Row label="Designation" value={event.collab_signer_title || '—'} />
            </dl>
          </div>
        )}
      </div>

      {/* Certificates table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-[#000066]">
            <Award className="w-5 h-5" />
            <h2 className="font-semibold text-gray-900">Certificates ({certs?.length ?? 0})</h2>
          </div>
          <Link href={`/admin/events/${params.id}/generate`} className="text-sm text-[#000066] hover:underline">
            + Generate more
          </Link>
        </div>

        {certs?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Cert ID</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Recipient</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Issued</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Status</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {certs.map(c => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-xs text-gray-600">{c.cert_id}</td>
                    <td className="py-2 px-3 font-medium text-gray-900">{c.trainee_name}</td>
                    <td className="py-2 px-3 text-gray-500">
                      {new Date(c.issued_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-2 px-3">
                      {c.revoked
                        ? <span className="badge-revoked">Revoked</span>
                        : <span className="badge-active">Valid</span>
                      }
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex gap-3">
                        <Link href={`/verify?q=${c.cert_id}`} target="_blank"
                          className="text-[#000066] hover:underline text-xs">Verify</Link>
                        {c.pdf_url && (
                          <a href={c.pdf_url} target="_blank"
                            className="text-[#000066] hover:underline text-xs">PDF</a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <Award className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No certificates generated yet.</p>
            <Link href={`/admin/events/${params.id}/generate`} className="btn-primary inline-block mt-3">
              Generate Now
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-gray-400">{label}</dt>
      <dd className="text-gray-900 font-medium mt-0.5">{value}</dd>
    </div>
  )
}
