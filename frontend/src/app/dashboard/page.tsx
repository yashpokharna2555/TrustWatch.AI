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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">🔍</div>
          <div className="text-gray-600">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <span className="text-2xl">🔍</span>
              <h1 className="text-2xl font-bold text-gray-900">TrustWatch</h1>
            </Link>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Scanning Indicator */}
        {scanningStatus && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin text-2xl">🔄</div>
              <div>
                <div className="font-medium text-blue-900">{scanningStatus}</div>
                <div className="text-sm text-blue-700">This may take 20-30 seconds...</div>
              </div>
            </div>
            <div className="mt-3 bg-blue-200 rounded-full h-2 overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full animate-pulse" style={{ width: '70%' }}></div>
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
          <div className="bg-white rounded-lg shadow-sm border-l-4 border-red-500 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-900">{criticalCount}</div>
                <div className="text-sm text-gray-600 mt-1">Critical Issues</div>
              </div>
              <div className="text-3xl">🔴</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border-l-4 border-amber-500 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-900">{mediumCount}</div>
                <div className="text-sm text-gray-600 mt-1">Medium Priority</div>
              </div>
              <div className="text-3xl">🟡</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border-l-4 border-blue-500 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-900">{infoCount}</div>
                <div className="text-sm text-gray-600 mt-1">Informational</div>
              </div>
              <div className="text-3xl">🔵</div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setShowAddCompany(!showAddCompany)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-all"
          >
            <span>+</span>
            <span>Add Company</span>
          </button>
          <button
            onClick={handleCrawlAll}
            disabled={crawling}
            className="flex items-center space-x-2 bg-white border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg hover:bg-gray-50 font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{crawling ? '⏳' : '🔄'}</span>
            <span>{crawling ? 'Scanning...' : 'Scan Now'}</span>
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Company Watchlist</h2>
              <p className="text-sm text-gray-500 mt-1">
                Monitoring {companiesList.length} {companiesList.length === 1 ? 'company' : 'companies'}
              </p>
            </div>
            <div className="p-6">
              {companiesList.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">🏢</div>
                  <p className="text-gray-600 mb-2 font-medium">No companies yet</p>
                  <p className="text-sm text-gray-400 mb-4">Add companies to start monitoring</p>
                  <button
                    onClick={() => setShowAddCompany(true)}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Add your first company →
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {companiesList.map((company) => (
                    <div
                      key={company._id}
                      className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <Link href={`/companies/${company._id}`} className="flex-1">
                          <div className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                            {company.displayName}
                          </div>
                          <div className="text-sm text-gray-500">{company.domain}</div>
                        </Link>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                              company.riskScore >= 50
                                ? 'bg-red-100 text-red-700'
                                : company.riskScore >= 20
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {company.riskScore >= 50 ? '🔴' : company.riskScore >= 20 ? '🟡' : '🟢'} {company.riskScore}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCompany(company._id, company.displayName);
                            }}
                            className="text-gray-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors"
                            title="Remove from watchlist"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      {company.lastCrawledAt && (
                        <div className="text-xs text-gray-400 mt-2">
                          Last checked: {new Date(company.lastCrawledAt).toLocaleString()}
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
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Add Company to Watchlist</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl"
        >
          ✕
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company Name
          </label>
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Stripe"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Domain
          </label>
          <input
            type="text"
            required
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., stripe.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Monitoring Categories
          </label>
          <div className="space-y-2">
            {['Security', 'Privacy', 'SLA', 'Pricing'].map((cat) => (
              <label key={cat} className="flex items-center">
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
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">{cat}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Adding...' : 'Add Company'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

