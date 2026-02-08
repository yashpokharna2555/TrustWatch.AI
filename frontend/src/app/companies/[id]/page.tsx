'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { companies, claims, events, evidence } from '@/lib/api';

export default function CompanyPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [company, setCompany] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'claims' | 'changes' | 'evidence'>('claims');
  const [claimsList, setClaimsList] = useState<any[]>([]);
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [params.id]);

  const loadData = async () => {
    try {
      const [companyRes, claimsRes, eventsRes, evidenceRes] = await Promise.all([
        companies.get(params.id),
        claims.list(params.id),
        events.list({ companyId: params.id }),
        evidence.list(params.id),
      ]);

      setCompany(companyRes.company);
      setClaimsList(claimsRes.claims);
      setEventsList(eventsRes.events);
      setEvidenceList(evidenceRes.evidence);
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push('/auth/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCrawl = async () => {
    try {
      setLoading(true);
      await crawl.runForCompany(companyId);
      // Reload data after 3 seconds
      setTimeout(() => loadData(), 3000);
    } catch (err) {
      console.error('Crawl failed:', err);
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

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Company not found</div>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>

        {/* Company Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold mb-2">{company.displayName}</h2>
              <p className="text-gray-600 mb-4">{company.domain}</p>
              <div className="flex space-x-2">
                {company.categoriesEnabled.map((cat: string) => (
                  <span
                    key={cat}
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm capitalize"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-red-600">{company.riskScore}</div>
              <div className="text-sm text-gray-500">Risk Score</div>
              {company.lastCrawledAt && (
                <div className="text-xs text-gray-500 mt-2">
                  Last crawled: {new Date(company.lastCrawledAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setActiveTab('claims')}
                className={`px-6 py-4 font-semibold ${
                  activeTab === 'claims'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Claims ({claimsList.length})
              </button>
              <button
                onClick={() => setActiveTab('changes')}
                className={`px-6 py-4 font-semibold ${
                  activeTab === 'changes'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Changes ({eventsList.length})
              </button>
              <button
                onClick={() => setActiveTab('evidence')}
                className={`px-6 py-4 font-semibold ${
                  activeTab === 'evidence'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Evidence ({evidenceList.length})
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'claims' && (
              <ClaimsTab claims={claimsList} />
            )}
            {activeTab === 'changes' && (
              <ChangesTab events={eventsList} />
            )}
            {activeTab === 'evidence' && (
              <EvidenceTab evidence={evidenceList} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function ClaimsTab({ claims }: { claims: any[] }) {
  const getClaimExplanation = (key: string): string => {
    const explanations: { [key: string]: string } = {
      'SOC2_TYPE_II': 'Security certification - An independent auditor verified their security controls',
      'ISO_27001': 'International security standard - Globally recognized information security certification',
      'ISO_27017': 'Cloud security standard - ISO certification specifically for cloud services',
      'ISO_27018': 'Cloud privacy standard - ISO certification for personal data protection in cloud',
      'HIPAA': 'Healthcare compliance - Required for handling medical/health data safely',
      'GDPR': 'European privacy law - Compliance with EU data protection regulations',
      'PCI_DSS': 'Payment security standard - Required for safely handling credit card data',
      'CCPA': 'California privacy law - Compliance with California consumer privacy act',
      'FEDRAMP': 'Federal security standard - US government cloud security certification',
      'ENCRYPTION': 'Data encryption - They scramble your data so hackers can\'t read it',
      'MFA': 'Multi-factor authentication - Requires multiple forms of verification (like 2FA)',
      'DO_NOT_SELL': 'Privacy promise - They commit not to sell your data to third parties',
      'DATA_PROTECTION': 'Data security - They protect and secure your information',
      'UPTIME': 'Service availability - Percentage of time their service is operational',
      'BACKUP': 'Data backup - They keep copies of your data in case of disaster',
      'AUDIT': 'Security audits - Regular security checks by outside experts',
      'PENETRATION_TESTING': 'Security testing - Ethical hackers test their defenses',
    };
    return explanations[key] || 'Security or compliance claim detected';
  };

  if (claims.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">🔍</div>
        <p className="text-gray-600 mb-2">No claims detected yet</p>
        <p className="text-sm text-gray-500">
          Claims are security promises and certifications we automatically extract from their website.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {claims.map((claim) => (
        <Link
          key={claim._id}
          href={`/claims/${claim._id}`}
          className="block p-5 border rounded-lg hover:bg-gray-50 transition-all hover:shadow-md"
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  claim.currentStatus === 'ACTIVE'
                    ? 'bg-green-100 text-green-700'
                    : claim.currentStatus === 'REMOVED'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {claim.currentStatus === 'ACTIVE' ? '✅ ACTIVE' : '❌ REMOVED'}
              </span>
            </div>
            <div className="text-xs text-gray-500 flex items-center">
              <span className="mr-1">🎯</span>
              Confidence: {Math.round(claim.confidence * 100)}%
            </div>
          </div>
          
          <div className="font-bold text-lg mb-2 text-gray-800">
            {claim.normalizedKey.replace(/_/g, ' ')}
          </div>
          
          <div className="text-sm text-blue-600 mb-3 bg-blue-50 px-3 py-2 rounded inline-block">
            💡 {getClaimExplanation(claim.normalizedKey)}
          </div>
          
          <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded border-l-4 border-blue-400">
            <div className="text-xs text-gray-500 mb-1">📝 Exact text from their website:</div>
            <div className="italic">"{claim.currentSnippet}"</div>
          </div>
          
          <div className="text-xs text-gray-500 mt-3 flex items-center space-x-4">
            <span>
              <span className="font-semibold">First seen:</span> {new Date(claim.firstSeenAt).toLocaleDateString()}
            </span>
            <span>•</span>
            <span>
              <span className="font-semibold">Last seen:</span> {new Date(claim.lastSeenAt).toLocaleDateString()}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ChangesTab({ events }: { events: any[] }) {
  const getEventExplanation = (eventType: string, severity: string): { icon: string; text: string; action: string } => {
    const explanations: { [key: string]: { icon: string; text: string; action: string } } = {
      'ADDED': {
        icon: '✨',
        text: 'A new claim appeared on their website',
        action: 'Good news! Just be aware of this new commitment.'
      },
      'REMOVED': {
        icon: '🚨',
        text: 'A claim was removed from their website',
        action: 'URGENT: Contact vendor immediately. They may have lost certification or changed policy.'
      },
      'WEAKENED': {
        icon: '⚠️',
        text: 'The language became less strong or committal',
        action: 'CRITICAL: Review the change. They may be weakening their promises.'
      },
      'NUMBER_CHANGED': {
        icon: '📉',
        text: 'A numeric value changed (uptime, retention days, etc.)',
        action: severity === 'Critical' ? 'URGENT: Review SLA impact' : 'Review the change and assess impact.'
      },
      'REVERSED': {
        icon: '🔄',
        text: 'They reversed or contradicted a previous statement',
        action: 'CRITICAL: Legal review required. They may be going back on commitments.'
      },
    };
    return explanations[eventType] || { icon: '📝', text: 'A change was detected', action: 'Review this change.' };
  };

  const getSeverityExplanation = (severity: string): string => {
    const explanations: { [key: string]: string } = {
      'Critical': 'DROP EVERYTHING - This requires immediate action and may indicate breach of trust or contract',
      'Medium': 'Important - Review within 24 hours and assess potential impact on your business',
      'Info': 'For your information - No immediate action needed, but good to be aware',
    };
    return explanations[severity] || '';
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-gray-600 mb-2">No changes detected yet</p>
        <p className="text-sm text-gray-500">
          Changes appear here when we detect modifications to their security promises or compliance claims.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => {
        const explanation = getEventExplanation(event.eventType, event.severity);
        return (
          <Link
            key={event._id}
            href={`/events/${event._id}`}
            className="block p-5 border rounded-lg hover:bg-gray-50 transition-all hover:shadow-md"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    event.severity === 'Critical'
                      ? 'bg-red-100 text-red-700'
                      : event.severity === 'Medium'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                  title={getSeverityExplanation(event.severity)}
                >
                  {event.severity === 'Critical' ? '🔴' : event.severity === 'Medium' ? '🟡' : '🔵'} {event.severity.toUpperCase()}
                </span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                  {explanation.icon} {event.eventType.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                📅 {new Date(event.detectedAt).toLocaleDateString()}
              </div>
            </div>
            
            <div className="font-bold text-lg mb-2 text-gray-800">
              {event.normalizedKey.replace(/_/g, ' ')}
            </div>
            
            <div className="text-sm text-gray-600 mb-3 bg-blue-50 px-3 py-2 rounded">
              <div className="font-semibold mb-1">💡 What this means:</div>
              <div>{explanation.text}</div>
            </div>
            
            <div className={`text-sm p-3 rounded border-l-4 ${
              event.severity === 'Critical' 
                ? 'bg-red-50 border-red-400 text-red-800' 
                : event.severity === 'Medium'
                ? 'bg-yellow-50 border-yellow-400 text-yellow-800'
                : 'bg-blue-50 border-blue-400 text-blue-800'
            }`}>
              <div className="font-semibold mb-1">👉 What to do:</div>
              <div>{explanation.action}</div>
            </div>
            
            {event.acknowledged && (
              <div className="mt-3 text-xs text-green-600 bg-green-50 px-3 py-2 rounded inline-block">
                ✓ Acknowledged
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}

function EvidenceTab({ evidence }: { evidence: any[] }) {
  if (evidence.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">📄</div>
        <p className="text-gray-600 mb-2 font-semibold">No evidence documents found yet</p>
        <div className="text-sm text-gray-500 max-w-xl mx-auto space-y-3">
          <p>
            Evidence documents are PDFs (like SOC2 audit reports, ISO certificates, security whitepapers) 
            that companies link to from their pages.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <p className="font-semibold text-blue-900 mb-2">💡 Why no evidence?</p>
            <ul className="list-disc ml-5 space-y-1 text-blue-800">
              <li>The company may not link to PDF documents on their security/privacy pages</li>
              <li>PDFs might be behind a login/portal (we can only find public links)</li>
              <li>They may provide compliance docs only upon request</li>
              <li>Some companies only have text-based security pages (no PDFs)</li>
            </ul>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
            <p className="font-semibold text-amber-900 mb-2">✅ What to do:</p>
            <ul className="list-disc ml-5 space-y-1 text-amber-800">
              <li>Check the <strong>Claims</strong> tab - we still extracted their security promises</li>
              <li>Contact the vendor and request public links to compliance documents</li>
              <li>Many vendors provide SOC2/ISO reports in their customer portal</li>
              <li>For demos, some companies just don't publish PDFs publicly</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info box explaining evidence */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-2xl">💡</div>
          <div className="flex-1">
            <div className="font-semibold text-blue-900 mb-1">What is Evidence?</div>
            <div className="text-sm text-blue-800">
              Evidence documents are proof files (PDFs) that companies provide to back up their security claims. 
              We automatically download and parse these to extract verifiable information like audit reports, 
              certifications, and compliance documents.
            </div>
          </div>
        </div>
      </div>

      {evidence.map((item) => (
        <div key={item._id} className="p-6 border rounded-lg bg-white shadow-sm">
          {/* Status Badge */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <span
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                  item.status === 'READY'
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : item.status === 'PENDING'
                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }`}
              >
                {item.status === 'READY' && '✅ Verified'}
                {item.status === 'PENDING' && '⏳ Processing'}
                {item.status === 'FAILED' && '❌ Failed to Parse'}
              </span>
              {item.status === 'READY' && (
                <div className="text-xs text-gray-500 mt-2">
                  This PDF was successfully parsed and information was extracted
                </div>
              )}
              {item.status === 'PENDING' && (
                <div className="text-xs text-gray-500 mt-2">
                  PDF is being processed by Reducto API - check back in a few minutes
                </div>
              )}
              {item.status === 'FAILED' && (
                <div className="text-xs text-gray-500 mt-2">
                  We couldn't parse this PDF automatically - manual review may be needed
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500">
              📅 Found: {new Date(item.createdAt).toLocaleDateString()}
            </div>
          </div>

          {/* Claim Type */}
          <div className="font-bold text-xl mb-4 text-gray-900 bg-gray-50 px-4 py-2 rounded inline-block">
            {item.claimType}
          </div>

          {/* PDF URL */}
          <div className="mb-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">📄</span>
              <span className="text-sm font-semibold text-gray-700">PDF Document:</span>
            </div>
            <a
              href={item.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline break-all block"
            >
              {item.pdfUrl}
            </a>
            <div className="text-xs text-gray-500 mt-2">
              Click to open the original PDF document in a new tab
            </div>
          </div>

          {/* Source Page (NEW!) */}
          {item.sourceUrl && (
            <div className="mb-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">🔗</span>
                <span className="text-sm font-semibold text-blue-900">Found on this page:</span>
              </div>
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline block"
              >
                {item.sourceUrl}
              </a>
              <div className="text-xs text-blue-700 mt-2">
                This is the webpage where we discovered the PDF link
              </div>
            </div>
          )}

          {/* Context Snippet (NEW!) */}
          {item.contextSnippet && (
            <div className="mb-4 bg-amber-50 p-4 rounded-lg border border-amber-200">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">📝</span>
                <span className="text-sm font-semibold text-amber-900">Context from webpage:</span>
              </div>
              <div className="text-sm text-gray-800 italic border-l-4 border-amber-400 pl-3">
                "{item.contextSnippet}"
              </div>
              <div className="text-xs text-amber-700 mt-2">
                This is the exact text surrounding the PDF link on their website
              </div>
            </div>
          )}

          {/* Extracted Fields from PDF */}
          {item.status === 'READY' && item.extractedFields && (
            <div className="mt-4 pt-4 border-t-2 border-gray-200">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-lg">✅</span>
                <span className="font-semibold text-green-900">Verified Information from PDF:</span>
              </div>
              <div className="bg-green-50 p-5 rounded-lg border border-green-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {item.extractedFields.reportType && (
                    <div className="bg-white p-3 rounded border border-green-200">
                      <span className="font-semibold text-gray-700 block mb-1">📋 Report Type:</span>
                      <div className="text-gray-900 font-medium">{item.extractedFields.reportType}</div>
                      <div className="text-xs text-gray-500 mt-1">The type of audit or certification document</div>
                    </div>
                  )}
                  {item.extractedFields.auditor && (
                    <div className="bg-white p-3 rounded border border-green-200">
                      <span className="font-semibold text-gray-700 block mb-1">🏢 Auditor:</span>
                      <div className="text-gray-900 font-medium">{item.extractedFields.auditor}</div>
                      <div className="text-xs text-gray-500 mt-1">The company that performed the audit</div>
                    </div>
                  )}
                  {item.extractedFields.periodStart && item.extractedFields.periodEnd && (
                    <div className="bg-white p-3 rounded border border-green-200">
                      <span className="font-semibold text-gray-700 block mb-1">📅 Audit Period:</span>
                      <div className="text-gray-900 font-medium">
                        {new Date(item.extractedFields.periodStart).toLocaleDateString()} -{' '}
                        {new Date(item.extractedFields.periodEnd).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">The time period covered by this audit</div>
                    </div>
                  )}
                  {item.extractedFields.pageNumbers && item.extractedFields.pageNumbers.length > 0 && (
                    <div className="bg-white p-3 rounded border border-green-200">
                      <span className="font-semibold text-gray-700 block mb-1">📄 Pages Analyzed:</span>
                      <div className="text-gray-900 font-medium">
                        {item.extractedFields.pageNumbers.length} pages ({item.extractedFields.pageNumbers.join(', ')})
                      </div>
                      <div className="text-xs text-gray-500 mt-1">PDF pages where information was found</div>
                    </div>
                  )}
                  {item.extractedFields.scope && (
                    <div className="bg-white p-3 rounded border border-green-200 md:col-span-2">
                      <span className="font-semibold text-gray-700 block mb-1">🎯 Scope:</span>
                      <div className="text-gray-900">{item.extractedFields.scope}</div>
                      <div className="text-xs text-gray-500 mt-1">What systems and processes were audited</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Failed Status Message */}
          {item.status === 'FAILED' && (
            <div className="mt-4 p-4 bg-amber-50 rounded-lg border-l-4 border-amber-500">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">⚠️</div>
                <div className="flex-1">
                  <div className="font-semibold text-amber-900 mb-2">Could Not Parse PDF Automatically</div>
                  <div className="text-sm text-amber-800">
                    <p className="mb-2">
                      Due to the company's security policy, we cannot automatically download and parse this PDF. 
                      However, you can still verify it manually.
                    </p>
                    <div className="bg-white p-3 rounded border border-amber-200 mt-3">
                      <p className="font-semibold text-amber-900 mb-1">✅ What to do:</p>
                      <ol className="list-decimal ml-5 space-y-1">
                        <li>Click the PDF link above to open it</li>
                        <li>Review the document manually</li>
                        <li>Verify claims match what they state on their website</li>
                        <li>Download and save for your records</li>
                      </ol>
                    </div>
                    {item.error && (
                      <details className="mt-3">
                        <summary className="text-xs cursor-pointer text-amber-700 hover:text-amber-900">
                          Technical details
                        </summary>
                        <div className="mt-2 bg-amber-100 p-2 rounded text-xs font-mono text-amber-900">
                          {item.error}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pending Status Message */}
          {item.status === 'PENDING' && (
            <div className="mt-4 p-5 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">⏳</div>
                <div className="flex-1">
                  <div className="font-semibold text-yellow-900 mb-2">Processing PDF...</div>
                  <div className="text-sm text-yellow-800">
                    <p className="mb-2">
                      Reducto API is currently extracting structured data from this document. 
                      This usually takes 1-3 minutes depending on PDF size and complexity.
                    </p>
                    <p className="font-medium">What happens next:</p>
                    <ul className="list-disc ml-5 mt-1 space-y-1">
                      <li>The PDF is being uploaded to Reducto's servers</li>
                      <li>AI and OCR are extracting text and tables</li>
                      <li>Structured fields are being identified (auditor, dates, scope)</li>
                      <li>Results will appear here automatically when ready</li>
                    </ul>
                    <p className="mt-3 text-xs bg-yellow-100 p-2 rounded">
                      💡 Tip: Refresh this page in a minute to see the results
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
