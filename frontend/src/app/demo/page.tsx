'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

export default function DemoPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [companyId, setCompanyId] = useState('');

  const handleSeed = async () => {
    try {
      setLoading(true);
      setMessage('Seeding demo data...');
      const response = await api.post('/demo/seed');
      setMessage(`✅ Demo data seeded! Company ID: ${response.data.company.id}`);
      setCompanyId(response.data.company.id);
    } catch (error: any) {
      setMessage(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRun = async () => {
    try {
      setLoading(true);
      setMessage('Running demo crawl (v1 baseline → v2 with risks)...');
      await api.post('/demo/run');
      setMessage('✅ Demo complete! Check dashboard for critical events.');
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (error: any) {
      setMessage(`❌ Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎬 TrustWatch Demo
          </h1>
          <p className="text-lg text-gray-600">
            Demonstrate critical security risk detection
          </p>
        </div>

        {/* Demo Steps */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Step 1: Seed */}
          <div className="border-b pb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Step 1: Seed Demo Data
            </h2>
            <p className="text-gray-600 mb-4">
              Creates demo company "Acme Corp" with baseline security page
            </p>
            <button
              onClick={handleSeed}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? 'Creating...' : '🌱 Seed Demo Data'}
            </button>
          </div>

          {/* Step 2: Run Demo */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Step 2: Simulate Vendor Changes
            </h2>
            <p className="text-gray-600 mb-4">
              Crawls baseline (v1), then risky version (v2) to trigger alerts:
            </p>
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <ul className="space-y-2 text-sm">
                <li>🔴 <strong>SOC2 compliance removed</strong> (Critical)</li>
                <li>🔴 <strong>Privacy weakened:</strong> "do not sell" → "may share data" (Critical)</li>
                <li>🟡 <strong>Uptime decreased:</strong> 99.99% → 99.9% (Medium)</li>
              </ul>
            </div>
            <button
              onClick={handleRun}
              disabled={loading || !message.includes('seeded')}
              className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {loading ? 'Running...' : '🚨 Run Demo & Show Risks'}
            </button>
          </div>

          {/* Status Message */}
          {message && (
            <div className={`mt-6 p-4 rounded-lg ${
              message.includes('❌') 
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-green-50 text-green-800 border border-green-200'
            }`}>
              <p className="font-medium">{message}</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6">
          <h3 className="font-bold text-blue-900 mb-3">📋 Demo Script:</h3>
          <ol className="space-y-2 text-sm text-blue-800">
            <li><strong>1.</strong> Click "Seed Demo Data" first</li>
            <li><strong>2.</strong> Wait for success message</li>
            <li><strong>3.</strong> Click "Run Demo & Show Risks"</li>
            <li><strong>4.</strong> You'll be redirected to dashboard with critical alerts!</li>
            <li><strong>5.</strong> Show judges the Risk Score (80+), Critical Events, and diffs</li>
          </ol>
        </div>

        {/* Back to Dashboard */}
        <div className="mt-6 text-center">
          <a
            href="/dashboard"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
