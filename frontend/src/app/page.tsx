import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation */}
      <nav className="backdrop-blur-sm bg-white/5 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-2 rounded-lg shadow-lg">
                <span className="text-2xl">🔍</span>
              </div>
              <h1 className="text-2xl font-bold text-white">TrustWatch</h1>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                href="/auth/login"
                className="text-white/90 hover:text-white font-medium px-4 py-2 rounded-lg hover:bg-white/10 transition-all"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2.5 rounded-lg hover:from-blue-600 hover:to-blue-700 font-semibold shadow-lg shadow-blue-500/30 transition-all transform hover:scale-105"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-20">
          <div className="inline-block mb-6 px-4 py-2 bg-blue-500/10 border border-blue-400/20 rounded-full">
            <span className="text-blue-300 text-sm font-semibold">AI-Powered Vendor Trust Monitoring</span>
          </div>
          
          <h2 className="text-6xl font-bold text-white mb-6 leading-tight">
            Never Miss a Critical<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              Compliance Change
            </span>
          </h2>
          
          <p className="text-xl text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed">
            Automatically track SOC2, ISO certifications, privacy policies, and SLA commitments. 
            Get instant alerts when your vendors change their security promises.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
            <Link
              href="/auth/signup"
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-10 py-4 rounded-xl hover:from-blue-600 hover:to-blue-700 font-bold text-lg shadow-2xl shadow-blue-500/40 transition-all transform hover:scale-105 hover:shadow-blue-500/60"
            >
              Start Monitoring Free →
            </Link>
            <Link
              href="/auth/login"
              className="bg-white/10 backdrop-blur-sm text-white px-10 py-4 rounded-xl hover:bg-white/20 font-semibold text-lg border-2 border-white/20 transition-all"
            >
              View Live Demo
            </Link>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-white">24/7</div>
              <div className="text-sm text-slate-400">Monitoring</div>
            </div>
            <div className="w-px bg-white/10"></div>
            <div>
              <div className="text-3xl font-bold text-white">4 AI</div>
              <div className="text-sm text-slate-400">Agents</div>
            </div>
            <div className="w-px bg-white/10"></div>
            <div>
              <div className="text-3xl font-bold text-white">Instant</div>
              <div className="text-sm text-slate-400">Alerts</div>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10 hover:border-blue-400/50 transition-all transform hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20">
            <div className="text-5xl mb-5 flex justify-center">
              <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-4 rounded-2xl shadow-lg">
                🔒
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white">Track Compliance</h3>
            <p className="text-slate-300 leading-relaxed">
              Monitor SOC2, ISO 27001, HIPAA, GDPR, and 20+ other compliance certifications automatically with AI verification.
            </p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10 hover:border-blue-400/50 transition-all transform hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20">
            <div className="text-5xl mb-5 flex justify-center">
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-4 rounded-2xl shadow-lg">
                🔔
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white">Instant Alerts</h3>
            <p className="text-slate-300 leading-relaxed">
              Get real-time email notifications when critical trust claims are removed, weakened, or contradicted.
            </p>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-white/10 hover:border-blue-400/50 transition-all transform hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20">
            <div className="text-5xl mb-5 flex justify-center">
              <div className="bg-gradient-to-br from-purple-400 to-purple-600 p-4 rounded-2xl shadow-lg">
                📊
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-white">AI Verification</h3>
            <p className="text-slate-300 leading-relaxed">
              4-agent AI system extracts claims, matches evidence, and provides confidence scores with complete audit trails.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white/5 backdrop-blur-sm p-10 rounded-3xl border border-white/10 mb-20">
          <h3 className="text-3xl font-bold mb-10 text-center text-white">How It Works</h3>
          <div className="space-y-8">
            <div className="flex items-start space-x-6">
              <div className="bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-2xl w-14 h-14 flex items-center justify-center font-bold text-2xl flex-shrink-0 shadow-lg">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-xl text-white mb-2">Add Companies to Watch</h4>
                <p className="text-slate-300 leading-relaxed">
                  Enter vendor domains and select monitoring categories: Security, Privacy, SLA, or Pricing. 
                  Our AI agents immediately start tracking their trust pages.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-6">
              <div className="bg-gradient-to-br from-purple-400 to-purple-600 text-white rounded-2xl w-14 h-14 flex items-center justify-center font-bold text-2xl flex-shrink-0 shadow-lg">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-xl text-white mb-2">Automatic 24/7 Monitoring</h4>
                <p className="text-slate-300 leading-relaxed">
                  TrustWatch crawls trust pages every 6 hours, extracts structured claims using Claude AI, 
                  and analyzes PDFs for certification details with complete version history.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-6">
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-2xl w-14 h-14 flex items-center justify-center font-bold text-2xl flex-shrink-0 shadow-lg">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-xl text-white mb-2">Get Alerted to Critical Changes</h4>
                <p className="text-slate-300 leading-relaxed">
                  Receive instant email alerts for critical changes with proof, before/after diffs, 
                  and AI-powered recommendations on what action to take.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <div className="text-center mb-20">
          <p className="text-slate-400 mb-4">Powered by industry-leading APIs</p>
          <div className="flex justify-center gap-8 text-slate-500 text-sm font-semibold">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🤖</span>
              <span>Anthropic Claude</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-lg">🕷️</span>
              <span>Firecrawl</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-lg">📄</span>
              <span>Reducto</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-lg">📧</span>
              <span>Resend</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-slate-400">
          <p>© 2026 TrustWatch. Monitor vendor trust claims with confidence.</p>
        </div>
      </footer>
    </div>
  );
}
