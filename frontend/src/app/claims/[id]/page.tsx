'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { claims } from '@/lib/api';

export default function ClaimPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [claim, setClaim] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [params.id]);

  const loadData = async () => {
    try {
      const [claimRes, versionsRes] = await Promise.all([
        claims.get(params.id),
        claims.versions(params.id),
      ]);

      setClaim(claimRes.claim);
      setVersions(versionsRes.versions);
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push('/auth/login');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Claim not found</div>
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
          <Link
            href={`/companies/${claim.companyId._id}`}
            className="text-blue-600 hover:underline"
          >
            ← Back to {claim.companyId.displayName}
          </Link>
        </div>

        {/* Claim Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  claim.currentStatus === 'ACTIVE'
                    ? 'bg-green-100 text-green-700'
                    : claim.currentStatus === 'REMOVED'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {claim.currentStatus}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Confidence: {Math.round(claim.confidence * 100)}%
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-2">
            {claim.normalizedKey.replace(/_/g, ' ')}
          </h2>
          <p className="text-gray-600 mb-4">{claim.claimType}</p>

          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <p className="text-gray-800">"{claim.currentSnippet}"</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold">First Seen:</span>{' '}
              {new Date(claim.firstSeenAt).toLocaleString()}
            </div>
            <div>
              <span className="font-semibold">Last Seen:</span>{' '}
              {new Date(claim.lastSeenAt).toLocaleString()}
            </div>
            <div className="col-span-2">
              <span className="font-semibold">Source:</span>{' '}
              <a
                href={claim.currentSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {claim.currentSourceUrl}
              </a>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4">Claim Timeline</h3>

          {versions.length === 0 ? (
            <p className="text-gray-500">No version history available</p>
          ) : (
            <div className="space-y-6">
              {versions.map((version, index) => (
                <div key={version._id} className="relative pl-8 pb-6 border-l-2 border-gray-200">
                  <div className="absolute -left-2 top-0 w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>
                  
                  <div className="mb-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {new Date(version.seenAt).toLocaleString()}
                    </span>
                    {index === 0 && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        Latest
                      </span>
                    )}
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg mb-2">
                    <p className="text-gray-800">"{version.snippet}"</p>
                  </div>

                  <div className="text-sm text-gray-600">
                    <div>
                      <span className="font-semibold">Polarity:</span>{' '}
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          version.polarity === 'positive'
                            ? 'bg-green-100 text-green-700'
                            : version.polarity === 'negative'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {version.polarity}
                      </span>
                    </div>
                    <div className="mt-1">
                      <span className="font-semibold">Source:</span>{' '}
                      <a
                        href={version.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs"
                      >
                        {version.sourceUrl}
                      </a>
                    </div>
                    {version.extractedMeta && version.extractedMeta.value && (
                      <div className="mt-1">
                        <span className="font-semibold">Value:</span> {version.extractedMeta.value}
                        {version.extractedMeta.unit && ` ${version.extractedMeta.unit}`}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
