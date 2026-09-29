import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('blog_posts')
    .select('title,excerpt,cover_url,body,published_at,status')
    .eq('slug', params.slug)
    .single()

  if (!data || data.status !== 'published') notFound()
  const p = data as any

  return (
    <article className="s-article">
      <Link href="/blog" className="s-back">← All news &amp; stories</Link>
      <div className="s-date" style={{ color: '#C8102E', fontWeight: 700, fontSize: '.75rem', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 16 }}>
        {fmt(p.published_at)}
      </div>
      <h1>{p.title}</h1>
      {p.excerpt && <p className="s-lead" style={{ marginBottom: 8 }}>{p.excerpt}</p>}
      {p.cover_url && <img className="s-cover" src={p.cover_url} alt="" />}
      <div className="s-content">{p.body}</div>
    </article>
  )
}
