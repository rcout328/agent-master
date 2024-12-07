"use client";

import { useState } from 'react';

export default function CompetitorTracking() {
  const [searchQuery, setSearchQuery] = useState('');
  const [apiResponse, setApiResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState('ASIA');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/competitor-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch data');
      }

      const data = await response.json();
      
      // Validate the response data
      if (!data || Object.keys(data).length === 0) {
        throw new Error('No data received from the API');
      }

      setApiResponse(data);
    } catch (error) {
      console.error('API Error:', error);
      setError(error.message || 'Failed to get competitor data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderCompetitors = () => {
    if (!apiResponse?.main_competitors?.length) return null;

    return (
      <div className="bg-[#1D1D1F] p-6 rounded-xl mb-6">
        <h3 className="text-xl font-semibold text-purple-400 mb-4">Top Competitors</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {apiResponse.main_competitors.map((competitor, index) => {
            const [name, description] = competitor.split(':').map(s => s.trim());
            return (
              <div key={index} className="bg-[#2D2D2F] p-4 rounded-lg">
                <h4 className="text-lg font-medium text-purple-300 mb-2">{name}</h4>
                <p className="text-gray-400 text-sm">{description}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStrengths = () => {
    if (!apiResponse?.competitor_strengths?.length) return null;

    return (
      <div className="bg-[#1D1D1F] p-6 rounded-xl mb-6">
        <h3 className="text-xl font-semibold text-purple-400 mb-4">Competitor Strengths</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {apiResponse.competitor_strengths.map((strength, index) => {
            const [name, strengths] = strength.split(':').map(s => s.trim());
            return (
              <div key={index} className="bg-[#2D2D2F] p-4 rounded-lg">
                <h4 className="text-lg font-medium text-purple-300 mb-2">{name}</h4>
                <div className="space-y-2">
                  {strengths.split(',').map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-purple-400 mt-1">•</span>
                      <span className="text-gray-300 text-sm">{s.trim()}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderInsights = () => {
    if (!apiResponse?.key_findings?.length) return null;

    return (
      <div className="bg-[#1D1D1F] p-6 rounded-xl mb-6">
        <h3 className="text-xl font-semibold text-purple-400 mb-4">Competitive Landscape Insights</h3>
        <div className="space-y-4">
          {apiResponse.key_findings.map((insight, index) => {
            const [title, description] = insight.split(':').map(s => s.trim());
            return (
              <div key={index} className="bg-[#2D2D2F] p-4 rounded-lg">
                <h4 className="text-lg font-medium text-purple-300 mb-2">{title}</h4>
                <p className="text-gray-300 text-sm">{description}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Search Section */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
            Competitor Analysis
          </h1>
          <div className="flex items-center gap-4">
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-4 py-2 bg-[#1D1D1F] rounded-xl text-gray-300 border-none outline-none"
            >
              <option value="ASIA">ASIA</option>
              <option value="EUROPE">EUROPE</option>
              <option value="USA">USA</option>
            </select>
            <button className="px-4 py-2 bg-[#1D1D1F] text-gray-300 rounded-xl hover:bg-purple-600/20">
              Export Report
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter company or product to analyze competitors..."
            className="flex-1 px-4 py-3 bg-[#1D1D1F] rounded-xl text-white placeholder-gray-400 border border-purple-500/20 focus:border-purple-500 outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !searchQuery.trim()}
            className={`px-6 py-3 rounded-xl font-medium transition-colors ${
              isLoading || !searchQuery.trim()
                ? 'bg-purple-600/50 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {isLoading ? 'Analyzing...' : 'Analyze Competitors'}
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {apiResponse && (
        <div className="max-w-7xl mx-auto space-y-8">
          {renderCompetitors()}
          {renderStrengths()}
          {renderInsights()}
          
          {/* Sources Section */}
          {apiResponse.sources?.length > 0 && (
            <div className="bg-[#1D1D1F] p-6 rounded-xl">
              <h3 className="text-xl font-semibold text-purple-400 mb-4">Data Sources</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {apiResponse.sources.map((source, index) => (
                  <div key={index} className="bg-[#2D2D2F] p-4 rounded-lg flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-purple-400">{index + 1}</span>
                    </div>
                    <div>
                      <a 
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        {source.domain}
                      </a>
                      <p className="text-gray-400 text-sm mt-1">
                        Accessed: {source.date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}