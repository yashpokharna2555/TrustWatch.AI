'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, companies, events, crawl } from '@/lib/api';
import MonitoringStatusCard from '@/components/MonitoringStatusCard';
import RecentActivityFeed from '@/components/RecentActivityFeed';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [companiesList, setCompaniesList] = useState<any[]>([]);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [scanningStatus, setScanningStatus] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userRes, companiesRes, eventsRes] = await Promise.all([
        auth.me(),
        companies.list(),
        events.list(),
      ]);

      setUser(userRes.user);
      setCompaniesList(companiesRes.companies);
      setEventsList(eventsRes.events);
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push('/auth/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await auth.logout();
    router.push('/');
  };

  const handleCrawlAll = async () => {
    try {
      setCrawling(true);
      setScanningStatus('Starting scan...');
      await crawl.run();
      
      // Show scanning status
      setScanningStatus('Scanning in progress...');
      
      // Poll for completion - check every 3 seconds
      let attempts = 0;
      const maxAttempts = 20; // 60 seconds max
      
      const pollInterval = setInterval(() => {
        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setScanningStatus('Scan completed');
          setTimeout(() => {
            loadData();
            setCrawling(false);
            setScanningStatus(null);
          }, 2000);
        }
      }, 3000);
      
      // Auto-complete after 30 seconds regardless
      setTimeout(() => {
        clearInterval(pollInterval);
        setScanningStatus('Scan completed');
        setTimeout(() => {
          loadData();
          setCrawling(false);
          setScanningStatus(null);
        }, 2000);
      }, 30000);
    } catch (err) {
      alert('Failed to start monitoring scan');
      setCrawling(false);
      setScanningStatus(null);
    }
  };

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    if (!window.confirm(`Remove ${companyName} from your watchlist?`)) {
      return;
    }
    try {
      await companies.delete(companyId);
      loadData();
    } catch (err) {
      alert('Failed to remove company');
    }
  };

  const criticalCount = eventsList.filter(e => e.severity === 'Critical').length;
  const mediumCount = eventsList.filter(e => e.severity === 'Medium').length;
  const infoCount = eventsList.filter(e => e.severity === 'Info').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-4 rounded-2xl shadow-lg inline-block mb-4 animate-pulse">
            <span className="text-4xl">🔍</span>
          </div>
          <div className="text-gray-700 font-semibold text-lg">Loading your dashboard...</div>
          <div className="mt-3 flex justify-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-75"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-150"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      {/* Header */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/dashboard" className="flex items-center space-x-3 group">
              <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-2 rounded-xl shadow-lg group-hover:shadow-blue-500/40 transition-all">
                <span className="text-2xl">🔍</span>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">TrustWatch</h1>
            </Link>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-lg border border-gray-200">
                {user?.email}
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 font-medium border border-gray-200 transition-all hover:border-gray-300"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Scanning Indicator */}
        {scanningStatus && (
          <div className="mb-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg shadow-blue-500/30 border border-blue-400">
            <div className="flex items-center space-x-4">
              <div className="animate-spin text-3xl">🔄</div>
              <div className="flex-1">
                <div className="font-bold text-lg mb-1">{scanningStatus}</div>
                <div className="text-blue-100">AI agents are crawling pages and analyzing claims...</div>
              </div>
            </div>
            <div className="mt-4 bg-blue-400/30 rounded-full h-3 overflow-hidden backdrop-blur-sm">
              <div className="bg-white h-full rounded-full animate-pulse shadow-lg" style={{ width: '70%' }}></div>
            </div>
          </div>
        )}

        {/* Monitoring Status Card */}
        <div className="mb-6">
          <MonitoringStatusCard 
            companies={companiesList} 
            events={eventsList}
            onRefresh={loadData}
          />
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-white to-red-50 rounded-2xl shadow-lg border-l-4 border-red-500 p-6 hover:shadow-xl transition-all transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-gray-900">{criticalCount}</div>
                <div className="text-sm font-medium text-gray-600 mt-1">Critical Issues</div>
                <div className="text-xs text-red-600 mt-1">Requires immediate attention</div>
              </div>
              <div className="text-5xl opacity-80">🔴</div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-white to-amber-50 rounded-2xl shadow-lg border-l-4 border-amber-500 p-6 hover:shadow-xl transition-all transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-gray-900">{mediumCount}</div>
                <div className="text-sm font-medium text-gray-600 mt-1">Medium Priority</div>
                <div className="text-xs text-amber-600 mt-1">Review within 24 hours</div>
              </div>
              <div className="text-5xl opacity-80">🟡</div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-lg border-l-4 border-blue-500 p-6 hover:shadow-xl transition-all transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-gray-900">{infoCount}</div>
                <div className="text-sm font-medium text-gray-600 mt-1">Informational</div>
                <div className="text-xs text-blue-600 mt-1">Good to know</div>
              </div>
              <div className="text-5xl opacity-80">🔵</div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setShowAddCompany(!showAddCompany)}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 font-semibold shadow-lg shadow-blue-500/30 transition-all transform hover:scale-105 hover:shadow-xl"
          >
            <span className="text-xl">+</span>
            <span>Add Company</span>
          </button>
          <button
            onClick={handleCrawlAll}
            disabled={crawling}
            className="flex items-center space-x-2 bg-white border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-50 hover:border-gray-400 font-semibold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transform hover:scale-105 disabled:transform-none"
          >
            <span className="text-xl">{crawling ? '⏳' : '🔄'}</span>
            <span>{crawling ? 'Scanning...' : 'Scan All Now'}</span>
          </button>
        </div>

        {/* Add Company Form */}
        {showAddCompany && (
          <AddCompanyForm
            onClose={() => setShowAddCompany(false)}
            onAdded={() => {
              setShowAddCompany(false);
              loadData();
            }}
          />
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Company Watchlist */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50">
            <div className="p-6 border-b border-gray-200/50 bg-gradient-to-r from-blue-50 to-transparent">
              <h2 className="text-xl font-bold text-gray-900">Company Watchlist</h2>
              <p className="text-sm text-gray-600 mt-1">
                Monitoring {companiesList.length} {companiesList.length === 1 ? 'company' : 'companies'} 24/7
              </p>
            </div>
            <div className="p-6">
              {companiesList.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-6 rounded-2xl inline-block mb-4">
                    <div className="text-5xl">🏢</div>
                  </div>
                  <p className="text-gray-700 mb-2 font-semibold text-lg">No companies yet</p>
                  <p className="text-sm text-gray-500 mb-6">Start monitoring vendor trust claims</p>
                  <button
                    onClick={() => setShowAddCompany(true)}
                    className="text-blue-600 hover:text-blue-700 font-semibold bg-blue-50 hover:bg-blue-100 px-6 py-3 rounded-xl transition-all border border-blue-200"
                  >
                    Add your first company →
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {companiesList.map((company) => (
                    <div
                      key={company._id}
                      className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-400 transition-all bg-gradient-to-r from-white to-gray-50 hover:shadow-md group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <Link href={`/companies/${company._id}`} className="flex-1">
                          <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-lg">
                            {company.displayName}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center space-x-1">
                            <span>🌐</span>
                            <span>{company.domain}</span>
                          </div>
                        </Link>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-xs px-3 py-1.5 rounded-full font-bold shadow-sm ${
                              company.riskScore >= 50
                                ? 'bg-red-100 text-red-700 border border-red-300'
                                : company.riskScore >= 20
                                ? 'bg-amber-100 text-amber-700 border border-amber-300'
                                : 'bg-green-100 text-green-700 border border-green-300'
                            }`}
                          >
                            {company.riskScore >= 50 ? '🔴' : company.riskScore >= 20 ? '🟡' : '🟢'} {company.riskScore}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCompany(company._id, company.displayName);
                            }}
                            className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-all border border-transparent hover:border-red-200"
                            title="Remove from watchlist"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      {company.lastCrawledAt && (
                        <div className="text-xs text-gray-500 mt-2 inline-flex items-center space-x-1 bg-gray-100 px-2 py-1 rounded">
                          <span>🕐</span>
                          <span>Last checked: {new Date(company.lastCrawledAt).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <RecentActivityFeed events={eventsList} limit={6} />
        </div>
      </main>
    </div>
  );
}

// Add Company Form Component
function AddCompanyForm({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [domain, setDomain] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [categories, setCategories] = useState<string[]>(['Security']);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await companies.create({ domain, displayName, categories });
      onAdded();
    } catch (err) {
      alert('Failed to add company');
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-2xl border-2 border-blue-200 p-8 mb-6 animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">Add Company to Watchlist</h3>
          <p className="text-sm text-gray-600">Start monitoring vendor trust claims automatically</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-2xl hover:bg-gray-100 rounded-lg w-10 h-10 flex items-center justify-center transition-all"
        >
          ✕
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Company Name
          </label>
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="e.g., Stripe, Slack, MongoDB"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Domain
          </label>
          <input
            type="text"
            required
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="e.g., stripe.com, slack.com"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-3">
            Monitoring Categories
          </label>
          <div className="grid grid-cols-2 gap-3">
            {['Security', 'Privacy', 'SLA', 'Pricing'].map((cat) => (
              <label key={cat} className="flex items-center bg-white p-3 rounded-xl border-2 border-gray-300 cursor-pointer hover:border-blue-400 transition-all has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                <input
                  type="checkbox"
                  checked={categories.includes(cat)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setCategories([...categories, cat]);
                    } else {
                      setCategories(categories.filter((c) => c !== cat));
                    }
                  }}
                  className="w-5 h-5 mr-3 text-blue-600 rounded"
                />
                <span className="font-semibold text-gray-700">{cat}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex space-x-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 font-bold shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 disabled:transform-none"
          >
            {submitting ? (
              <span className="flex items-center justify-center space-x-2">
                <span className="animate-spin">⏳</span>
                <span>Adding...</span>
              </span>
            ) : (
              '✓ Add Company'
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 font-bold transition-all"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

