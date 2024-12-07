"use client";

import { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function MarketTrends() {
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
      const response = await fetch('http://127.0.0.1:5000/api/market-trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch data');
      }

      const data = await response.json();
      
      // Validate the response data
      if (!data || Object.keys(data).length === 0) {
        throw new Error('No data received from the API');
      }

      setApiResponse(data);
    } catch (error) {
      console.error('API Error:', error);
      setError(error.message || 'Failed to get market trends data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderSection = (title, data, icon) => {
    if (!data || Object.keys(data).length === 0) return null;

    return (
      <div className="bg-[#1D1D1F] p-6 rounded-xl mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{icon}</span>
          <h3 className="text-xl font-semibold text-purple-400">{title}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(data).map(([key, items], index) => (
            <div key={index} className="bg-[#2D2D2F] p-4 rounded-lg">
              <h4 className="text-lg font-medium text-purple-300 mb-3">
                {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </h4>
              <ul className="space-y-2">
                {Array.isArray(items) && items.length > 0 ? (
                  items.map((item, i) => (
                    <li key={i} className="text-gray-300 flex items-start gap-2">
                      <span className="text-purple-400 mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-gray-400">No data available</li>
                )}
                {Array.isArray(items) ? items.map((item, i) => (
                  <li key={i} className="text-gray-300 flex items-start gap-2">
                    <span className="text-purple-400 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                )) : (
                  <li className="text-gray-400">No data available</li>
                )}
              </ul>
            </div>
          ))}
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
            Market Analysis
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
            placeholder="Enter market or industry to analyze..."
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
            {isLoading ? 'Analyzing...' : 'Analyze Market'}
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
          {renderSection('Market Size & Dynamics', apiResponse.market_size_growth, '📊')}
          {renderSection('Competitive Landscape', apiResponse.competitive_landscape, '🎯')}
          {renderSection('Consumer Analysis', apiResponse.consumer_analysis, '👥')}
          {renderSection('Technology & Innovation', apiResponse.technology_innovation, '💡')}
          {renderSection('Regulatory & Environmental', apiResponse.regulatory_environment, '📋')}
          {renderSection('Future Outlook', apiResponse.future_outlook, '🔮')}
          {renderSection('Strategic Recommendations', apiResponse.strategic_recommendations, '🎯')}
          
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