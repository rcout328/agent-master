"use client";

import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Link from 'next/link';
import Comp from './Comp';

// Initialize Gemini
const genAI = new GoogleGenerativeAI("AIzaSyAE2SKBA38bOktQBdXS6mTK5Y1a-nKB3Mo");

export default function CompetitorTrackingContent() {
  const [viewMode, setViewMode] = useState('api'); // 'api' or 'web'
  const [storedSnapshots, setStoredSnapshots] = useState([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [processedData, setProcessedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCompAnalysis, setShowCompAnalysis] = useState(false);

  useEffect(() => {
    loadAllSnapshots();
  }, []);

  const loadAllSnapshots = () => {
    const allKeys = Object.keys(localStorage);
    const snapshots = allKeys
      .filter(key => key.includes('snapshot_'))
      .map(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          return {
            id: key.split('snapshot_')[1],
            data: data,
            timestamp: new Date().toISOString()
          };
        } catch (e) {
          console.error(`Error parsing snapshot ${key}:`, e);
          return null;
        }
      })
      .filter(Boolean);

    setStoredSnapshots(snapshots);
  };

  const processSnapshotData = async (snapshotData) => {
    try {
      setIsProcessing(true);
      console.log('Processing snapshot data:', snapshotData.id);
      
      // Extract data array from the snapshot
      let raw_data = [];
      if (snapshotData && snapshotData.data) {
        if (Array.isArray(snapshotData.data)) {
          raw_data = snapshotData.data;
        } else if (snapshotData.data.data && Array.isArray(snapshotData.data.data)) {
          raw_data = snapshotData.data.data;
        } else if (snapshotData.data.results && Array.isArray(snapshotData.data.results)) {
          raw_data = snapshotData.data.results;
        }
      }

      if (!Array.isArray(raw_data) || raw_data.length === 0) {
        throw new Error('No valid data array found in snapshot');
      }

      // Process competitor data
      const processed = {
        target_company: raw_data[0], // Assuming first company is target
        competitors: raw_data.slice(1, 6), // Take next 5 companies as competitors
        metrics: {
          market_presence: calculateMarketPresence(raw_data),
          technology_stack: analyzeTechnologyStack(raw_data),
          funding_comparison: compareFunding(raw_data),
          growth_metrics: calculateGrowthMetrics(raw_data)
        }
      };

      console.log('Processed competitor data:', processed);
      setProcessedData(processed);

    } catch (error) {
      console.error('Error processing data:', error);
      alert('Failed to process snapshot data: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper functions for competitor analysis
  const calculateMarketPresence = (data) => {
    return data.map(company => ({
      name: company.name,
      monthly_visits: company.monthly_visits || 0,
      social_presence: (company.social_media_links || []).length,
      regions: company.region || 'Unknown'
    }));
  };

  const analyzeTechnologyStack = (data) => {
    return data.map(company => ({
      name: company.name,
      tech_count: company.active_tech_count || 0,
      key_technologies: (company.builtwith_tech || [])
        .slice(0, 5)
        .map(tech => tech.name)
    }));
  };

  const compareFunding = (data) => {
    return data.map(company => ({
      name: company.name,
      funding_rounds: company.funding_rounds?.num_funding_rounds || 0,
      total_funding: company.funding_rounds?.value?.value_usd || 0,
      investors: company.num_investors || 0
    }));
  };

  const calculateGrowthMetrics = (data) => {
    return data.map(company => ({
      name: company.name,
      employee_growth: company.num_employees || 'Unknown',
      monthly_growth: company.monthly_visits_growth || 0,
      news_mentions: company.num_news || 0
    }));
  };

  const generateCompetitorAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      
      const prompt = `
        Analyze this competitor data and provide strategic insights:

        Target Company: ${processedData.target_company.name}
        ${processedData.target_company.about}

        Key Competitors:
        ${processedData.competitors.map(c => `- ${c.name}: ${c.about}`).join('\n')}

        Market Presence:
        ${JSON.stringify(processedData.metrics.market_presence, null, 2)}

        Technology Stack:
        ${JSON.stringify(processedData.metrics.technology_stack, null, 2)}

        Funding Comparison:
        ${JSON.stringify(processedData.metrics.funding_comparison, null, 2)}

        Growth Metrics:
        ${JSON.stringify(processedData.metrics.growth_metrics, null, 2)}

        Please provide:
        1. Competitive Position Analysis
        2. Strengths and Weaknesses vs Competitors
        3. Market Share Analysis
        4. Technology Stack Comparison
        5. Growth Strategy Recommendations

        Format the analysis in clear sections with bullet points.
      `;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const analysisText = response.text();

      setAnalysis({
        timestamp: new Date().toISOString(),
        snapshotId: selectedSnapshot.id,
        content: analysisText,
        processedData: processedData
      });

    } catch (error) {
      console.error('Error generating analysis:', error);
      if (error.message.includes('GoogleGenerativeAIFetchError')) {
        alert('An internal error occurred while generating analysis. Please try again later.');
      } else {
        alert('Failed to generate competitor analysis: ' + error.message);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const viewSnapshotData = (snapshot) => {
    setSelectedSnapshot(snapshot);
    processSnapshotData(snapshot);
  };

  const renderProcessedDataReview = () => {
    if (!processedData) return null;

    return (
      <div className="bg-[#1D1D1F]/90 p-6 rounded-xl backdrop-blur-xl border border-purple-500/20 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-purple-400">
            Competitor Analysis Results
          </h3>
          <div className="flex space-x-4">
            <button
              onClick={generateCompetitorAnalysis}
              disabled={isAnalyzing}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isAnalyzing 
                  ? 'bg-purple-600/50 cursor-not-allowed' 
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {isAnalyzing ? 'Analyzing...' : 'Generate AI Analysis'}
            </button>
            <button
              onClick={() => setProcessedData(null)}
              className="text-gray-400 hover:text-gray-300"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Target Company */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Target Company</h4>
            <div className="space-y-2">
              <p className="text-gray-300">Name: {processedData.target_company.name}</p>
              <p className="text-gray-300">About: {processedData.target_company.about}</p>
              <p className="text-gray-300">Region: {processedData.target_company.region}</p>
            </div>
          </div>

          {/* Key Competitors */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Key Competitors</h4>
            <div className="space-y-4">
              {processedData.competitors.map((competitor, index) => (
                <div key={index} className="p-3 bg-[#1D1D1F] rounded-lg">
                  <h5 className="font-semibold text-purple-300">{competitor.name}</h5>
                  <p className="text-gray-400 text-sm mt-1">{competitor.about}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Market Presence */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Market Presence</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedData.metrics.market_presence.map((company, index) => (
                <div key={index} className="p-3 bg-[#1D1D1F] rounded-lg">
                  <h5 className="font-semibold text-purple-300">{company.name}</h5>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-gray-300">Monthly Visits: {company.monthly_visits.toLocaleString()}</p>
                    <p className="text-gray-300">Social Presence: {company.social_presence}</p>
                    <p className="text-gray-300">Regions: {company.regions}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Technology Stack */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Technology Stack</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedData.metrics.technology_stack.map((company, index) => (
                <div key={index} className="p-3 bg-[#1D1D1F] rounded-lg">
                  <h5 className="font-semibold text-purple-300">{company.name}</h5>
                  <p className="text-gray-400 mt-1">Technologies: {company.tech_count}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {company.key_technologies.map((tech, i) => (
                      <span key={i} className="px-2 py-1 bg-purple-500/20 rounded-full text-xs text-purple-300">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Analysis Results */}
          {analysis && (
            <div className="bg-[#2D2D2F] p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-purple-400 mb-3">AI Analysis</h4>
              <div className="prose prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-300">
                  {analysis.content}
                </pre>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Generated on: {new Date(analysis.timestamp).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (showCompAnalysis) {
    return <Comp onClose={() => setShowCompAnalysis(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#black] text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Top Navigation */}
        <div className="flex justify-between items-center p-4 border-b border-gray-800">
          <div className="flex space-x-2">
            <button 
              onClick={() => setShowCompAnalysis(true)}
              className="px-4 py-2 bg-[#1D1D1F] rounded-lg text-white hover:bg-purple-600/20 transition-colors"
            >
              View Competitor Analysis
            </button>
          </div>
        </div>

        {/* Navigation and View Toggle */}
        <div className="flex items-center justify-between mb-8">
          <div className="bg-[#1D1D1F] p-1 rounded-xl inline-flex">
            <Link 
              href="/market-trends"
              className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-purple-600/50 transition-all duration-200"
            >
              Market Trends
            </Link>
            <button 
              className="px-4 py-2 rounded-lg bg-purple-600 text-white"
            >
              Competitor Tracking
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setViewMode('api')}
              className={`px-6 py-2 rounded-xl font-medium transition-colors ${
                viewMode === 'api'
                  ? 'bg-purple-600 text-white'
                  : 'bg-[#2D2D2F] text-gray-400 hover:text-white'
              }`}
            >
              API View
            </button>
            <button
              onClick={() => setViewMode('web')}
              className={`px-6 py-2 rounded-xl font-medium transition-colors ${
                viewMode === 'web'
                  ? 'bg-purple-600 text-white'
                  : 'bg-[#2D2D2F] text-gray-400 hover:text-white'
              }`}
            >
              Web View
            </button>
          </div>
        </div>

        {/* Rest of your existing content */}
        {/* ... */}
      </div>
    </div>
  );
}