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

export default function CompetitorTrackingContent() {
  const [snapshotId, setSnapshotId] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [apiResponse, setApiResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(0);

  // Load cached data on mount
  useEffect(() => {
    const storedData = localStorage.getItem(`competitorAnalysis_${targetCompany}`);
    if (storedData) {
      setApiResponse(JSON.parse(storedData));
      setCurrentPhase(6);
    }
  }, [targetCompany]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!snapshotId.trim() || !targetCompany.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setCurrentPhase(1);

    try {
      const response = await fetch('http://127.0.0.1:5002/api/competitor-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          snapshot_id: snapshotId,
          target_company: targetCompany 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const data = await response.json();
      console.log('API Response:', data);

      if (data.success && data.data) {
        setCurrentPhase(2);
        setApiResponse(data.data);
        localStorage.setItem(`competitorAnalysis_${targetCompany}`, JSON.stringify(data.data));
      } else {
        throw new Error(data.error || 'Failed to analyze data');
      }

    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'Failed to get competitor analysis. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderCompanyMetrics = (metrics) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-[#1D1D1F] p-4 rounded-lg">
          <h4 className="font-medium text-white mb-2">Company Size</h4>
          <p className="text-gray-300">{metrics.employees}</p>
        </div>
        <div className="bg-[#1D1D1F] p-4 rounded-lg">
          <h4 className="font-medium text-white mb-2">Founded</h4>
          <p className="text-gray-300">{metrics.founded}</p>
        </div>
        <div className="bg-[#1D1D1F] p-4 rounded-lg">
          <h4 className="font-medium text-white mb-2">Region</h4>
          <p className="text-gray-300">{metrics.region}</p>
        </div>
        <div className="bg-[#1D1D1F] p-4 rounded-lg">
          <h4 className="font-medium text-white mb-2">Technologies</h4>
          <p className="text-gray-300">{metrics.tech_count} technologies</p>
        </div>
        <div className="bg-[#1D1D1F] p-4 rounded-lg">
          <h4 className="font-medium text-white mb-2">Monthly Visits</h4>
          <p className="text-gray-300">{metrics.monthly_visits.toLocaleString()}</p>
        </div>
        <div className="bg-[#1D1D1F] p-4 rounded-lg">
          <h4 className="font-medium text-white mb-2">Funding Rounds</h4>
          <p className="text-gray-300">{metrics.funding_rounds}</p>
        </div>
      </div>
    );
  };

  const renderCompetitorSection = (competitor) => {
    return (
      <div key={competitor.name} className="bg-[#2D2D2F] rounded-xl p-6 mb-6">
        <h3 className="text-xl font-semibold text-purple-400 mb-4">{competitor.name}</h3>
        <p className="text-gray-300 mb-4">{competitor.about}</p>
        {renderCompanyMetrics(competitor.metrics)}
      </div>
    );
  };

  const renderAnalysisSection = (title, items) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="bg-[#2D2D2F] rounded-xl p-6 mb-6">
        <h3 className="text-xl font-semibold text-purple-400 mb-4">{title}</h3>
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={index} className="text-gray-300 flex items-start space-x-2">
              <span className="text-purple-400">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">Competitor Analysis</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              value={snapshotId}
              onChange={(e) => setSnapshotId(e.target.value)}
              placeholder="Enter Brightdata snapshot ID..."
              className="w-full px-4 py-2 rounded-lg bg-[#2D2D2F] text-white border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
            <input
              type="text"
              value={targetCompany}
              onChange={(e) => setTargetCompany(e.target.value)}
              placeholder="Enter target company name..."
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
            {isLoading ? 'Analyzing...' : 'Analyze Competitors'}
          </button>
        </form>
      </div>

      {isLoading && (
        <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-purple-400">
              {currentPhase === 1 ? 'Fetching data...' : 'Analyzing competitors...'}
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
          {/* Target Company Section */}
          <div className="bg-[#2D2D2F] rounded-xl p-6 mb-6">
            <h3 className="text-xl font-semibold text-purple-400 mb-4">
              {apiResponse.target_company.name}
            </h3>
            <p className="text-gray-300 mb-4">{apiResponse.target_company.about}</p>
            {renderCompanyMetrics(apiResponse.target_company.metrics)}
          </div>

          {/* Competitors Section */}
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">Top Competitors</h3>
            {apiResponse.main_competitors.map(competitor => 
              renderCompetitorSection(competitor)
            )}
          </div>

          {/* SWOT Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderAnalysisSection("Strengths", apiResponse.competitive_analysis.strengths)}
            {renderAnalysisSection("Weaknesses", apiResponse.competitive_analysis.weaknesses)}
            {renderAnalysisSection("Opportunities", apiResponse.competitive_analysis.opportunities)}
            {renderAnalysisSection("Threats", apiResponse.competitive_analysis.threats)}
          </div>

          {/* Detailed Analysis */}
          {apiResponse.analysis_report && (
            <div className="bg-[#2D2D2F] rounded-xl p-6 mb-6">
              <h3 className="text-xl font-semibold text-purple-400 mb-4">Detailed Analysis</h3>
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
              element.download = `competitor_analysis_${targetCompany}_${new Date().toISOString()}.json`;
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