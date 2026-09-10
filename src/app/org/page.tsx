import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PortalHeader from '@/components/portal/PortalHeader'
import { Building2, CheckCircle } from 'lucide-react'

export default async function OrgPortal(
  { searchParams }: { searchParams: { welcome?: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('full_name').eq('user_id', user.id).single()

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader name={profile?.full_name || ''} />
      <div className="max-w-4xl mx-auto px-6 py-8">
        {searchParams.welcome && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800 text-sm">Your email is verified and you're signed in. Welcome to SAVAN!</p>
          </div>
        )}

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Organisation Portal</h1>
        <p className="text-sm text-gray-500 mb-6">Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}.</p>

        <div className="card text-center py-12">
          <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-600">Your organisation dashboard is being set up.</p>
          <p className="text-gray-400 text-sm mt-1 max-w-md mx-auto">
            Tools for partner organisations — training requests, participant lists, and collaborative
            certificates — are coming soon. In the meantime you can verify any certificate from the public site.
          </p>
        </div>
      </div>
    </div>
  )
}
