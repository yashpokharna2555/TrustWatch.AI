'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, companies, events, crawl } from '@/lib/api';
import CrawlProgressFeed from '@/components/CrawlProgressFeed';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [companiesList, setCompaniesList] = useState<any[]>([]);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCompany, setShowAddCompany] = useState(false);

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
      await crawl.run();
      // Reload data after 2 seconds to show new results
      setTimeout(() => loadData(), 2000);
    } catch (err) {
      alert('Failed to start crawl');
    }
  };

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${companyName}"? This will remove all associated data.`)) {
      return;
    }
    try {
      await companies.delete(companyId);
      loadData(); // Reload the list
    } catch (err) {
      alert('Failed to delete company');
    }
  };

  const handleDemoRisks = async () => {
    try {
      setLoading(true);
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/demo/run`, {
        method: 'POST',
        credentials: 'include',
      });
      // Wait 3 seconds for demo to complete, then reload
      setTimeout(() => {
        loadData();
        setLoading(false);
      }, 3000);
    } catch (err) {
      alert('Demo failed. Make sure backend is running.');
      setLoading(false);
    }
  };

  const criticalCount = eventsList.filter(e => e.severity === 'Critical').length;
  const mediumCount = eventsList.filter(e => e.severity === 'Medium').length;
  const infoCount = eventsList.filter(e => e.severity === 'Info').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🔍</span>
              <h1 className="text-2xl font-bold text-gray-900">TrustWatch</h1>
            </div>
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
        {/* Live Progress Feed */}
        <CrawlProgressFeed />

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow-lg p-6 border border-red-200">
            <div className="text-4xl font-bold text-red-600 mb-2">{criticalCount}</div>
            <div className="text-red-700 font-semibold">Critical Issues</div>
            <div className="text-xs text-red-600 mt-1">Requires immediate attention</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg shadow-lg p-6 border border-yellow-200">
            <div className="text-4xl font-bold text-yellow-600 mb-2">{mediumCount}</div>
            <div className="text-yellow-700 font-semibold">Medium Issues</div>
            <div className="text-xs text-yellow-600 mt-1">Review recommended</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-lg p-6 border border-blue-200">
            <div className="text-4xl font-bold text-blue-600 mb-2">{infoCount}</div>
            <div className="text-blue-700 font-semibold">Info</div>
            <div className="text-xs text-blue-600 mt-1">New additions detected</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setShowAddCompany(!showAddCompany)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <span>+</span>
            <span>Add Company</span>
          </button>
          <button
            onClick={handleCrawlAll}
            className="flex items-center space-x-2 bg-gray-700 text-white px-6 py-3 rounded-lg hover:bg-gray-800 font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <span>🔄</span>
            <span>Crawl All Now</span>
          </button>
          <button
            onClick={handleDemoRisks}
            disabled={loading}
            className="flex items-center space-x-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-400 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <span>🎬</span>
            <span>Demo Critical Risks</span>
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

        <div className="grid md:grid-cols-2 gap-8">
          {/* Company Watchlist */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="text-xl font-bold text-gray-800">📊 Company Watchlist</h2>
              <p className="text-sm text-gray-600 mt-1">Monitoring {companiesList.length} {companiesList.length === 1 ? 'company' : 'companies'}</p>
            </div>
            <div className="p-6">
              {companiesList.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🏢</div>
                  <p className="text-gray-500 mb-4 font-medium">No companies added yet</p>
                  <p className="text-sm text-gray-400 mb-4">Start monitoring vendor trust claims</p>
                  <button
                    onClick={() => setShowAddCompany(true)}
                    className="text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center"
                  >
                    Add your first company →
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {companiesList.map((company) => (
                    <div
                      key={company._id}
                      className="p-4 border border-gray-200 rounded-lg hover:shadow-lg transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <Link href={`/companies/${company._id}`} className="flex-1">
                          <div className="font-bold text-gray-900 text-lg hover:text-blue-600">{company.displayName}</div>
                        </Link>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-xs px-3 py-1 rounded-full font-bold ${
                              company.riskScore >= 50
                                ? 'bg-red-100 text-red-700'
                                : company.riskScore >= 20
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            Risk: {company.riskScore}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCompany(company._id, company.displayName);
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors"
                            title="Delete company"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <Link href={`/companies/${company._id}`} className="block">
                        <div className="text-sm text-gray-600 mb-2">{company.domain}</div>
                        <div className="text-xs text-gray-500">
                          Last crawled: {company.lastCrawledAt ? new Date(company.lastCrawledAt).toLocaleString() : 'Never'}
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Changes */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-pink-50">
              <h2 className="text-xl font-bold text-gray-800">🔔 Recent Changes</h2>
              <p className="text-sm text-gray-600 mt-1">Latest {eventsList.length} {eventsList.length === 1 ? 'event' : 'events'}</p>
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              {eventsList.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">✅</div>
                  <p className="text-gray-500 font-medium mb-2">No changes detected yet</p>
                  <p className="text-sm text-gray-400">Add companies and run a crawl to start monitoring</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {eventsList.slice(0, 10).map((event) => (
                    <Link
                      key={event._id}
                      href={`/events/${event._id}`}
                      className="block p-4 border border-gray-200 rounded-lg hover:shadow-lg hover:border-purple-300 transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-bold ${
                            event.severity === 'Critical'
                              ? 'bg-red-100 text-red-700'
                              : event.severity === 'Medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {event.severity}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(event.detectedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-gray-800 mb-1">
                        {event.eventType.replace(/_/g, ' ')}
                      </div>
                      <div className="text-sm text-gray-600 mb-1">{event.claimType}</div>
                      <div className="text-xs text-gray-500 truncate">{event.sourceUrl}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function AddCompanyForm({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [domain, setDomain] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [categories, setCategories] = useState(['security', 'privacy']);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await companies.create({ domain, displayName, categories });
      onAdded();
    } catch (err) {
      alert('Failed to add company');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (cat: string) => {
    if (categories.includes(cat)) {
      setCategories(categories.filter(c => c !== cat));
    } else {
      setCategories([...categories, cat]);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Add Company</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Domain</label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Example Corp"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
          <div className="space-y-2">
            {['security', 'privacy', 'sla', 'pricing'].map((cat) => (
              <label key={cat} className="flex items-center">
                <input
                  type="checkbox"
                  checked={categories.includes(cat)}
                  onChange={() => toggleCategory(cat)}
                  className="mr-2"
                />
                <span className="capitalize">{cat}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add Company'}
        </button>
      </form>
    </div>
  );
}
