'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { events } from '@/lib/api';

export default function EventPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvent();
  }, [params.id]);

  const loadEvent = async () => {
    try {
      const res = await events.get(params.id);
      setEvent(res.event);
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push('/auth/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    try {
      await events.acknowledge(params.id);
      setEvent({ ...event, acknowledged: true });
    } catch (err) {
      alert('Failed to acknowledge event');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Event not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-2">
            <Link href="/dashboard" className="text-2xl">🔍</Link>
            <h1 className="text-2xl font-bold text-gray-900">
              <Link href="/dashboard">TrustWatch</Link>
            </h1>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>

        {/* Event Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  event.severity === 'Critical'
                    ? 'bg-red-100 text-red-700'
                    : event.severity === 'Medium'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {event.severity}
              </span>
            </div>
            {!event.acknowledged && (
              <button
                onClick={handleAcknowledge}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold"
              >
                Acknowledge
              </button>
            )}
          </div>

          <h2 className="text-2xl font-bold mb-4">
            {event.eventType.replace(/_/g, ' ')} - {event.companyId?.displayName}
          </h2>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">Company:</span> {event.companyId?.displayName}
            </div>
            <div>
              <span className="font-semibold">Domain:</span> {event.companyId?.domain}
            </div>
            <div>
              <span className="font-semibold">Claim Type:</span> {event.claimType}
            </div>
            <div>
              <span className="font-semibold">Detected:</span>{' '}
              {new Date(event.detectedAt).toLocaleString()}
            </div>
          </div>

          <div className="mt-4">
            <span className="font-semibold">Source:</span>{' '}
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {event.sourceUrl}
            </a>
          </div>
        </div>

        {/* Diff View */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">Change Details</h3>

          {event.oldSnippet && (
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">❌</span>
                <span className="font-semibold text-red-700">Previous Version</span>
              </div>
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="text-gray-800">{event.oldSnippet}</p>
              </div>
            </div>
          )}

          {event.newSnippet && (
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">✅</span>
                <span className="font-semibold text-green-700">Current Version</span>
              </div>
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                <p className="text-gray-800">{event.newSnippet}</p>
              </div>
            </div>
          )}

          {!event.newSnippet && event.oldSnippet && (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
              <p className="font-semibold text-yellow-800">
                ⚠️ This claim has been completely removed from the page
              </p>
            </div>
          )}
        </div>

        {/* Recommended Action */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-yellow-900 mb-2">Recommended Action</h3>
          <p className="text-yellow-800">{getRecommendedAction(event)}</p>
        </div>
      </main>
    </div>
  );
}

function getRecommendedAction(event: any): string {
  if (event.eventType === 'REMOVED' && event.severity === 'Critical') {
    return 'Contact the vendor immediately to verify if their compliance certification has expired or been revoked. Consider pausing new onboarding until verified. Request an updated audit report or certification.';
  }
  if (event.eventType === 'WEAKENED' && event.severity === 'Critical') {
    return 'Review your data processing agreement with this vendor. Their privacy policy has changed in a way that may affect your obligations. Consult with your legal team about potential impacts on data sharing and compliance.';
  }
  if (event.eventType === 'NUMBER_CHANGED') {
    return 'Review your SLA and determine if this change violates your agreement. Consider requesting an updated service level agreement. Document this change for your vendor management records.';
  }
  if (event.eventType === 'REVERSED') {
    return 'This represents a significant policy reversal. Review all related documentation and contracts. Schedule a meeting with your vendor to understand the reasoning and implications.';
  }
  return 'Review the change and assess impact on your risk posture. Document this for your vendor management records and consider whether any action is required based on your internal policies.';
}
