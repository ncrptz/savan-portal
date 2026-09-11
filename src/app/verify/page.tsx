'use client'
import { formatCertDate } from '@/lib/date'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, CheckCircle, XCircle, Shield } from 'lucide-react'

function VerifyContent() {
  const params = useSearchParams()
  const [query, setQuery]   = useState(params.get('q') || '')
  const [status, setStatus] = useState<string | null>(null)
  const [cert, setCert]     = useState<any | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = params.get('token')
    if (token) fetchVerify(`token=${encodeURIComponent(token)}`)
    else if (params.get('q')) handleSearch(params.get('q')!)
  }, [])

  async function fetchVerify(qs: string) {
    setLoading(true); setStatus(null); setCert(null)
    const res  = await fetch(`/api/verify?${qs}`)
    const data = await res.json()
    setStatus(data.status || 'not_found')
    setCert(data.certificate || null)
    setLoading(false)
  }
  function handleSearch(q = query) {
    if (!q.trim()) return
    fetchVerify(`q=${encodeURIComponent(q.trim())}`)
  }

  const valid = status === 'valid'

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
        {status === 'not_found' && (
          <div className="card border-red-200 bg-red-50">
            <div className="flex items-start gap-4">
              <XCircle className="w-8 h-8 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-red-800">Certificate Not Found</h2>
                <p className="text-red-700 text-sm mt-1">
                  No matching certificate was found in our records. Check the ID or link and try again.
                </p>
              </div>
            </div>
          </div>
        )}

        {status === 'tampered' && (
          <div className="card border-red-300 bg-red-50">
            <div className="flex items-start gap-4">
              <XCircle className="w-8 h-8 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-red-800">Verification Failed</h2>
                <p className="text-red-700 text-sm mt-1">
                  This record's details do not match its security signature and cannot be trusted.
                  Please contact SAVAN.
                </p>
              </div>
            </div>
          </div>
        )}

        {status === 'revoked' && cert && (
          <div className="card border-red-200 bg-red-50">
            <div className="flex items-start gap-4">
              <XCircle className="w-8 h-8 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-red-800">Certificate Revoked</h2>
                <p className="text-red-700 text-sm mt-1">
                  Certificate <strong>{cert.cert_id}</strong> (issued to {cert.trainee_name}) has been
                  revoked and is no longer valid.
                </p>
              </div>
            </div>
          </div>
        )}

        {valid && cert && (
          <div className="card border-green-200 bg-green-50">
            <div className="flex items-start gap-4 mb-6">
              <CheckCircle className="w-10 h-10 text-green-500 flex-shrink-0" />
              <div>
                <h2 className="text-xl font-bold text-green-800">Certificate Verified ✓</h2>
                <p className="text-green-700 text-sm">This is an authentic SAVAN BLS/AED certificate.</p>
              </div>
            </div>

            <div className="flex gap-4">
              {cert.photo_url && (
                <img src={cert.photo_url} alt="" referrerPolicy="no-referrer"
                  className="w-24 h-28 object-cover rounded-lg border border-green-200 flex-shrink-0" />
              )}
              <div className="bg-white rounded-lg p-4 space-y-3 text-sm flex-1">
                <Row label="Certificate ID"  value={cert.cert_id} mono />
                <Row label="Recipient Name"  value={cert.trainee_name} />
                <Row label="Date Issued"
                  value={formatCertDate(cert.issued_at)} />
                <Row label="Training"  value="Basic Life Support & AED" />
                <Row label="Issued By" value="Save Accident Victims Association of Nigeria (SAVAN)" />
                {cert.event?.venue && <Row label="Venue" value={cert.event.venue} />}
              </div>
            </div>
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
