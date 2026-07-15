// ── User & Auth ──────────────────────────────────────────────────────────────
export type UserRole = 'superadmin' | 'admin1' | 'admin2' | 'trainee' | 'organisation'

export interface Profile {
  id: string
  user_id: string
  role: UserRole
  full_name: string
  email: string
  phone?: string
  org_id?: string
  created_at: string
}

// ── Organisation ─────────────────────────────────────────────────────────────
export interface Organisation {
  id: string
  name: string
  logo_url?: string
  contact_email: string
  contact_phone?: string
  status: 'pending' | 'approved' | 'suspended'
  created_at: string
}

// ── Training Event ────────────────────────────────────────────────────────────
export type TemplateType = 'T1' | 'T2'

export interface TrainingEvent {
  id: string
  title: string
  event_serial: number      // 200+, auto-assigned
  year: number
  month: number             // 1-12
  session_in_month: number  // 1-9 (training session number within that month)
  training_date: string     // YYYY-MM-DD
  venue: string
  template_type: TemplateType
  // T1 optional
  sponsored_by?: string
  // T2 fields
  collab_org_id?: string
  collab_signer_name?: string
  collab_signer_title?: string
  collab_sig_url?: string
  // status
  status: 'draft' | 'active' | 'completed'
  participant_count: number
  created_by: string
  created_at: string
  // joins
  organisation?: Organisation
}

// ── Participant / Trainee ─────────────────────────────────────────────────────
export interface Trainee {
  id: string
  user_id?: string
  full_name: string
  email: string
  phone?: string
  org_id?: string
  created_at: string
}

// ── Certificate ───────────────────────────────────────────────────────────────
export interface Certificate {
  id: string
  cert_id: string           // SAVAN/BLSAED/YYYY/MMS/NNN
  event_id: string
  trainee_id: string
  trainee_name: string
  photo_url?: string
  issued_at: string
  pdf_url?: string
  revoked: boolean
  revoked_reason?: string
  // joins
  event?: TrainingEvent
  trainee?: Trainee
}

// ── Bulk Upload ───────────────────────────────────────────────────────────────
export interface BulkParticipant {
  name: string
  date?: string             // YYYY-MM-DD, defaults to training_date
  photo?: string            // filename reference
  email?: string
  phone?: string
}

// ── Certificate Form (single generation) ──────────────────────────────────────
export interface CertificateFormData {
  // Recipient
  name: string
  date: string
  photo?: File

  // Batch numbering
  year: number
  month: number
  session_in_month: number
  participant_serial: number

  // Template
  template_type: TemplateType

  // T1 optional
  sponsored_by?: string

  // T2
  collab_logo?: File
  collab_signer_name?: string
  collab_signer_title?: string
  collab_sig_image?: File   // optional even in T2
}

// ── Virtual Course ─────────────────────────────────────────────────────────────
export interface VirtualCourse {
  id: string
  title: string
  description: string
  content_url: string
  price: number             // in kobo (Paystack)
  duration_minutes: number
  status: 'draft' | 'published'
  created_at: string
}

export interface Enrollment {
  id: string
  trainee_id: string
  course_id: string
  paid: boolean
  payment_ref?: string
  passed: boolean
  score?: number
  cert_id?: string
  enrolled_at: string
  completed_at?: string
}
