"use client";

import { useState } from 'react';

export default function ICPAnalysis() {
  const [searchQuery, setSearchQuery] = useState('');
  const [apiResponse, setApiResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/icp-analysis', {
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
      setApiResponse(data);
    } catch (error) {
      console.error('API Error:', error);
      setError(error.message || 'Failed to get ICP data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderSection = (title, data, icon) => {
    if (!data?.length) return null;

    return (
      <div className="bg-[#1D1D1F] p-6 rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{icon}</span>
          <h3 className="text-xl font-semibold text-purple-400">{title}</h3>
        </div>
        <div className="space-y-3">
          {data.map((item, index) => {
            const [label, value] = item.includes(':') ? 
              item.split(':').map(s => s.trim()) : 
              [null, item];

            return (
              <div key={index} className="bg-[#2D2D2F] p-4 rounded-lg">
                {label ? (
                  <>
                    <h4 className="text-sm font-medium text-purple-300 mb-2">{label}</h4>
                    <p className="text-gray-300 text-sm">{value}</p>
                  </>
                ) : (
                  <p className="text-gray-300 text-sm">{item}</p>
                )}
                {item.includes('(Inferred)') && (
                  <span className="text-xs text-purple-400 mt-1 block">Inferred data point</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
              Ideal Customer Profile Analysis
            </h1>
            <p className="text-gray-400 mt-2">Create detailed ICP analysis for your business</p>
          </div>
          <button 
            onClick={() => {/* Add export functionality */}}
            className="px-4 py-2 bg-[#1D1D1F] text-gray-300 rounded-xl hover:bg-purple-600/20 transition-colors"
          >
            Export Analysis
          </button>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="flex gap-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter your business or product name..."
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
            {isLoading ? 'Analyzing...' : 'Create ICP'}
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
        <div className="max-w-7xl mx-auto space-y-6">
          {renderSection('Demographics', apiResponse.demographics, '👥')}
          {renderSection('Psychographics', apiResponse.psychographics, '🎯')}
          {renderSection('Professional Characteristics', apiResponse.professional, '💼')}
          {renderSection('Pain Points & Needs', apiResponse.pain_points, '❗')}
          {renderSection('Additional Insights', apiResponse.additional_insights, '💡')}
          
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