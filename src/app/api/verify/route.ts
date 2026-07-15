import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ certificate: null })

  const supabase = await createClient()

  // Search by cert_id (exact) or trainee_name (ilike)
  const isCertId = q.toUpperCase().startsWith('SAVAN/')

  const query = supabase
    .from('certificates')
    .select(`
      *,
      event:training_events(title, training_date, venue, template_type, sponsored_by)
    `)
    .limit(1)

  const { data, error } = isCertId
    ? await query.eq('cert_id', q.toUpperCase())
    : await query.ilike('trainee_name', `%${q}%`)

  if (error || !data?.length) {
    return NextResponse.json({ certificate: null })
  }

  return NextResponse.json({ certificate: data[0] })
}
