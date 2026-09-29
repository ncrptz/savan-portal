import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { UNIBEN_LOGO, UBTH_LOGO, HERO_BG } from '@/lib/site-assets'

export const dynamic = 'force-dynamic'

const PORTAL = 'https://verify.savan-ngo.org'

const DEFAULT_ORGS: { mono: string; name: string; logo?: string }[] = [
  { mono: 'UNIBEN', name: 'University of Benin', logo: UNIBEN_LOGO },
  { mono: 'UBTH', name: 'UofB Teaching Hospital', logo: UBTH_LOGO },
  { mono: 'EDSMA', name: 'Edo State' },
  { mono: 'GH', name: 'Government House, GRA' },
  { mono: 'ESH', name: 'Edo Specialist Hospital' },
  { mono: 'WADEM', name: 'Disaster & Emergency Medicine' },
  { mono: 'YALE', name: 'Yale New Haven Congress' },
  { mono: 'RAA', name: 'Richmond Ambulance, USA' },
]

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

export default async function SiteHome() {
  const supabase = await createClient()
  const [{ data: adverts }, { data: photos }, { data: posts }, { data: cfg }, { data: orgRows }] = await Promise.all([
    supabase.from('site_adverts').select('id,title,image_url,link_url').order('sort'),
    supabase.from('site_photos').select('id,image_url,caption').order('sort'),
    supabase.from('blog_posts').select('id,slug,title,excerpt,cover_url,published_at')
      .eq('status', 'published').order('published_at', { ascending: false }).limit(3),
    supabase.from('main_site').select('hero_url,hero_title,hero_subtitle').eq('id', true).single(),
    supabase.from('site_orgs').select('name,logo_url,mono').order('sort'),
  ])
  const heroBg = (cfg as any)?.hero_url || HERO_BG
  const heroTitle = (cfg as any)?.hero_title || 'Saving lives before the hospital.'
  const heroSubtitle = (cfg as any)?.hero_subtitle ||
    'SAVAN improves the survival of road-traffic accident and critical-emergency victims across Nigeria — through pre-hospital care and nationwide Basic Life Support (BLS) & Automated External Defibrillation (AED) training.'
  const advert = (adverts as any[])?.[0]
  const pics = (photos as any[]) ?? []
  const news = (posts as any[]) ?? []
  const orgs = ((orgRows as any[])?.length
    ? (orgRows as any[]).map(o => ({ name: o.name, mono: o.mono || '', logo: o.logo_url || undefined }))
    : DEFAULT_ORGS)
  const orgTrack = [...orgs, ...orgs]
  const picTrack = [...pics, ...pics]

  return (
    <>
      {/* Hero */}
      <section className="s-hero">
        <div className="s-bg" style={{ backgroundImage: `url(${heroBg})` }} />
        <div className="s-ov" />
        <div className="s-ov2" />
        <div className="s-wrap">
          <span className="s-pill">Not-for-profit NGO · Est. 1996 · CAC Registered</span>
          <h1>{heroTitle}</h1>
          <p className="s-lede">{heroSubtitle}</p>
          <div className="s-hero-cta">
            <a className="s-btn s-btn-primary" href={PORTAL}>Verify a Certificate →</a>
            <a className="s-btn s-btn-ghost" href={PORTAL}>Certificate Portal</a>
          </div>
          <div className="s-stats">
            <div><b>1996</b><span>Founded</span></div>
            <div><b>BLS · AED</b><span>Core training</span></div>
            <div><b>Quarterly</b><span>Training cycles</span></div>
          </div>
        </div>
      </section>

      {/* Advert (from CMS) */}
      {advert && (
        <div className="s-advert">
          <div className="s-wrap">
            {advert.link_url
              ? <a href={advert.link_url} target="_blank" rel="noreferrer"><img src={advert.image_url} alt={advert.title || 'Advert'} /></a>
              : <span className="s-adimg"><img src={advert.image_url} alt={advert.title || 'Advert'} /></span>}
          </div>
        </div>
      )}

      {/* Photo mosaic (Metro tiles, from CMS) */}
      {pics.length > 0 && (
        <div className="s-metro">
          <div className="s-wrap">
            <h2>SAVAN in action</h2>
            <p>Training stakeholders and first responders to act when every second counts.</p>
          </div>
          <div className="s-marquee"><div className="s-mtrack">
            {picTrack.map((p, i) => {
              const big = (i % pics.length) % 4 === 0
              return (
                <div className={big ? 's-tile big' : 's-tile'} key={i}>
                  <img src={p.image_url} alt={p.caption || ''} />
                  {p.caption && <div className="s-cap">{p.caption}</div>}
                </div>
              )
            })}
          </div></div>
        </div>
      )}

      {/* About */}
      <section className="s-about">
        <div className="s-wrap s-about-grid">
          <div>
            <span className="s-eyebrow">Who We Are</span>
            <h2 className="s-h2">A bridge between the victim, the family, and the hospital.</h2>
            <p className="s-lead">Founded on 31 August 1996 and registered with the Corporate Affairs Commission (CAC), Abuja, SAVAN is a not-for-profit, lifesaving NGO. Our mandate is to increase the survival chances of road-traffic accident victims and other critical emergencies — especially in the crucial moments before a biological relative arrives — in collaboration with hospitals designated as SAVAN centres.</p>
            <p className="s-lead" style={{ marginTop: '1rem' }}>We act as a bridge between the victim, their family, and the admitting hospital, while equipping stakeholders and first responders with the skills to save lives. SAVAN is affiliated to the World Association for Disaster and Emergency Medicine (WADEM), USA.</p>
          </div>
          <div className="s-facts">
            <div className="s-row"><span>Founded</span><b>31 August 1996</b></div>
            <div className="s-row"><span>Status</span><b>Not-for-profit NGO</b></div>
            <div className="s-row"><span>Registration</span><b>CAC, Abuja</b></div>
            <div className="s-row"><span>1st SAVAN Centre</span><b>A&amp;E Unit, UBTH</b></div>
            <div className="s-row"><span>Affiliation</span><b>WADEM, USA</b></div>
          </div>
        </div>
      </section>

      {/* What we do */}
      <section>
        <div className="s-wrap">
          <span className="s-eyebrow">What We Do</span>
          <h2 className="s-h2">Training that turns bystanders into first responders.</h2>
          <p className="s-lead">Our two-day intensive programme runs 9 a.m.–4 p.m.: day one covers the theory of first aid, cardiac arrest and critical emergencies; day two is hands-on technique and practical pre-hospital care.</p>
          <div className="s-grid">
            <div className="s-card"><div className="s-ic">❤</div><h3>Basic Life Support</h3><p>CPR and life-saving response for cardiac arrest and collapse, to internationally recognised standards.</p></div>
            <div className="s-card"><div className="s-ic">⚡</div><h3>AED Defibrillation</h3><p>Confident, correct use of Automated External Defibrillators in the critical first minutes.</p></div>
            <div className="s-card"><div className="s-ic">＋</div><h3>Anti-Choking &amp; First Aid</h3><p>Practical airway and first-aid skills for homes, schools and workplaces.</p></div>
            <div className="s-card"><div className="s-ic">✚</div><h3>Pre-Hospital Care</h3><p>Stabilising victims at the scene and en route, bridging the gap to hospital admission.</p></div>
          </div>
        </div>
      </section>

      {/* Partners ticker */}
      <div className="s-partners">
        <div className="s-wrap"><div className="s-lbl">Trusted by institutions in Nigeria &amp; beyond</div></div>
        <div className="s-marquee"><div className="s-ptrack">
          {orgTrack.map((o, i) => (
            <div className="s-org" key={i}>
              {o.logo
                ? <span className="s-mono logo"><img src={o.logo} alt={o.name} /></span>
                : <span className="s-mono">{o.mono}</span>}
              <span className="s-oname">{o.name}</span>
            </div>
          ))}
        </div></div>
      </div>

      {/* News (from CMS) */}
      {news.length > 0 && (
        <section>
          <div className="s-wrap">
            <span className="s-eyebrow">News &amp; Stories</span>
            <h2 className="s-h2">Latest from SAVAN.</h2>
            <div className="s-news">
              {news.map(p => (
                <Link href={`/blog/${p.slug}`} key={p.id} className="s-post">
                  {p.cover_url
                    ? <img className="s-cover" src={p.cover_url} alt="" />
                    : <div className="s-cover" />}
                  <div className="s-body">
                    <div className="s-date">{fmt(p.published_at)}</div>
                    <h3>{p.title}</h3>
                    {p.excerpt && <p>{p.excerpt}</p>}
                  </div>
                </Link>
              ))}
            </div>
            <Link href="/blog" className="s-more">All news &amp; stories →</Link>
          </div>
        </section>
      )}

      {/* CTA band */}
      <section>
        <div className="s-wrap">
          <div className="s-band">
            <div>
              <h2>Hold a SAVAN certificate?</h2>
              <p>Verify its authenticity, or sign in to access your training record and download your certificate.</p>
            </div>
            <a className="s-btn" style={{ background: '#fff', color: '#000066' }} href={PORTAL}>Go to the Portal →</a>
          </div>
        </div>
      </section>
    </>
  )
}
