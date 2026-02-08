'use client';

import { useEffect, useState } from 'react';

interface ProgressMessage {
  companyId: string;
  stage: string;
  message: string;
  timestamp: string;
  details?: any;
}

export default function CrawlProgressFeed() {
  const [messages, setMessages] = useState<ProgressMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    // Connect to Server-Sent Events endpoint
    const eventSource = new EventSource('http://localhost:5000/api/progress/progress');

    eventSource.onopen = () => {
      setIsConnected(true);
      console.log('Connected to progress stream');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected') {
          return; // Skip connection message
        }

        setMessages((prev) => [data, ...prev].slice(0, 20)); // Keep last 20 messages
        setIsActive(true);

        // If crawl completed, auto-clear after 10 seconds
        if (data.stage === 'completed') {
          setTimeout(() => {
            setMessages([]);
            setIsActive(false);
          }, 10000); // 10 seconds
        }
      } catch (error) {
        console.error('Error parsing progress message:', error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      console.error('Progress stream error');
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleClear = () => {
    setMessages([]);
    setIsActive(false);
  };

  if (!isActive && messages.length === 0) {
    return null; // Don't show if no messages
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">🔄</div>
          <h3 className="text-lg font-bold text-gray-800">Live Crawl Progress</h3>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">{isConnected ? 'Live' : 'Disconnected'}</span>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded hover:bg-gray-100"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {messages.map((msg, index) => {
          const isCompleted = msg.stage === 'completed';
          const isScraping = msg.stage === 'scraping';
          const isError = msg.message.includes('error') || msg.message.includes('failed');
          
          return (
            <div
              key={index}
              className={`p-3 rounded-lg border-l-4 transition-all ${
                isCompleted
                  ? 'bg-green-50 border-green-500'
                  : isError
                  ? 'bg-red-50 border-red-500'
                  : isScraping
                  ? 'bg-blue-50 border-blue-500'
                  : 'bg-gray-50 border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-mono text-sm text-gray-800">{msg.message}</div>
                  {msg.details && (
                    <div className="text-xs text-gray-500 mt-1 font-mono bg-white px-2 py-1 rounded">
                      {typeof msg.details === 'object' 
                        ? Object.entries(msg.details).map(([key, val]) => `${key}: ${val}`).join(', ')
                        : JSON.stringify(msg.details)
                      }
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-400 ml-4 whitespace-nowrap">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
