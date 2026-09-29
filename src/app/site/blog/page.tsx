import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

export default async function BlogIndex() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('blog_posts')
    .select('id,slug,title,excerpt,cover_url,published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
  const posts = (data as any[]) ?? []

  return (
    <section>
      <div className="s-wrap">
        <span className="s-eyebrow">News &amp; Stories</span>
        <h2 className="s-h2">SAVAN news &amp; stories</h2>
        <p className="s-lead">Updates from our training programmes, outreach and the work of saving lives before the hospital.</p>

        {posts.length === 0 ? (
          <div className="s-card" style={{ textAlign: 'center', marginTop: 32, color: '#5b6478' }}>
            No stories published yet. Please check back soon.
          </div>
        ) : (
          <div className="s-news">
            {posts.map(p => (
              <Link href={`/blog/${p.slug}`} key={p.id} className="s-post">
                {p.cover_url ? <img className="s-cover" src={p.cover_url} alt="" /> : <div className="s-cover" />}
                <div className="s-body">
                  <div className="s-date">{fmt(p.published_at)}</div>
                  <h3>{p.title}</h3>
                  {p.excerpt && <p>{p.excerpt}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
