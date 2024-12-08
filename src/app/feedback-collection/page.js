"use client";

import { useState } from 'react';
import Link from 'next/link';
import FeedbackDisplay from '@/components/FeedbackDisplay';

const DEFAULT_PLATFORMS = [
  { id: 'google', name: 'Google Reviews', enabled: true },
  { id: 'trustpilot', name: 'Trustpilot Reviews', enabled: false },
  { id: 'amazon', name: 'Amazon Reviews', enabled: false },
  { id: 'product', name: 'Product Reviews', enabled: false },
  { id: 'custom', name: 'Custom Query', enabled: false }
];

export default function FeedbackCollection() {
  const [feedbackData, setFeedbackData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [searchPlatforms, setSearchPlatforms] = useState(DEFAULT_PLATFORMS);
  const [customQuery, setCustomQuery] = useState('');

  const handlePlatformToggle = (platformId) => {
    setSearchPlatforms(platforms => 
      platforms.map(p => 
        p.id === platformId ? { ...p, enabled: !p.enabled } : p
      )
    );
  };

  const handleFeedbackSearch = async () => {
    if (!companyName) return;
    
    setIsLoading(true);
    try {
      const enabledPlatforms = searchPlatforms
        .filter(p => p.enabled)
        .map(p => p.id === 'custom' ? customQuery : `${p.name.toLowerCase()}`);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/feedback-validation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: companyName,
          platforms: enabledPlatforms
        })
      });

      if (!response.ok) throw new Error('Failed to fetch feedback');
      const data = await response.json();
      setFeedbackData(data);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to fetch feedback: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
            Customer Feedback Analysis
          </h1>
          <Link
            href="/icp-creation"
            className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Back to ICP
          </Link>
        </div>

        {/* Search Section */}
        <div className="bg-[#1D1D1F] p-6 rounded-xl mb-8">
          <div className="space-y-4">
            {/* Company Input */}
            <div className="flex gap-4">
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name..."
                className="flex-1 px-4 py-2 bg-[#2D2D2F] rounded-lg border border-gray-700 focus:border-purple-500 outline-none text-white"
              />
            </div>

            {/* Platform Selection */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-400">Search Platforms</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {searchPlatforms.map(platform => (
                  <button
                    key={platform.id}
                    onClick={() => handlePlatformToggle(platform.id)}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      platform.enabled
                        ? 'bg-purple-600 text-white'
                        : 'bg-[#2D2D2F] text-gray-400 hover:text-white'
                    }`}
                  >
                    {platform.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Query Input */}
            {searchPlatforms.find(p => p.id === 'custom')?.enabled && (
              <div className="flex gap-4">
                <input
                  type="text"
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  placeholder="Enter custom search query..."
                  className="flex-1 px-4 py-2 bg-[#2D2D2F] rounded-lg border border-gray-700 focus:border-purple-500 outline-none text-white"
                />
              </div>
            )}

            {/* Search Button */}
            <div className="flex justify-end">
              <button
                onClick={handleFeedbackSearch}
                disabled={isLoading || !companyName || !searchPlatforms.some(p => p.enabled)}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  isLoading || !companyName || !searchPlatforms.some(p => p.enabled)
                    ? 'bg-purple-600/50 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {isLoading ? 'Analyzing...' : 'Analyze Feedback'}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {feedbackData && <FeedbackDisplay feedbackData={feedbackData} />}

        {/* Empty State */}
        {!feedbackData && !isLoading && (
          <div className="text-center text-gray-400 py-12">
            Enter a company name and select platforms to analyze feedback
          </div>
        )}
      </div>
    </div>
  );
}