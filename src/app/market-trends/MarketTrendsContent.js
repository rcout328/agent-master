"use client";

import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function MarketTrendsContent() {
  const [snapshotId, setSnapshotId] = useState('');
  const [apiResponse, setApiResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(0);

  // Load cached data on mount
  useEffect(() => {
    const storedData = localStorage.getItem('marketTrendsData');
    if (storedData) {
      setApiResponse(JSON.parse(storedData));
      setCurrentPhase(6);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!snapshotId.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setCurrentPhase(1);

    try {
      const response = await fetch('http://127.0.0.1:5002/api/market-trends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ snapshot_id: snapshotId }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const data = await response.json();
      console.log('API Response:', data);

      if (data.success && data.data) {
        // Update data progressively
        setCurrentPhase(2);
        setApiResponse(data.data);
        localStorage.setItem('marketTrendsData', JSON.stringify(data.data));
      } else {
        throw new Error(data.error || 'Failed to analyze data');
      }

    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'Failed to get market trends data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderMarketSection = (title, data) => {
    if (!data) return null;

    return (
      <div className="bg-[#2D2D2F] rounded-xl p-6 mb-6">
        <h3 className="text-xl font-semibold text-purple-400 mb-4">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(data).map(([key, value], index) => (
            <div key={index} className="bg-[#1D1D1F] p-4 rounded-lg">
              <h4 className="font-medium text-white mb-2">
                {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </h4>
              {Array.isArray(value) ? (
                <ul className="space-y-2">
                  {value.map((item, i) => (
                    <li key={i} className="text-gray-300">{item}</li>
                  ))}
                </ul>
              ) : typeof value === 'object' ? (
                <ul className="space-y-2">
                  {Object.entries(value).map(([k, v], i) => (
                    <li key={i} className="text-gray-300">
                      {k}: {typeof v === 'number' ? v.toFixed(2) : v}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-300">{value}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMarketShareChart = (metrics) => {
    if (!metrics?.market_share) return null;

    const data = {
      labels: Object.keys(metrics.market_share),
      datasets: [{
        label: 'Market Share (%)',
        data: Object.values(metrics.market_share),
        backgroundColor: [
          'rgba(147, 51, 234, 0.5)',
          'rgba(59, 130, 246, 0.5)',
          'rgba(16, 185, 129, 0.5)',
          'rgba(245, 158, 11, 0.5)',
          'rgba(239, 68, 68, 0.5)',
        ],
        borderColor: [
          'rgb(147, 51, 234)',
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 1
      }]
    };

    const options = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: 'rgb(156, 163, 175)' }
        },
        title: {
          display: true,
          text: 'Market Share Distribution',
          color: 'rgb(156, 163, 175)'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: 'rgb(156, 163, 175)' },
          grid: { color: 'rgba(31, 41, 55, 0.2)' }
        },
        x: {
          ticks: { color: 'rgb(156, 163, 175)' },
          grid: { color: 'rgba(31, 41, 55, 0.2)' }
        }
      }
    };

    return (
      <div className="bg-[#2D2D2F] rounded-xl p-6 mb-6">
        <Bar data={data} options={options} />
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">Market Trends Analysis</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={snapshotId}
              onChange={(e) => setSnapshotId(e.target.value)}
              placeholder="Enter Brightdata snapshot ID..."
              className="w-full px-4 py-2 rounded-lg bg-[#2D2D2F] text-white border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 rounded-lg font-medium transition-all duration-200
              ${isLoading 
                ? 'bg-gray-600 cursor-not-allowed' 
                : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
          >
            {isLoading ? 'Analyzing...' : 'Analyze Market'}
          </button>
        </form>
      </div>

      {isLoading && (
        <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-purple-400">
              {currentPhase === 1 ? 'Fetching data...' : 'Analyzing market data...'}
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-red-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span className="text-red-400">{error}</span>
          </div>
        </div>
      )}

      {apiResponse && (
        <div className="space-y-8">
          {renderMarketSection("Market Size & Growth", apiResponse.market_size_growth)}
          {renderMarketShareChart(apiResponse.metrics)}
          {renderMarketSection("Competitive Landscape", apiResponse.competitive_landscape)}
          {renderMarketSection("Industry Trends", apiResponse.industry_trends)}
          
          {/* Gemini Analysis Report Section */}
          {apiResponse.analysis_report && (
            <div className="bg-[#2D2D2F] rounded-xl p-6 mb-6">
              <h3 className="text-xl font-semibold text-purple-400 mb-4">Market Analysis Report</h3>
              <div className="bg-[#1D1D1F] p-4 rounded-lg">
                <div className="prose prose-invert max-w-none">
                  <pre className="text-gray-300 whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {apiResponse.analysis_report}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Export Button */}
          <button
            onClick={() => {
              const element = document.createElement("a");
              const file = new Blob([JSON.stringify(apiResponse, null, 2)], {
                type: "application/json",
              });
              element.href = URL.createObjectURL(file);
              element.download = `market_analysis_${snapshotId}_${new Date().toISOString()}.json`;
              document.body.appendChild(element);
              element.click();
            }}
            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors"
          >
            Export Analysis
          </button>
        </div>
      )}
    </div>
  );
}