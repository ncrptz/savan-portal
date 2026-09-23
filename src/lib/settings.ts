import { createClient } from '@/lib/supabase/server'

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
    }
  } catch {
    return DEFAULTS
  }
}
