import { createClient } from '@/lib/supabase/server'

export interface Feature { icon: string; title: string; desc: string }

export interface SiteSettings {
  site_name: string
  hero_title: string
  hero_subtitle: string
  hero_image_url: string | null
  hero_overlay: number
  logo_url: string | null
  favicon_url: string | null
  footer_text: string
  footer_note: string
  mid_image_url: string | null
  mid_overlay: number
  hero_cta_label: string
  hero_cta_href: string
  offer_title: string
  features: Feature[]
  popup_enabled: boolean
  popup_title: string
  popup_body: string
  popup_image_url: string | null
  popup_cta_label: string
  popup_cta_href: string
  advert_enabled: boolean
  advert_image_url: string | null
  advert_href: string
  advert_alt: string
}

const DEFAULTS: SiteSettings = {
  site_name: 'SAVAN',
  hero_title: 'BLS & AED Certification Portal',
  hero_subtitle: 'Official certificate management and verification platform for Save Accident Victims Association of Nigeria training programmes.',
  hero_image_url: null,
  hero_overlay: 70,
  logo_url: null,
  favicon_url: null,
  footer_text: '© Save Accident Victims Association of Nigeria (SAVAN). All rights reserved.',
  footer_note: 'Portal managed by MedSciEdit',
  mid_image_url: null,
  mid_overlay: 88,
  hero_cta_label: 'Register as Trainee',
  hero_cta_href: '/auth/register',
  offer_title: 'What We Offer',
  features: [
    { icon: 'Award', title: 'Certified Training', desc: 'Basic Life Support and Automated External Defibrillator training by qualified instructors.' },
    { icon: 'CheckCircle', title: 'Instant Verification', desc: 'Third parties can verify the authenticity of any SAVAN certificate instantly online.' },
    { icon: 'Users', title: 'Organisation Training', desc: 'Partner with SAVAN to deliver life-saving training to your staff and community.' },
    { icon: 'BookOpen', title: 'Virtual Learning', desc: 'Online BLS courses with certification — learn at your own pace.' },
    { icon: 'Shield', title: 'Tamper-Proof Certificates', desc: 'Every certificate carries a unique ID stored in our secure database.' },
    { icon: 'Search', title: 'Public Registry', desc: 'Search certified individuals by name or certificate number.' },
  ],
  popup_enabled: false,
  popup_title: 'Upcoming Training',
  popup_body: '',
  popup_image_url: null,
  popup_cta_label: 'Register Now',
  popup_cta_href: '/auth/register',
  advert_enabled: false,
  advert_image_url: null,
  advert_href: '',
  advert_alt: '',
}

// Server-side fetch of the single site_settings row, with safe fallbacks so the
// public site always renders even before the CMS row exists or if the read fails.
export async function getSettings(): Promise<SiteSettings> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('site_settings').select('*').eq('id', true).single()
    if (!data) return DEFAULTS
    return {
      site_name: data.site_name || DEFAULTS.site_name,
      hero_title: data.hero_title || DEFAULTS.hero_title,
      hero_subtitle: data.hero_subtitle || DEFAULTS.hero_subtitle,
      hero_image_url: data.hero_image_url ?? null,
      hero_overlay: typeof data.hero_overlay === 'number' ? data.hero_overlay : DEFAULTS.hero_overlay,
      logo_url: data.logo_url ?? null,
      favicon_url: data.favicon_url ?? null,
      footer_text: data.footer_text || DEFAULTS.footer_text,
      footer_note: data.footer_note || DEFAULTS.footer_note,
      mid_image_url: data.mid_image_url ?? null,
      mid_overlay: typeof data.mid_overlay === 'number' ? data.mid_overlay : DEFAULTS.mid_overlay,
      hero_cta_label: data.hero_cta_label || DEFAULTS.hero_cta_label,
      hero_cta_href: data.hero_cta_href || DEFAULTS.hero_cta_href,
      offer_title: data.offer_title || DEFAULTS.offer_title,
      features: Array.isArray(data.features) && data.features.length ? data.features : DEFAULTS.features,
      popup_enabled: data.popup_enabled === true,
      popup_title: data.popup_title || DEFAULTS.popup_title,
      popup_body: data.popup_body || DEFAULTS.popup_body,
      popup_image_url: data.popup_image_url ?? null,
      popup_cta_label: data.popup_cta_label || DEFAULTS.popup_cta_label,
      popup_cta_href: data.popup_cta_href || DEFAULTS.popup_cta_href,
      advert_enabled: data.advert_enabled === true,
      advert_image_url: data.advert_image_url ?? null,
      advert_href: data.advert_href || '',
      advert_alt: data.advert_alt || '',
    }
  } catch {
    return DEFAULTS
  }
}
