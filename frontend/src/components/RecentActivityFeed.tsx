'use client';

import Link from 'next/link';

interface Activity {
  _id: string;
  eventType: string;
  severity: 'Critical' | 'Medium' | 'Info';
  companyId: { _id: string; displayName: string; domain: string };
  claimType: string;
  detectedAt: string;
  oldSnippet?: string;
  newSnippet?: string;
}

interface Props {
  events: Activity[];
  limit?: number;
}

export default function RecentActivityFeed({ events, limit = 10 }: Props) {
  const recentEvents = events
    .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
    .slice(0, limit);

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Medium':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Info':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'REMOVED':
        return '🗑️';
      case 'ADDED':
        return '➕';
      case 'WEAKENED':
        return '⚠️';
      case 'NUMBER_CHANGED':
        return '📉';
      case 'REVERSED':
        return '🔄';
      default:
        return '📝';
    }
  };

  const getEventLabel = (eventType: string) => {
    return eventType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  if (recentEvents.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="text-2xl">📡</div>
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="text-center py-8">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray-500">No recent changes detected</p>
          <p className="text-sm text-gray-400 mt-1">We're monitoring your vendors and will alert you when changes occur</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">📡</div>
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <Link
          href="/events"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View all →
        </Link>
      </div>

      <div className="space-y-3">
        {recentEvents.map((event) => (
          <Link
            key={event._id}
            href={`/events/${event._id}`}
            className="block p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className="text-2xl">{getEventIcon(event.eventType)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getSeverityStyle(event.severity)}`}>
                      {event.severity}
                    </span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-500">{getEventLabel(event.eventType)}</span>
                  </div>
                  <div className="font-medium text-gray-900 mb-1">
                    {event.companyId?.displayName || event.companyId?.domain || 'Unknown Company'}
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    {event.claimType.replace(/_/g, ' ')}
                  </div>
                  {event.oldSnippet && event.newSnippet && (
                    <div className="text-xs text-gray-500 mt-2 line-clamp-2">
                      {event.eventType === 'REMOVED' 
                        ? `"${event.oldSnippet.substring(0, 80)}..."`
                        : `Changed to: "${event.newSnippet.substring(0, 80)}..."`
                      }
                    </div>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-400 ml-4 whitespace-nowrap">
                {new Date(event.detectedAt).toLocaleDateString()}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
