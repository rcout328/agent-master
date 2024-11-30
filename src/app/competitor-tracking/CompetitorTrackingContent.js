"use client";

import { useState } from 'react';
import Link from 'next/link';
import { callGeminiApi } from '@/utils/geminiApi';

export default function CompetitorTrackingContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [apiResponse, setApiResponse] = useState({
    main_competitors: [],
    market_share_data: [],
    competitor_strengths: [],
    key_findings: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setCurrentPhase(1);

    try {
      const response = await fetch('http://127.0.0.1:5001/api/competitor-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const data = await response.json();
      console.log('API Response:', data);
      
      // Update data progressively
      if (data.main_competitors?.length) {
        setCurrentPhase(2);
        setApiResponse(prev => ({ ...prev, main_competitors: data.main_competitors }));
      }
      if (data.market_share_data?.length) {
        setCurrentPhase(3);
        setApiResponse(prev => ({ ...prev, market_share_data: data.market_share_data }));
      }
      if (data.competitor_strengths?.length) {
        setCurrentPhase(4);
        setApiResponse(prev => ({ ...prev, competitor_strengths: data.competitor_strengths }));
      }
      if (data.key_findings?.length) {
        setCurrentPhase(5);
        setApiResponse(prev => ({ ...prev, key_findings: data.key_findings }));
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to get data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPhaseStatus = () => {
    const phases = [
      'Starting Analysis',
      'Finding Competitors',
      'Analyzing Market Share',
      'Identifying Strengths',
      'Gathering Insights'
    ];

    return (
      <div className="mb-4">
        <div className="flex items-center space-x-2">
          {phases.map((phase, index) => (
            <div key={index} className="flex items-center">
              <div className={`h-2 w-2 rounded-full ${
                currentPhase > index ? 'bg-purple-500' : 'bg-gray-600'
              }`} />
              <span className={`text-sm ml-1 ${
                currentPhase > index ? 'text-purple-400' : 'text-gray-500'
              }`}>
                {phase}
              </span>
              {index < phases.length - 1 && (
                <div className={`h-0.5 w-4 mx-2 ${
                  currentPhase > index ? 'bg-purple-500' : 'bg-gray-600'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderApiResponse = (data) => {
    if (!data) return null;

    const { main_competitors, market_share_data, competitor_strengths, key_findings } = data;

    return (
      <div className="space-y-6">
        {/* Main Competitors */}
        <div>
          <h3 className="text-lg font-semibold text-purple-400 mb-2">Top Competitors</h3>
          <div className="bg-[#2D2D2F] p-4 rounded-xl">
            {main_competitors.length > 0 ? (
              <ul className="space-y-2">
                {main_competitors.slice(0, 5).map((competitor, index) => (
                  <li key={index} className="text-gray-300">{competitor}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">No competitors found.</p>
            )}
          </div>
        </div>

        {/* Market Share Data */}
        <div>
          <h3 className="text-lg font-semibold text-purple-400 mb-2">Market Share Data</h3>
          <div className="bg-[#2D2D2F] p-4 rounded-xl">
            {market_share_data.length > 0 ? (
              <ul className="space-y-2">
                {market_share_data.map((item, index) => (
                  <li key={index} className="text-gray-300">
                    {item.competitor}: {item.share}%
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">No market share data available.</p>
            )}
          </div>
        </div>

        {/* Competitor Strengths */}
        <div>
          <h3 className="text-lg font-semibold text-purple-400 mb-2">Competitor Strengths</h3>
          <div className="bg-[#2D2D2F] p-4 rounded-xl">
            {competitor_strengths.length > 0 ? (
              <ul className="space-y-2">
                {competitor_strengths.map((strength, index) => (
                  <li key={index} className="text-gray-300">{strength}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">No strengths data available.</p>
            )}
          </div>
        </div>

        {/* Key Findings */}
        <div>
          <h3 className="text-lg font-semibold text-purple-400 mb-2">Key Findings</h3>
          <div className="space-y-3">
            {key_findings.length > 0 ? (
              key_findings.map((finding, index) => (
                <div key={index} className="bg-[#2D2D2F] p-4 rounded-xl">
                  <h4 className="font-medium text-white">{finding.title}</h4>
                  <p className="text-gray-400 mt-1">{finding.snippet}</p>
                  <div className="flex justify-between mt-2 text-sm text-gray-500">
                    <span>{finding.source}</span>
                    <span>{finding.date}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400">No key findings available.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#131314] text-white p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Navigation Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-purple-400 mb-4">Navigation</h2>
          <div className="flex space-x-4">
            <Link href="/">
              <button className="px-4 py-2 rounded-lg bg-purple-600 text-white">Home</button>
            </Link>
            <Link href="/market-trends">
              <button className="px-4 py-2 rounded-lg bg-purple-600 text-white">Market Trends</button>
            </Link>
            <Link href="/competitor-tracking">
              <button className="px-4 py-2 rounded-lg bg-purple-600 text-white">Competitor Tracking</button>
            </Link>
          </div>
        </div>

        {/* Search Form */}
        <div className="mb-6">
          <form onSubmit={handleSubmit} className="w-full">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-grow">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter business name for competitor analysis..."
                  className="w-full px-4 py-2 bg-[#1D1D1F] border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !searchQuery.trim()}
                className={`px-6 py-2 rounded-xl font-medium transition-all duration-200 ${
                  isLoading || !searchQuery.trim()
                    ? 'bg-purple-600/50 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin"></div>
                  </div>
                ) : (
                  'Analyze'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
            <p>{error}</p>
          </div>
        )}

        {/* API Response Display */}
        <div className="bg-[#1D1D1F] rounded-2xl border border-purple-500/10 p-3 sm:p-4 lg:p-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : apiResponse ? (
            renderApiResponse(apiResponse)
          ) : (
            <div className="text-center text-gray-400 py-8">
              Enter a business name above to analyze competitors
            </div>
          )}
        </div>
      </div>
    </div>
  );
}