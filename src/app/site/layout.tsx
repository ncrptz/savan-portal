import Link from 'next/link'
import { SAVAN_LOGO } from '@/lib/site-assets'

export const metadata = {
  title: 'SAVAN — Save Accident Victims Association of Nigeria',
  description: 'Save Accident Victims Association of Nigeria (SAVAN) — a not-for-profit NGO improving survival of accident and emergency victims through pre-hospital care and BLS & AED training since 1996.',
}

const PORTAL = 'https://verify.savan-ngo.org'
import Link from 'next/link'
import { SAVAN_LOGO } from '@/lib/site-assets'

export const metadata = {
  title: 'SAVAN — Save Accident Victims Association of Nigeria',
  description: 'Save Accident Victims Association of Nigeria (SAVAN) — a not-for-profit NGO improving survival of accident and emergency victims through pre-hospital care and BLS & AED training since 1996.',
}

const PORTAL = 'https://verify.savan-ngo.org'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="savan-site">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <header className="s-header">
        <div className="s-wrap s-nav">
          <Link href="/" className="s-brand">
            <span className="s-crest"><img src={SAVAN_LOGO} alt="SAVAN logo" /></span>
            <span><b>SAVAN</b><small>Save Accident Victims Association of Nigeria</small></span>
          </Link>
          <nav className="s-links">
            <Link href="/" className="s-tab">Home</Link>
            <Link href="/blog" className="s-tab">News</Link>
            <a className="s-cta" href={PORTAL}>Verify Certificate</a>
          </nav>
        </div>
      </header>

      {children}

      <footer className="s-footer">
        <div className="s-wrap s-foot-grid">
          <div>
            <b>SAVAN</b>
            Save Accident Victims Association of Nigeria — a not-for-profit NGO improving survival of accident and emergency victims through pre-hospital care since 1996. Affiliated to WADEM, USA.
          </div>
          <div>
            <b>Quick Links</b>
            <div><Link href="/">Home</Link></div>
            <div><Link href="/blog">News &amp; Stories</Link></div>
            <div><a href={PORTAL}>Verify a Certificate</a></div>
            <div><a href={PORTAL}>Certificate Portal</a></div>
          </div>
          <div>
            <b>Contact</b>
            <div>1st SAVAN Centre, A&amp;E Unit, UBTH, Ugbowo, Benin City</div>
            <div>9 Upper Lawani Street, Benin City</div>
            <div><a href="mailto:savanngo@yahoo.com">savanngo@yahoo.com</a></div>
            <div><a href="tel:+2348063000003">+234 806 300 0003</a></div>
          </div>
        </div>
        <div className="s-wrap s-copy">© {new Date().getFullYear()} Save Accident Victims Association of Nigeria (SAVAN). All rights reserved.</div>
      </footer>
    </div>
  )
}

const CSS = `
.savan-site{--navy:#000066;--navy2:#0a0a80;--red:#C8102E;--ink:#101322;--muted:#5b6478;--line:#e6e8f0;--bg:#f6f7fb;--card:#fff;
  background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.6}
.savan-site *{box-sizing:border-box}
.savan-site img{display:block}
.savan-site a{color:inherit;text-decoration:none}
.s-wrap{max-width:1080px;margin:0 auto;padding:0 20px}
.s-btn{display:inline-flex;align-items:center;gap:.5rem;font-weight:700;border-radius:999px;padding:.85rem 1.5rem;font-size:1rem;border:2px solid transparent;white-space:nowrap;cursor:pointer}
.s-btn-primary{background:var(--red);color:#fff}
.s-btn-ghost{background:transparent;color:#fff;border-color:rgba(255,255,255,.5)}

.s-header{position:sticky;top:0;z-index:30;background:var(--navy);color:#fff}
.s-nav{display:flex;align-items:center;justify-content:space-between;height:64px;gap:12px}
.s-brand{display:flex;align-items:center;gap:.6rem;min-width:0}
.s-crest{width:42px;height:42px;flex:0 0 auto;background:#fff;border-radius:50%;padding:3px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.s-crest img{width:100%;height:100%;object-fit:contain}
.s-brand b{font-size:1.1rem;line-height:1.05;color:#fff}
.s-brand small{display:block;font-size:.66rem;color:#b9c0ee;font-weight:500}
.s-links{display:flex;align-items:center;gap:1.1rem;font-size:.92rem}
.s-tab{color:#c7cdf0} .s-tab:hover{color:#fff}
.s-cta{background:var(--red);color:#fff;padding:.55rem 1.05rem;border-radius:999px;font-weight:700;font-size:.9rem;white-space:nowrap}
.s-cta:hover{filter:brightness(1.08)}
@media(max-width:520px){.s-brand small{display:none}.s-tab{display:none}}

.s-hero{position:relative;color:#fff;overflow:hidden;background:#000066}
.s-hero .s-bg{position:absolute;inset:0;background-position:center;background-size:cover;transform-origin:center;will-change:transform;animation:s-swell 16s ease-in-out infinite}
@keyframes s-swell{0%{transform:scale(1)}50%{transform:scale(1.08)}100%{transform:scale(1)}}
@media(prefers-reduced-motion:reduce){.s-hero .s-bg{animation:none}}
.s-hero .s-ov{position:absolute;inset:0;background:linear-gradient(105deg,rgba(0,0,80,.95),rgba(0,0,90,.86) 42%,rgba(10,10,120,.55))}
.s-hero .s-ov2{position:absolute;inset:0;background:radial-gradient(700px 320px at 85% 15%,rgba(200,16,46,.32),transparent 70%)}
.s-hero .s-wrap{position:relative;padding:72px 20px 80px}
.s-stats{display:flex;flex-wrap:wrap;gap:2.4rem;margin-top:2.6rem}
.s-stats b{display:block;font-size:1.6rem;font-weight:800;color:#fff}
.s-stats span{font-size:.8rem;color:#b9c0ee}
.s-pill{display:inline-block;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);color:#dfe3ff;font-size:.76rem;font-weight:600;padding:.35rem .8rem;border-radius:999px}
.s-hero h1{font-size:clamp(2rem,6.5vw,3.4rem);line-height:1.08;margin:.9rem 0 .6rem;font-weight:800;letter-spacing:-.02em}
.s-hero p.s-lede{font-size:clamp(1rem,2.4vw,1.18rem);color:#d7dcff;max-width:640px;margin-bottom:1.7rem}
.s-hero-cta{display:flex;flex-wrap:wrap;gap:.75rem}

.s-advert{background:#fff;border-bottom:1px solid var(--line)}
.s-advert .s-wrap{padding:18px 20px}
.s-advert a,.s-advert .s-adimg{display:block}
.s-advert img{width:100%;max-height:200px;object-fit:cover;border-radius:14px}

.s-metro{background:#05053a;padding:30px 0 34px;overflow:hidden}
.s-metro h2{color:#fff;font-size:1.1rem;margin:0 0 3px}
.s-metro .s-wrap p{color:#9aa2e0;font-size:.9rem;margin-bottom:18px}
.s-marquee{position:relative;width:100%;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 3%,#000 97%,transparent);mask-image:linear-gradient(90deg,transparent,#000 3%,#000 97%,transparent)}
.s-mtrack{display:grid;grid-auto-flow:column dense;grid-template-rows:repeat(2,160px);grid-auto-columns:160px;gap:10px;width:max-content;animation:s-scroll 70s linear infinite}
.s-metro:hover .s-mtrack{animation-play-state:paused}
.s-tile{position:relative;overflow:hidden;border-radius:4px;background:#0a0a80}
.s-tile.big{grid-row:span 2;grid-column:span 2}
.s-tile img{width:100%;height:100%;object-fit:cover}
.s-tile .s-cap{position:absolute;left:0;right:0;bottom:0;background:linear-gradient(transparent,rgba(0,0,60,.92));color:#fff;padding:26px 12px 10px;font-size:.82rem;font-weight:600;line-height:1.3}
@keyframes s-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}

.savan-site section{padding:56px 0}
.s-eyebrow{color:var(--red);font-weight:700;font-size:.8rem;letter-spacing:.08em;text-transform:uppercase}
.s-h2{font-size:clamp(1.5rem,4vw,2.1rem);line-height:1.15;margin:.4rem 0 .8rem;letter-spacing:-.01em}
.s-lead{color:var(--muted);max-width:720px;font-size:1.05rem}

.s-about{background:#fff;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.s-about-grid{display:grid;grid-template-columns:1fr;gap:28px}
@media(min-width:860px){.s-about-grid{grid-template-columns:1.15fr .85fr}}
.s-facts{background:var(--bg);border:1px solid var(--line);border-radius:16px;padding:24px}
.s-facts .s-row{display:flex;justify-content:space-between;gap:1rem;padding:11px 0;border-bottom:1px dashed var(--line);font-size:.94rem}
.s-facts .s-row:last-child{border-bottom:none}
.s-facts .s-row span{color:var(--muted)} .s-facts .s-row b{text-align:right}

.s-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;margin-top:32px}
.s-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:22px}
.s-card .s-ic{width:44px;height:44px;border-radius:12px;background:#eef0ff;color:var(--navy);display:flex;align-items:center;justify-content:center;margin-bottom:12px;font-size:1.3rem}
.s-card h3{font-size:1.05rem;margin-bottom:.3rem}.s-card p{color:var(--muted);font-size:.93rem}

.s-partners{background:#fff;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:34px 0;overflow:hidden}
.s-partners .s-lbl{text-align:center;color:var(--muted);font-size:.82rem;letter-spacing:.1em;text-transform:uppercase;margin-bottom:20px}
.s-ptrack{display:flex;gap:14px;width:max-content;animation:s-scroll 38s linear infinite}
.s-partners:hover .s-ptrack{animation-play-state:paused}
.s-org{flex:0 0 auto;display:flex;align-items:center;gap:10px;background:var(--bg);border:1px solid var(--line);border-radius:999px;padding:8px 16px 8px 8px}
.s-org .s-mono{width:38px;height:38px;border-radius:50%;background:var(--navy);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.72rem;flex:0 0 auto;overflow:hidden}
.s-org .s-mono.logo{background:#fff;border:1px solid var(--line);padding:3px}
.s-org .s-mono.logo img{width:100%;height:100%;object-fit:contain}
.s-org .s-oname{font-size:.9rem;font-weight:600;color:var(--ink);white-space:nowrap}

.s-news{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;margin-top:32px}
.s-post{background:#fff;border:1px solid var(--line);border-radius:16px;overflow:hidden;display:flex;flex-direction:column}
.s-post .s-cover{width:100%;height:170px;object-fit:cover;background:#eef0ff}
.s-post .s-body{padding:18px}
.s-post h3{font-size:1.1rem;margin-bottom:.4rem;line-height:1.25}
.s-post p{color:var(--muted);font-size:.92rem}
.s-post .s-date{color:var(--red);font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
.s-more{display:inline-block;margin-top:24px;color:var(--navy);font-weight:700}

.s-band{background:linear-gradient(120deg,#C8102E,#8f0b20);color:#fff;border-radius:20px;padding:38px 28px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:18px}
.s-band h2{color:#fff;margin:0;font-size:clamp(1.3rem,3.5vw,1.8rem)}.s-band p{color:#ffe3e7;margin-top:.3rem}

.s-footer{background:#05053f;color:#aab0e0;padding:44px 0 28px;font-size:.92rem}
.s-foot-grid{display:grid;grid-template-columns:1fr;gap:22px}
@media(min-width:760px){.s-foot-grid{grid-template-columns:1.5fr 1fr 1.1fr}}
.s-footer b{color:#fff;display:block;margin-bottom:.5rem}.s-footer a:hover{color:#fff}
.s-copy{border-top:1px solid rgba(255,255,255,.1);margin-top:26px;padding-top:16px;color:#8087c0;font-size:.84rem}

.s-article{max-width:760px;margin:0 auto;padding:44px 20px 60px}
.s-article h1{font-size:clamp(1.8rem,5vw,2.6rem);line-height:1.12;letter-spacing:-.02em;margin:.5rem 0 .8rem}
.s-article .s-cover{width:100%;border-radius:16px;margin:16px 0 28px;object-fit:cover;max-height:420px}
.s-article .s-content{white-space:pre-line;font-size:1.08rem;color:#25304a}
.s-back{color:var(--muted);font-size:.9rem}.s-back:hover{color:var(--navy)}
`
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="savan-site">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <header className="s-header">
        <div className="s-wrap s-nav">
          <Link href="/" className="s-brand">
            <span className="s-crest"><img src={SAVAN_LOGO} alt="SAVAN logo" /></span>
            <span><b>SAVAN</b><small>Save Accident Victims Association of Nigeria</small></span>
          </Link>
          <nav className="s-links">
            <Link href="/" className="s-tab">Home</Link>
            <Link href="/blog" className="s-tab">News</Link>
            <a className="s-cta" href={PORTAL}>Verify Certificate</a>
          </nav>
        </div>
      </header>

      {children}

      <footer className="s-footer">
        <div className="s-wrap s-foot-grid">
          <div>
            <b>SAVAN</b>
            Save Accident Victims Association of Nigeria — a not-for-profit NGO improving survival of accident and emergency victims through pre-hospital care since 1996. Affiliated to WADEM, USA.
          </div>
          <div>
            <b>Quick Links</b>
            <div><Link href="/">Home</Link></div>
            <div><Link href="/blog">News &amp; Stories</Link></div>
            <div><a href={PORTAL}>Verify a Certificate</a></div>
            <div><a href={PORTAL}>Certificate Portal</a></div>
          </div>
          <div>
            <b>Contact</b>
            <div>1st SAVAN Centre, A&amp;E Unit, UBTH, Ugbowo, Benin City</div>
            <div>9 Upper Lawani Street, Benin City</div>
            <div><a href="mailto:savanngo@yahoo.com">savanngo@yahoo.com</a></div>
            <div><a href="tel:+2348063000003">+234 806 300 0003</a></div>
          </div>
        </div>
        <div className="s-wrap s-copy">© {new Date().getFullYear()} Save Accident Victims Association of Nigeria (SAVAN). All rights reserved.</div>
      </footer>
    </div>
  )
}

const CSS = `
.savan-site{--navy:#000066;--navy2:#0a0a80;--red:#C8102E;--ink:#101322;--muted:#5b6478;--line:#e6e8f0;--bg:#f6f7fb;--card:#fff;
  background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.6}
.savan-site *{box-sizing:border-box}
.savan-site img{display:block}
.savan-site a{color:inherit;text-decoration:none}
.s-wrap{max-width:1080px;margin:0 auto;padding:0 20px}
.s-btn{display:inline-flex;align-items:center;gap:.5rem;font-weight:700;border-radius:999px;padding:.85rem 1.5rem;font-size:1rem;border:2px solid transparent;white-space:nowrap;cursor:pointer}
.s-btn-primary{background:var(--red);color:#fff}
.s-btn-ghost{background:transparent;color:#fff;border-color:rgba(255,255,255,.5)}

.s-header{position:sticky;top:0;z-index:30;background:var(--navy);color:#fff}
.s-nav{display:flex;align-items:center;justify-content:space-between;height:64px;gap:12px}
.s-brand{display:flex;align-items:center;gap:.6rem;min-width:0}
.s-crest{width:42px;height:42px;flex:0 0 auto;background:#fff;border-radius:50%;padding:3px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.s-crest img{width:100%;height:100%;object-fit:contain}
.s-brand b{font-size:1.1rem;line-height:1.05;color:#fff}
.s-brand small{display:block;font-size:.66rem;color:#b9c0ee;font-weight:500}
.s-links{display:flex;align-items:center;gap:1.1rem;font-size:.92rem}
.s-tab{color:#c7cdf0} .s-tab:hover{color:#fff}
.s-cta{background:var(--red);color:#fff;padding:.55rem 1.05rem;border-radius:999px;font-weight:700;font-size:.9rem;white-space:nowrap}
.s-cta:hover{filter:brightness(1.08)}
@media(max-width:520px){.s-brand small{display:none}.s-tab{display:none}}

.s-hero{position:relative;color:#fff;overflow:hidden;background:#000066}
.s-hero .s-bg{position:absolute;inset:0;background-position:center;background-size:cover}
.s-hero .s-ov{position:absolute;inset:0;background:linear-gradient(105deg,rgba(0,0,80,.95),rgba(0,0,90,.86) 42%,rgba(10,10,120,.55))}
.s-hero .s-ov2{position:absolute;inset:0;background:radial-gradient(700px 320px at 85% 15%,rgba(200,16,46,.32),transparent 70%)}
.s-hero .s-wrap{position:relative;padding:72px 20px 80px}
.s-stats{display:flex;flex-wrap:wrap;gap:2.4rem;margin-top:2.6rem}
.s-stats b{display:block;font-size:1.6rem;font-weight:800;color:#fff}
.s-stats span{font-size:.8rem;color:#b9c0ee}
.s-pill{display:inline-block;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);color:#dfe3ff;font-size:.76rem;font-weight:600;padding:.35rem .8rem;border-radius:999px}
.s-hero h1{font-size:clamp(2rem,6.5vw,3.4rem);line-height:1.08;margin:.9rem 0 .6rem;font-weight:800;letter-spacing:-.02em}
.s-hero p.s-lede{font-size:clamp(1rem,2.4vw,1.18rem);color:#d7dcff;max-width:640px;margin-bottom:1.7rem}
.s-hero-cta{display:flex;flex-wrap:wrap;gap:.75rem}

.s-advert{background:#fff;border-bottom:1px solid var(--line)}
.s-advert .s-wrap{padding:18px 20px}
.s-advert a,.s-advert .s-adimg{display:block}
.s-advert img{width:100%;max-height:200px;object-fit:cover;border-radius:14px}

.s-metro{background:#05053a;padding:30px 0 34px;overflow:hidden}
.s-metro h2{color:#fff;font-size:1.1rem;margin:0 0 3px}
.s-metro .s-wrap p{color:#9aa2e0;font-size:.9rem;margin-bottom:18px}
.s-marquee{position:relative;width:100%;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 3%,#000 97%,transparent);mask-image:linear-gradient(90deg,transparent,#000 3%,#000 97%,transparent)}
.s-mtrack{display:grid;grid-auto-flow:column dense;grid-template-rows:repeat(2,160px);grid-auto-columns:160px;gap:10px;width:max-content;animation:s-scroll 70s linear infinite}
.s-metro:hover .s-mtrack{animation-play-state:paused}
.s-tile{position:relative;overflow:hidden;border-radius:4px;background:#0a0a80}
.s-tile.big{grid-row:span 2;grid-column:span 2}
.s-tile img{width:100%;height:100%;object-fit:cover}
.s-tile .s-cap{position:absolute;left:0;right:0;bottom:0;background:linear-gradient(transparent,rgba(0,0,60,.92));color:#fff;padding:26px 12px 10px;font-size:.82rem;font-weight:600;line-height:1.3}
@keyframes s-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}

.savan-site section{padding:56px 0}
.s-eyebrow{color:var(--red);font-weight:700;font-size:.8rem;letter-spacing:.08em;text-transform:uppercase}
.s-h2{font-size:clamp(1.5rem,4vw,2.1rem);line-height:1.15;margin:.4rem 0 .8rem;letter-spacing:-.01em}
.s-lead{color:var(--muted);max-width:720px;font-size:1.05rem}

.s-about{background:#fff;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.s-about-grid{display:grid;grid-template-columns:1fr;gap:28px}
@media(min-width:860px){.s-about-grid{grid-template-columns:1.15fr .85fr}}
.s-facts{background:var(--bg);border:1px solid var(--line);border-radius:16px;padding:24px}
.s-facts .s-row{display:flex;justify-content:space-between;gap:1rem;padding:11px 0;border-bottom:1px dashed var(--line);font-size:.94rem}
.s-facts .s-row:last-child{border-bottom:none}
.s-facts .s-row span{color:var(--muted)} .s-facts .s-row b{text-align:right}

.s-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;margin-top:32px}
.s-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:22px}
.s-card .s-ic{width:44px;height:44px;border-radius:12px;background:#eef0ff;color:var(--navy);display:flex;align-items:center;justify-content:center;margin-bottom:12px;font-size:1.3rem}
.s-card h3{font-size:1.05rem;margin-bottom:.3rem}.s-card p{color:var(--muted);font-size:.93rem}

.s-partners{background:#fff;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:34px 0;overflow:hidden}
.s-partners .s-lbl{text-align:center;color:var(--muted);font-size:.82rem;letter-spacing:.1em;text-transform:uppercase;margin-bottom:20px}
.s-ptrack{display:flex;gap:14px;width:max-content;animation:s-scroll 38s linear infinite}
.s-partners:hover .s-ptrack{animation-play-state:paused}
.s-org{flex:0 0 auto;display:flex;align-items:center;gap:10px;background:var(--bg);border:1px solid var(--line);border-radius:999px;padding:8px 16px 8px 8px}
.s-org .s-mono{width:38px;height:38px;border-radius:50%;background:var(--navy);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.72rem;flex:0 0 auto;overflow:hidden}
.s-org .s-mono.logo{background:#fff;border:1px solid var(--line);padding:3px}
.s-org .s-mono.logo img{width:100%;height:100%;object-fit:contain}
.s-org .s-oname{font-size:.9rem;font-weight:600;color:var(--ink);white-space:nowrap}

.s-news{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;margin-top:32px}
.s-post{background:#fff;border:1px solid var(--line);border-radius:16px;overflow:hidden;display:flex;flex-direction:column}
.s-post .s-cover{width:100%;height:170px;object-fit:cover;background:#eef0ff}
.s-post .s-body{padding:18px}
.s-post h3{font-size:1.1rem;margin-bottom:.4rem;line-height:1.25}
.s-post p{color:var(--muted);font-size:.92rem}
.s-post .s-date{color:var(--red);font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
.s-more{display:inline-block;margin-top:24px;color:var(--navy);font-weight:700}

.s-band{background:linear-gradient(120deg,#C8102E,#8f0b20);color:#fff;border-radius:20px;padding:38px 28px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:18px}
.s-band h2{color:#fff;margin:0;font-size:clamp(1.3rem,3.5vw,1.8rem)}.s-band p{color:#ffe3e7;margin-top:.3rem}

.s-footer{background:#05053f;color:#aab0e0;padding:44px 0 28px;font-size:.92rem}
.s-foot-grid{display:grid;grid-template-columns:1fr;gap:22px}
@media(min-width:760px){.s-foot-grid{grid-template-columns:1.5fr 1fr 1.1fr}}
.s-footer b{color:#fff;display:block;margin-bottom:.5rem}.s-footer a:hover{color:#fff}
.s-copy{border-top:1px solid rgba(255,255,255,.1);margin-top:26px;padding-top:16px;color:#8087c0;font-size:.84rem}

.s-article{max-width:760px;margin:0 auto;padding:44px 20px 60px}
.s-article h1{font-size:clamp(1.8rem,5vw,2.6rem);line-height:1.12;letter-spacing:-.02em;margin:.5rem 0 .8rem}
.s-article .s-cover{width:100%;border-radius:16px;margin:16px 0 28px;object-fit:cover;max-height:420px}
.s-article .s-content{white-space:pre-line;font-size:1.08rem;color:#25304a}
.s-back{color:var(--muted);font-size:.9rem}.s-back:hover{color:var(--navy)}
`
