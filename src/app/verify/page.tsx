'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, CheckCircle, XCircle, Shield } from 'lucide-react'
import { Certificate } from '@/types'

function VerifyContent() {
  const params = useSearchParams()
  const [query, setQuery]       = useState(params.get('q') || '')
  const [result, setResult]     = useState<Certificate | null | 'not_found'>(null)
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    if (params.get('q')) handleSearch(params.get('q')!)
  }, [])

  async function handleSearch(q = query) {
    if (!q.trim()) return
    setLoading(true); setResult(null)
    const res  = await fetch(`/api/verify?q=${encodeURIComponent(q.trim())}`)
    const data = await res.json()
    setResult(data.certificate || 'not_found')
    setLoading(false)
  }

  const cert = result && result !== 'not_found' ? result as Certificate : null
  const valid = cert && !cert.revoked

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-[#000066] text-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6" />
            <span className="font-bold">SAVAN</span>
          </Link>
          <Link href="/auth/login" className="text-sm text-blue-200 hover:text-white">Admin Login</Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-[#000066] text-center mb-2">
          Certificate Verification
        </h1>
        <p className="text-gray-500 text-center mb-8">
          Enter a certificate ID or recipient name to verify authenticity
        </p>

        {/* Search */}
        <div className="flex gap-2 mb-8">
          <input value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="input flex-1 text-base py-3"
            placeholder="SAVAN/BLSAED/2026/061/001 or Onyinye Love Egwuatu" />
          <button onClick={() => handleSearch()} disabled={loading}
            className="btn-primary px-6 py-3 flex items-center gap-2">
            <Search className="w-4 h-4" />
            {loading ? 'Searching…' : 'Verify'}
          </button>
        </div>

        {/* Result */}
        {result === 'not_found' && (
          <div className="card border-red-200 bg-red-50">
            <div className="flex items-start gap-4">
              <XCircle className="w-8 h-8 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-red-800">Certificate Not Found</h2>
                <p className="text-red-700 text-sm mt-1">
                  No certificate matching <strong>"{query}"</strong> was found in our database.
                  Please check the certificate ID or recipient name and try again.
                </p>
              </div>
            </div>
          </div>
        )}

        {cert && cert.revoked && (
          <div className="card border-red-200 bg-red-50">
            <div className="flex items-start gap-4">
              <XCircle className="w-8 h-8 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-red-800">Certificate Revoked</h2>
                <p className="text-red-700 text-sm mt-1">
                  This certificate has been revoked and is no longer valid.
                </p>
                {cert.revoked_reason && (
                  <p className="text-red-600 text-sm mt-1">Reason: {cert.revoked_reason}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {valid && (
          <div className="card border-green-200 bg-green-50">
            <div className="flex items-start gap-4 mb-6">
              <CheckCircle className="w-10 h-10 text-green-500 flex-shrink-0" />
              <div>
                <h2 className="text-xl font-bold text-green-800">Certificate Verified ✓</h2>
                <p className="text-green-700 text-sm">
                  This is an authentic SAVAN BLS/AED certificate.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 space-y-3 text-sm">
              <Row label="Certificate ID"  value={cert.cert_id} mono />
              <Row label="Recipient Name"  value={cert.trainee_name} />
              <Row label="Date Issued"
                value={new Date(cert.issued_at).toLocaleDateString('en-GB', {
                  day:'numeric', month:'long', year:'numeric'
                })} />
              {cert.event && <>
                <Row label="Training"    value="Basic Life Support & AED" />
                <Row label="Issued By"   value="Save Accident Victims Association of Nigeria (SAVAN)" />
                {cert.event.venue && <Row label="Venue" value={cert.event.venue} />}
              </>}
            </div>

            {cert.pdf_url && (
              <a href={cert.pdf_url} target="_blank" rel="noopener noreferrer"
                className="mt-4 btn-primary inline-flex items-center gap-2">
                Download Certificate PDF
              </a>
            )}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-8">
          SAVAN Certificate Portal · For enquiries contact SAVAN directly
        </p>
      </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-4">
      <span className="text-gray-500 w-36 flex-shrink-0">{label}</span>
      <span className={`font-medium text-gray-900 ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  )
}
