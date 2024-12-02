"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { callGeminiApi } from '@/utils/geminiApi';

export default function CompetitorTrackingContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [apiResponse, setApiResponse] = useState({
    main_competitors: [],
    market_share_data: [],
    competitor_strengths: [],
    key_findings: [],
    sources: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(0);

  // Load data from local storage on component mount
  useEffect(() => {
    const storedData = localStorage.getItem('geminiApiResponse');
    if (storedData) {
      setApiResponse(JSON.parse(storedData));
      setCurrentPhase(6); // Assuming the last phase is reached if data is loaded from local storage
    }
  }, []);

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
      if (data.sources?.length) {
        setCurrentPhase(6);
        setApiResponse(prev => ({ ...prev, sources: data.sources }));
      }

      // Store the API response in local storage
      localStorage.setItem('geminiApiResponse', JSON.stringify(data));
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
      'Gathering Insights',
      'Data Sources',
      'Citation Note'
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
    return (
      <div className="space-y-6">
        {/* Competitors Section */}
        {data.main_competitors?.length > 0 && (
          <div className="bg-[#2D2D2F] p-4 rounded-xl">
            <h3 className="text-lg font-semibold text-purple-400 mb-4">Main Competitors</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.main_competitors.map((competitor, index) => (
                <div key={index} className="bg-[#1D1D1F] p-4 rounded-lg">
                  <p className="text-gray-300">{competitor}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Competitor Strengths Section */}
        {data.competitor_strengths?.length > 0 && (
          <div className="bg-[#2D2D2F] p-4 rounded-xl">
            <h3 className="text-lg font-semibold text-purple-400 mb-4">Competitor Strengths</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.competitor_strengths.map((strength, index) => (
                <div key={index} className="bg-[#1D1D1F] p-4 rounded-lg">
                  <p className="text-gray-300">{strength}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Findings Section */}
        {data.key_findings?.length > 0 && (
          <div className="bg-[#2D2D2F] p-4 rounded-xl">
            <h3 className="text-lg font-semibold text-purple-400 mb-4">Key Findings</h3>
            <div className="space-y-4">
              {data.key_findings.map((finding, index) => (
                <div key={index} className="bg-[#1D1D1F] p-4 rounded-lg">
                  <p className="text-gray-300">{finding}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sources Section */}
        {data.sources?.length > 0 && (
          <div className="bg-[#2D2D2F] p-4 rounded-xl">
            <h3 className="text-lg font-semibold text-purple-400 mb-4">Data Sources</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.sources.map((source, index) => (
                <div key={index} className="bg-[#1D1D1F] p-4 rounded-lg flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-500/10 rounded-full flex items-center justify-center">
                    <span className="text-purple-400 text-sm">{index + 1}</span>
                  </div>
                  <div className="flex-grow">
                    <a 
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      {source.domain}
                    </a>
                    <div className="text-sm text-gray-400 mt-1">
                      <span className="bg-purple-500/10 px-2 py-1 rounded text-xs">
                        {source.section}
                      </span>
                      <span className="ml-2">
                        {source.date}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-sm text-gray-400 mt-4">
              * Analysis based on {data.sources.length} trusted sources
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMarketShareSection = (marketShareData) => {
    if (!marketShareData?.length) return null;

    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-purple-400 mb-4">Market Share Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {marketShareData.map((item, index) => (
            <div key={index} className="bg-[#2D2D2F] p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-white">{item.company}</h4>
                <span className="text-purple-400 font-semibold">
                  {item.market_share}
                </span>
              </div>
              {item.details?.length > 0 && (
                <ul className="space-y-2">
                  {item.details.map((detail, idx) => (
                    <li key={idx} className="text-gray-300 text-sm">
                      {detail}
                    </li>
                  ))}
                </ul>
              )}
              {item.is_inferred && (
                <div className="mt-2 text-xs text-gray-400">
                  (Inferred data)
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Market Share Visualization */}
        <div className="mt-6 bg-[#2D2D2F] p-4 rounded-lg">
          <h4 className="font-medium text-white mb-4">Market Share Distribution</h4>
          <div className="space-y-3">
            {marketShareData.map((item, index) => {
              const sharePercentage = parseInt(item.market_share) || 0;
              return (
                <div key={index} className="relative">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{item.company}</span>
                    <span className="text-purple-400">{item.market_share}</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 rounded-full"
                      style={{ 
                        width: `${sharePercentage}%`,
                        transition: 'width 1s ease-in-out'
                      }}
                    />
                  </div>
                </div>
              );
            })}
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