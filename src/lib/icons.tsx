import {
  Award, CheckCircle, Users, BookOpen, Shield, Search, Heart, HeartPulse,
  Activity, Zap, Phone, Stethoscope, GraduationCap, Calendar, Building2,
  FileCheck, ClipboardCheck, Globe, Star, LifeBuoy,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Curated icon set available to the homepage feature cards (CMS-selectable).
export const ICONS: Record<string, LucideIcon> = {
  Award, CheckCircle, Users, BookOpen, Shield, Search, Heart, HeartPulse,
  Activity, Zap, Phone, Stethoscope, GraduationCap, Calendar, Building2,
  FileCheck, ClipboardCheck, Globe, Star, LifeBuoy,
}
export const ICON_NAMES = Object.keys(ICONS)

export function iconFor(name: string): LucideIcon {
  return ICONS[name] || Award
}
