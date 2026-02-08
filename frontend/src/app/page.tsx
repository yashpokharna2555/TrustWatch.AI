import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🔍</span>
              <h1 className="text-2xl font-bold text-gray-900">TrustWatch</h1>
            </div>
            <div className="space-x-4">
              <Link
                href="/auth/login"
                className="text-gray-700 hover:text-gray-900 font-medium"
              >
                Login
              </Link>
              <Link
                href="/auth/signup"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            Monitor Vendor Trust Claims
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Track SOC2, privacy policies, and SLA commitments. Get alerted when claims change.
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href="/auth/signup"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-semibold text-lg"
            >
              Get Started
            </Link>
            <Link
              href="/demo"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg hover:bg-gray-50 font-semibold text-lg border-2 border-blue-600"
            >
              View Demo
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="text-3xl mb-4">🔒</div>
            <h3 className="text-xl font-bold mb-2">Track Compliance</h3>
            <p className="text-gray-600">
              Monitor SOC2, ISO 27001, HIPAA, and other compliance certifications automatically.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="text-3xl mb-4">🔔</div>
            <h3 className="text-xl font-bold mb-2">Instant Alerts</h3>
            <p className="text-gray-600">
              Get email notifications when critical trust claims are removed or weakened.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-xl font-bold mb-2">Evidence & Diffs</h3>
            <p className="text-gray-600">
              View side-by-side comparisons with timestamps and source URLs for every change.
            </p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-md">
          <h3 className="text-2xl font-bold mb-4">How It Works</h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="font-semibold">Add Companies to Watch</h4>
                <p className="text-gray-600">
                  Enter vendor domains and select categories: Security, Privacy, SLA, or Pricing.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="font-semibold">Automatic Monitoring</h4>
                <p className="text-gray-600">
                  TrustWatch crawls trust pages and extracts structured claims every 6 hours.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="font-semibold">Get Alerted to Changes</h4>
                <p className="text-gray-600">
                  Receive instant email alerts for critical changes with proof and recommendations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-gray-600">
          <p>Built with Firecrawl, MongoDB Atlas, Resend, and Reducto</p>
        </div>
      </footer>
    </div>
  );
}
