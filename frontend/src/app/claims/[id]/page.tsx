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

  // Helper function to clean and display snippets
  const cleanSnippet = (snippet: string): { text: string; isUnreadable: boolean } => {
    if (!snippet) return { text: 'No text available', isUnreadable: true };
    
    // Check if snippet is mostly encoded/technical garbage
    const encodedPercentage = (snippet.match(/%[0-9A-F]{2}/gi) || []).length / snippet.length;
    const hasLongToken = /[A-Za-z0-9+/=]{100,}/.test(snippet);
    const hasNoSpaces = snippet.length > 50 && !snippet.includes(' ');
    const hasHighNonAlphaRatio = (snippet.match(/[^a-zA-Z\s]/g) || []).length / snippet.length > 0.4;
    
    // More aggressive detection: token-like patterns, no spaces, high special char ratio
    if (encodedPercentage > 0.15 || hasLongToken || (hasNoSpaces && hasHighNonAlphaRatio)) {
      return { 
        text: 'Technical data detected (authentication tokens or encoded strings) - not human-readable text', 
        isUnreadable: true 
      };
    }
    
    return { text: snippet, isUnreadable: false };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-4 rounded-2xl shadow-lg inline-block mb-4 animate-pulse">
            <span className="text-4xl">🔍</span>
          </div>
          <div className="text-gray-700 font-semibold text-lg">Loading claim details...</div>
        </div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex items-center justify-center">
        <div className="text-gray-600">Claim not found</div>
      </div>
    );
  }

  // Now it's safe to call cleanSnippet since we know claim exists
  const currentSnippetInfo = cleanSnippet(claim.currentSnippet);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      {/* Header */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-3">
            <Link href="/dashboard" className="flex items-center space-x-3 group">
              <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-2 rounded-xl shadow-lg group-hover:shadow-blue-500/40 transition-all">
                <span className="text-2xl">🔍</span>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">TrustWatch</h1>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href={`/companies/${claim.companyId._id}`}
            className="text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-2 hover:underline transition-all"
          >
            <span>←</span>
            <span>Back to {claim.companyId.displayName}</span>
          </Link>
        </div>

        {/* Claim Header */}
        <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-xl border-2 border-blue-200 p-8 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span
                className={`px-5 py-2 rounded-xl text-sm font-bold shadow-md ${
                  claim.currentStatus === 'ACTIVE'
                    ? 'bg-green-100 text-green-700 border-2 border-green-300'
                    : claim.currentStatus === 'REMOVED'
                    ? 'bg-red-100 text-red-700 border-2 border-red-300'
                    : 'bg-gray-100 text-gray-700 border-2 border-gray-300'
                }`}
              >
                {claim.currentStatus === 'ACTIVE' ? '✅ ACTIVE' : '❌ REMOVED'}
              </span>
            </div>
            <div className="text-sm text-gray-600 bg-white px-4 py-2 rounded-xl border-2 border-gray-300 font-bold shadow-sm">
              🎯 {Math.round(claim.confidence * 100)}% Confidence
            </div>
          </div>

          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            {claim.normalizedKey.replace(/_/g, ' ')}
          </h2>
          <div className="inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded-xl font-semibold border-2 border-blue-300 mb-6">
            {claim.claimType}
          </div>

          <div className="bg-white p-6 rounded-2xl mb-6 border-2 border-gray-200 shadow-sm overflow-hidden">
            <div className="text-sm text-gray-600 mb-2 font-bold uppercase tracking-wide">📝 Current Quote</div>
            {currentSnippetInfo.isUnreadable ? (
              <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-xl">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">⚠️</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-amber-900 mb-1">Unreadable Data</div>
                    <div className="text-sm text-amber-800">
                      {currentSnippetInfo.text}
                    </div>
                    <a
                      href={claim.currentSourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline font-semibold mt-2 inline-block"
                    >
                      View source page →
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-900 text-lg italic leading-relaxed break-words">{currentSnippetInfo.text ? `"${currentSnippetInfo.text}"` : 'No text available'}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm bg-white p-6 rounded-2xl border-2 border-gray-200">
            <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-xl border border-blue-200">
              <span className="font-bold text-gray-700 block mb-1">⏰ First Seen:</span>
              <span className="text-gray-900">{new Date(claim.firstSeenAt).toLocaleString()}</span>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-xl border border-blue-200">
              <span className="font-bold text-gray-700 block mb-1">📅 Last Seen:</span>
              <span className="text-gray-900">{new Date(claim.lastSeenAt).toLocaleString()}</span>
            </div>
            <div className="col-span-2 bg-gradient-to-br from-blue-50 to-white p-4 rounded-xl border border-blue-200">
              <span className="font-bold text-gray-700 block mb-2">🔗 Source:</span>
              <a
                href={claim.currentSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 hover:underline break-all font-medium"
              >
                {claim.currentSourceUrl}
              </a>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8">
          <h3 className="text-2xl font-bold mb-6 text-gray-900">Claim Timeline</h3>

          {versions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No version history available</p>
          ) : (
            <div className="space-y-8">
              {versions.map((version, index) => {
                const versionSnippetInfo = cleanSnippet(version.snippet);
                
                return (
                  <div key={version._id} className="relative pl-10 pb-8 border-l-4 border-blue-400 last:pb-0">
                    <div className="absolute -left-3 top-0 w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full border-4 border-white shadow-lg"></div>
                    
                    <div className="mb-3">
                      <span className="text-sm font-bold text-gray-900 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-300">
                        {new Date(version.seenAt).toLocaleString()}
                      </span>
                      {index === 0 && (
                        <span className="ml-3 text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg font-bold shadow-md">
                          ✨ LATEST
                        </span>
                      )}
                    </div>

                    {versionSnippetInfo.isUnreadable ? (
                      <div className="bg-amber-50 border-2 border-amber-300 p-4 rounded-xl mb-3 overflow-hidden">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-lg">⚠️</span>
                          <span className="text-sm font-bold text-amber-900">Unreadable Data</span>
                        </div>
                        <p className="text-xs text-amber-800 break-words">{versionSnippetInfo.text}</p>
                      </div>
                    ) : (
                      <div className="bg-gradient-to-r from-gray-50 to-white p-5 rounded-xl mb-3 border-2 border-gray-200 shadow-sm overflow-hidden">
                        <p className="text-gray-900 italic leading-relaxed break-words">"{versionSnippetInfo.text}"</p>
                      </div>
                    )}

                    <div className="text-sm text-gray-700 bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold">Polarity:</span>
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-bold ${
                            version.polarity === 'positive'
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : version.polarity === 'negative'
                              ? 'bg-red-100 text-red-700 border border-red-300'
                              : 'bg-gray-100 text-gray-700 border border-gray-300'
                          }`}
                        >
                          {version.polarity}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold">Source:</span>{' '}
                        <a
                          href={version.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          {version.sourceUrl}
                        </a>
                      </div>
                      {version.extractedMeta && version.extractedMeta.value && (
                        <div className="bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                          <span className="font-bold text-blue-900">Value:</span>{' '}
                          <span className="text-blue-800">{version.extractedMeta.value}</span>
                          {version.extractedMeta.unit && <span className="text-blue-700"> {version.extractedMeta.unit}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
