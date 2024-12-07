"use client";

import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Link from 'next/link';
import Swot from './Swot';

// Initialize Gemini
const genAI = new GoogleGenerativeAI("AIzaSyAE2SKBA38bOktQBdXS6mTK5Y1a-nKB3Mo");

export default function SWOTAnalysisContent() {
  const [viewMode, setViewMode] = useState('api'); // 'api' or 'web'
  const [storedSnapshots, setStoredSnapshots] = useState([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [processedData, setProcessedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

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

      // Process SWOT data
      const processed = {
        strengths: analyzeStrengths(raw_data),
        weaknesses: analyzeWeaknesses(raw_data),
        opportunities: analyzeOpportunities(raw_data),
        threats: analyzeThreats(raw_data),
        metrics: analyzeMetrics(raw_data)
      };

      console.log('Processed SWOT data:', processed);
      setProcessedData(processed);

    } catch (error) {
      console.error('Error processing data:', error);
      alert('Failed to process snapshot data: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const analyzeStrengths = (data) => {
    return data
      .filter(company => company.about || company.funding_rounds)
      .map(company => ({
        name: company.name,
        description: company.about,
        funding_rounds: company.funding_rounds?.num_funding_rounds || 0,
        funds_raised: company.funding_rounds?.value?.value_usd || 0,
        market_presence: company.monthly_visits || 0
      }))
      .filter(item => item.description || item.funding_rounds > 0);
  };

  const analyzeWeaknesses = (data) => {
    return data
      .filter(company => company.web_traffic_by_semrush)
      .map(company => ({
        name: company.name,
        bounce_rate: company.web_traffic_by_semrush.bounce_rate_pct,
        traffic_decline: company.web_traffic_by_semrush.monthly_rank_growth_pct < 0,
        low_engagement: company.web_traffic_by_semrush.visit_duration < 100
      }))
      .filter(item => item.bounce_rate > 50 || item.traffic_decline || item.low_engagement);
  };

  const analyzeOpportunities = (data) => {
    return data
      .filter(company => company.featured_list || company.industries)
      .map(company => ({
        name: company.name,
        market_size: company.featured_list?.[0]?.org_funding_total?.value_usd || 0,
        industries: company.industries?.map(i => i.value) || [],
        potential_growth: calculateGrowthPotential(company)
      }))
      .filter(item => item.market_size > 0 || item.industries.length > 0);
  };

  const analyzeThreats = (data) => {
    return data
      .filter(company => company.competitors || company.news)
      .map(company => ({
        name: company.name,
        competitor_count: company.similar_companies?.length || 0,
        news_mentions: company.news?.length || 0,
        market_risks: identifyMarketRisks(company)
      }))
      .filter(item => item.competitor_count > 0 || item.news_mentions > 0);
  };

  const analyzeMetrics = (data) => {
    return {
      total_funding: data.reduce((sum, company) => sum + (company.funding_rounds?.value?.value_usd || 0), 0),
      avg_market_size: Math.round(data.reduce((sum, company) => sum + (company.featured_list?.[0]?.org_funding_total?.value_usd || 0), 0) / data.length),
      total_competitors: data.reduce((sum, company) => sum + (company.similar_companies?.length || 0), 0),
      news_coverage: data.reduce((sum, company) => sum + (company.news?.length || 0), 0)
    };
  };

  const calculateGrowthPotential = (company) => {
    const opportunities = [];
    if (company.featured_list?.[0]?.org_funding_total?.value_usd > 1000000) {
      opportunities.push('Large market opportunity');
    }
    if (company.industries?.length > 2) {
      opportunities.push('Multi-industry presence');
    }
    if (company.monthly_visits_growth > 0) {
      opportunities.push('Growing market interest');
    }
    return opportunities;
  };

  const identifyMarketRisks = (company) => {
    const risks = [];
    if (company.similar_companies?.length > 5) {
      risks.push('High competition');
    }
    if (company.web_traffic_by_semrush?.monthly_rank_growth_pct < -10) {
      risks.push('Declining market position');
    }
    if (company.news?.some(n => n.title?.toLowerCase().includes('risk'))) {
      risks.push('Negative market sentiment');
    }
    return risks;
  };

  const generateAIAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      
      const prompt = `
        Analyze this SWOT data and provide strategic insights:

        Strengths:
        ${JSON.stringify(processedData.strengths, null, 2)}

        Weaknesses:
        ${JSON.stringify(processedData.weaknesses, null, 2)}

        Opportunities:
        ${JSON.stringify(processedData.opportunities, null, 2)}

        Threats:
        ${JSON.stringify(processedData.threats, null, 2)}

        Key Metrics:
        ${JSON.stringify(processedData.metrics, null, 2)}

        Please provide:
        1. Strategic Analysis
        2. Key Findings
        3. Competitive Position
        4. Growth Recommendations
        5. Risk Mitigation Strategies

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
      alert('Failed to generate analysis: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderProcessedDataReview = () => {
    if (!processedData) return null;

    return (
      <div className="bg-black p-6 rounded-xl backdrop-blur-xl border border-purple-500/20 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-purple-400">
            SWOT Analysis Results
          </h3>
          <div className="flex space-x-4">
            <button
              onClick={generateAIAnalysis}
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
          {/* Strengths Section */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Strengths</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedData.strengths.map((item, index) => (
                <div key={index} className="p-3 bg-[#1D1D1F] rounded-lg">
                  <h5 className="font-semibold text-purple-300">{item.name}</h5>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-gray-300">Description: {item.description}</p>
                    <p className="text-gray-300">Funding Rounds: {item.funding_rounds}</p>
                    <p className="text-gray-300">Funds Raised: ${item.funds_raised?.toLocaleString()}</p>
                    <p className="text-gray-300">Market Presence: {item.market_presence?.toLocaleString()} visits</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weaknesses Section */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Weaknesses</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedData.weaknesses.map((item, index) => (
                <div key={index} className="p-3 bg-[#1D1D1F] rounded-lg">
                  <h5 className="font-semibold text-purple-300">{item.name}</h5>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-gray-300">Bounce Rate: {item.bounce_rate}%</p>
                    <p className="text-gray-300">Traffic Trend: {item.traffic_decline ? 'Declining' : 'Stable'}</p>
                    <p className="text-gray-300">Engagement: {item.low_engagement ? 'Low' : 'Normal'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Opportunities Section */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Opportunities</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedData.opportunities.map((item, index) => (
                <div key={index} className="p-3 bg-[#1D1D1F] rounded-lg">
                  <h5 className="font-semibold text-purple-300">{item.name}</h5>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-gray-300">Market Size: ${item.market_size?.toLocaleString()}</p>
                    <p className="text-gray-300">Industries: {item.industries.join(', ')}</p>
                    <div className="mt-2">
                      <p className="text-gray-400 font-semibold">Growth Potential:</p>
                      <ul className="list-disc list-inside text-gray-300">
                        {item.potential_growth.map((potential, i) => (
                          <li key={i}>{potential}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Threats Section */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Threats</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedData.threats.map((item, index) => (
                <div key={index} className="p-3 bg-[#1D1D1F] rounded-lg">
                  <h5 className="font-semibold text-purple-300">{item.name}</h5>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-gray-300">Competitors: {item.competitor_count}</p>
                    <p className="text-gray-300">News Mentions: {item.news_mentions}</p>
                    <div className="mt-2">
                      <p className="text-gray-400 font-semibold">Market Risks:</p>
                      <ul className="list-disc list-inside text-gray-300">
                        {item.market_risks.map((risk, i) => (
                          <li key={i}>{risk}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Key Metrics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-[#1D1D1F] rounded-lg">
                <p className="text-sm text-gray-400">Total Funding</p>
                <p className="text-xl font-semibold text-purple-300">
                  ${processedData.metrics.total_funding.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-[#1D1D1F] rounded-lg">
                <p className="text-sm text-gray-400">Avg Market Size</p>
                <p className="text-xl font-semibold text-purple-300">
                  ${processedData.metrics.avg_market_size.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-[#1D1D1F] rounded-lg">
                <p className="text-sm text-gray-400">Total Competitors</p>
                <p className="text-xl font-semibold text-purple-300">
                  {processedData.metrics.total_competitors.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-[#1D1D1F] rounded-lg">
                <p className="text-sm text-gray-400">News Coverage</p>
                <p className="text-xl font-semibold text-purple-300">
                  {processedData.metrics.news_coverage.toLocaleString()}
                </p>
              </div>
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

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Navigation and View Toggle */}
        <div className="flex items-center justify-between mb-8">
          <div className="bg-[#1D1D1F] p-1 rounded-xl inline-flex">
            <button 
              className="px-4 py-2 rounded-lg bg-purple-600 text-white"
            >
              SWOT Analysis
            </button>
            <Link 
              href="/gap-analysis"
              className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-purple-600/50 transition-all duration-200"
            >
              Gap Analysis
            </Link>
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

        {/* Render content based on view mode */}
        {viewMode === 'web' ? (
          // Web View - Swot Component
          <Swot />
        ) : (
          // API View - Snapshot List
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">Stored Snapshots</h2>
              
              {/* Snapshot Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {storedSnapshots.map((snapshot) => (
                  <div 
                    key={snapshot.id}
                    className="bg-[#1D1D1F]/90 p-6 rounded-xl backdrop-blur-xl border border-purple-500/20 hover:border-purple-500/40 transition-all cursor-pointer"
                    onClick={() => setSelectedSnapshot(snapshot)}
                  >
                    <div className="flex flex-col space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-200 font-mono text-sm">{snapshot.id}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(snapshot.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {/* Preview of data */}
                      <div className="mt-2 text-sm text-gray-400">
                        {snapshot.data && typeof snapshot.data === 'object' && (
                          <div className="space-y-1">
                            {Object.keys(snapshot.data).slice(0, 3).map(key => (
                              <div key={key} className="truncate">
                                {key}: {typeof snapshot.data[key] === 'object' ? '...' : snapshot.data[key]}
                              </div>
                            ))}
                            {Object.keys(snapshot.data).length > 3 && (
                              <div className="text-purple-400">+ more data...</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Selected Snapshot Details */}
              {selectedSnapshot && (
                <div className="mt-8 space-y-6">
                  <div className="bg-[#1D1D1F]/90 p-6 rounded-xl backdrop-blur-xl border border-purple-500/20">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-semibold text-purple-400">
                        Snapshot Details: {selectedSnapshot.id}
                      </h3>
                      <div className="flex space-x-4">
                        <button 
                          onClick={() => processSnapshotData(selectedSnapshot)}
                          disabled={isProcessing}
                          className={`px-4 py-2 rounded-lg transition-colors ${
                            isProcessing 
                              ? 'bg-purple-600/50 cursor-not-allowed' 
                              : 'bg-purple-600 hover:bg-purple-700'
                          }`}
                        >
                          {isProcessing ? 'Processing...' : 'Process Data'}
                        </button>
                        <button 
                          onClick={() => setSelectedSnapshot(null)}
                          className="text-gray-400 hover:text-gray-300"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                    <pre className="bg-[#2D2D2F] p-4 rounded-lg overflow-auto max-h-96 text-sm text-gray-300">
                      {JSON.stringify(selectedSnapshot.data, null, 2)}
                    </pre>
                  </div>

                  {/* Processed Data Review */}
                  {renderProcessedDataReview()}
                </div>
              )}

              {/* Empty State */}
              {storedSnapshots.length === 0 && (
                <div className="text-center text-gray-400 py-12">
                  No stored snapshots found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 