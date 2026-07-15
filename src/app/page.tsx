import Link from 'next/link'
import { Shield, CheckCircle, Users, BookOpen, Search, Award } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="bg-[#000066] text-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-[#000066]" />
            </div>
            <div>
              <div className="font-bold text-lg leading-tight">SAVAN</div>
              <div className="text-xs text-blue-200 leading-tight">Save Accident Victims Association of Nigeria</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/verify" className="text-sm hover:text-blue-200 transition-colors">
              Verify Certificate
            </Link>
            <Link href="/auth/login" className="text-sm bg-white text-[#000066] px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors font-medium">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#000066] to-blue-900 text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">
            BLS & AED Certification Portal
          </h1>
          <p className="text-xl text-blue-200 mb-8 max-w-2xl mx-auto">
            Official certificate management and verification platform for
            Save Accident Victims Association of Nigeria training programmes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/verify" className="bg-white text-[#000066] px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
              Verify a Certificate
            </Link>
            <Link href="/auth/register" className="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors">
              Register as Trainee
            </Link>
          </div>
        </div>
      </section>

      {/* Verify widget */}
      <section className="py-12 px-6 bg-[#FFFFCC]/30">
        <div className="max-w-xl mx-auto">
          <h2 className="text-xl font-bold text-center text-[#000066] mb-6">
            Quick Certificate Verification
          </h2>
          <form action="/verify" method="GET" className="flex gap-2">
            <input
              name="q"
              type="text"
              placeholder="Enter certificate ID or recipient name..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#000066]"
            />
            <button type="submit" className="btn-primary flex items-center gap-2">
              <Search className="w-4 h-4" />
              Verify
            </button>
          </form>
          <p className="text-xs text-gray-500 text-center mt-2">
            Format: SAVAN/BLSAED/YYYY/MMS/NNN
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-[#000066] mb-12">
            What We Offer
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Award className="w-8 h-8 text-[#000066]" />,
                title: "Certified Training",
                desc: "Basic Life Support and Automated External Defibrillator training by qualified instructors."
              },
              {
                icon: <CheckCircle className="w-8 h-8 text-[#000066]" />,
                title: "Instant Verification",
                desc: "Third parties can verify the authenticity of any SAVAN certificate instantly online."
              },
              {
                icon: <Users className="w-8 h-8 text-[#000066]" />,
                title: "Organisation Training",
                desc: "Partner with SAVAN to deliver life-saving training to your staff and community."
              },
              {
                icon: <BookOpen className="w-8 h-8 text-[#000066]" />,
                title: "Virtual Learning",
                desc: "Online BLS courses with certification — learn at your own pace."
              },
              {
                icon: <Shield className="w-8 h-8 text-[#000066]" />,
                title: "Tamper-Proof Certificates",
                desc: "Every certificate carries a unique ID stored in our secure database."
              },
              {
                icon: <Search className="w-8 h-8 text-[#000066]" />,
                title: "Public Registry",
                desc: "Search certified individuals by name or certificate number."
              },
            ].map((f, i) => (
              <div key={i} className="text-center p-6">
                <div className="flex justify-center mb-4">{f.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#000066] text-white py-8 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-blue-200">
            © {new Date().getFullYear()} Save Accident Victims Association of Nigeria (SAVAN).
            All rights reserved.
          </p>
          <p className="text-xs text-blue-300 mt-1">
            Portal managed by MedSciEdit · verify.savan.medscienceeditors.com
          </p>
        </div>
      </footer>
    </div>
  )
}
