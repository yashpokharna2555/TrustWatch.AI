'use client';

import { useEffect, useState } from 'react';

interface MonitoringStats {
  lastCrawlTime: string | null;
  lastCrawlStatus: 'success' | 'failed' | 'running' | 'idle';
  companiesMonitored: number;
  pagesMonitored: number;
  changesDetected: number;
  criticalIssues: number;
}

interface Props {
  companies: any[];
  events: any[];
  onRefresh?: () => void;
}

export default function MonitoringStatusCard({ companies, events, onRefresh }: Props) {
  const [stats, setStats] = useState<MonitoringStats>({
    lastCrawlTime: null,
    lastCrawlStatus: 'idle',
    companiesMonitored: 0,
    pagesMonitored: 0,
    changesDetected: 0,
    criticalIssues: 0,
  });

  useEffect(() => {
    // Calculate stats from companies and events
    const lastCrawledCompany = companies
      .filter(c => c.lastCrawledAt)
      .sort((a, b) => new Date(b.lastCrawledAt).getTime() - new Date(a.lastCrawledAt).getTime())[0];

    const pagesCount = companies.reduce((sum, c) => {
      // Estimate: each company has ~5-10 pages monitored
      return sum + (c.categoriesEnabled?.length || 1) * 3;
    }, 0);

    // Get events from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentEvents = events.filter(e => new Date(e.detectedAt) > oneDayAgo);
    const criticalEvents = events.filter(e => e.severity === 'Critical');

    setStats({
      lastCrawlTime: lastCrawledCompany?.lastCrawledAt || null,
      lastCrawlStatus: lastCrawledCompany ? 'success' : 'idle',
      companiesMonitored: companies.length,
      pagesMonitored: pagesCount,
      changesDetected: recentEvents.length,
      criticalIssues: criticalEvents.length,
    });
  }, [companies, events]);

  const getStatusDisplay = () => {
    switch (stats.lastCrawlStatus) {
      case 'success':
        return { icon: '✅', text: 'All systems operational', color: 'text-green-600' };
      case 'failed':
        return { icon: '❌', text: 'Last crawl failed', color: 'text-red-600' };
      case 'running':
        return { icon: '🔄', text: 'Monitoring in progress', color: 'text-blue-600' };
      default:
        return { icon: '⏸️', text: 'Idle', color: 'text-gray-600' };
    }
  };

  const status = getStatusDisplay();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">📊</div>
          <h3 className="text-lg font-semibold text-gray-900">Monitoring Status</h3>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh data"
          >
            🔄 Refresh
          </button>
        )}
      </div>

      {/* Status Banner */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{status.icon}</span>
            <div>
              <div className={`font-medium ${status.color}`}>{status.text}</div>
              {stats.lastCrawlTime && (
                <div className="text-sm text-gray-500">
                  Last crawl: {new Date(stats.lastCrawlTime).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
          <div className="text-sm text-blue-700 font-medium mb-1">Companies</div>
          <div className="text-2xl font-bold text-blue-900">{stats.companiesMonitored}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
          <div className="text-sm text-purple-700 font-medium mb-1">Pages Monitored</div>
          <div className="text-2xl font-bold text-purple-900">{stats.pagesMonitored}</div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-lg">
          <div className="text-sm text-amber-700 font-medium mb-1">Changes (24h)</div>
          <div className="text-2xl font-bold text-amber-900">{stats.changesDetected}</div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg">
          <div className="text-sm text-red-700 font-medium mb-1">Critical Issues</div>
          <div className="text-2xl font-bold text-red-900">{stats.criticalIssues}</div>
        </div>
      </div>

      {/* Quick Actions */}
      {stats.companiesMonitored === 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>Get started:</strong> Add companies to your watchlist to begin monitoring their security claims.
          </p>
        </div>
      )}
    </div>
  );
}
