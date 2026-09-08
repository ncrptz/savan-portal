import { createClient } from '@/lib/supabase/server'
import { Users } from 'lucide-react'

export default async function TraineesPage() {
  const supabase = await createClient()
  const { data: trainees } = await supabase
    .from('trainees')
    .select('id, full_name, email, phone, created_at, certificates:certificates(count)')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Trainees</h1>
        <p className="text-sm text-gray-500 mt-0.5">{trainees?.length ?? 0} people</p>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium text-right">Certificates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {trainees?.map((t: any) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{t.full_name}</td>
                  <td className="px-4 py-3 text-gray-500">{t.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{t.phone || '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{t.certificates?.[0]?.count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!trainees?.length && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No trainees yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
