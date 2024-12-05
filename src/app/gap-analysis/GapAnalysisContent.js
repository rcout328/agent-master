"use client";

import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Link from 'next/link';
import Gap from './Gap';

// Initialize Gemini
const genAI = new GoogleGenerativeAI("AIzaSyAE2SKBA38bOktQBdXS6mTK5Y1a-nKB3Mo");

export default function GapAnalysisContent() {
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

      // Process gap analysis data
      const processed = {
        current_state: analyzeCurrentState(raw_data),
        desired_state: analyzeDesiredState(raw_data),
        identified_gaps: identifyGaps(raw_data),
        recommendations: generateRecommendations(raw_data),
        metrics: analyzeMetrics(raw_data)
      };

      console.log('Processed gap data:', processed);
      setProcessedData(processed);

    } catch (error) {
      console.error('Error processing data:', error);
      alert('Failed to process snapshot data: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const analyzeCurrentState = (data) => {
    return data
      .filter(company => company.active_tech_count || company.total_active_products)
      .map(company => ({
        name: company.name,
        tech_stack: company.active_tech_count || 0,
        products: company.total_active_products || 0,
        contact_channels: company.num_contacts || 0,
        funding_status: company.funding_rounds?.num_funding_rounds || 0
      }))
      .filter(item => item.tech_stack > 0 || item.products > 0);
  };

  const analyzeDesiredState = (data) => {
    return data
      .filter(company => company.similar_companies)
      .map(company => {
        const competitors = company.similar_companies || [];
        const avgTechStack = competitors.reduce((sum, comp) => sum + (comp.active_tech_count || 0), 0) / competitors.length;
        const avgProducts = competitors.reduce((sum, comp) => sum + (comp.total_active_products || 0), 0) / competitors.length;
        
        return {
          name: company.name,
          target_tech_stack: Math.round(avgTechStack),
          target_products: Math.round(avgProducts),
          market_benchmark: calculateMarketBenchmark(company, competitors)
        };
      })
      .filter(item => item.target_tech_stack > 0 || item.target_products > 0);
  };

  const identifyGaps = (data) => {
    return data
      .filter(company => company.active_tech_count || company.total_active_products)
      .map(company => ({
        name: company.name,
        tech_gap: calculateTechGap(company),
        product_gap: calculateProductGap(company),
        funding_gap: calculateFundingGap(company),
        contact_gap: calculateContactGap(company)
      }))
      .filter(item => item.tech_gap || item.product_gap || item.funding_gap || item.contact_gap);
  };

  const generateRecommendations = (data) => {
    return data.map(company => ({
      name: company.name,
      tech_recommendations: generateTechRecommendations(company),
      product_recommendations: generateProductRecommendations(company),
      funding_recommendations: generateFundingRecommendations(company),
      contact_recommendations: generateContactRecommendations(company)
    }));
  };

  const analyzeMetrics = (data) => {
    return {
      avg_tech_stack: Math.round(data.reduce((sum, company) => sum + (company.active_tech_count || 0), 0) / data.length),
      avg_products: Math.round(data.reduce((sum, company) => sum + (company.total_active_products || 0), 0) / data.length),
      avg_funding_rounds: Math.round(data.reduce((sum, company) => sum + (company.funding_rounds?.num_funding_rounds || 0), 0) / data.length),
      avg_contacts: Math.round(data.reduce((sum, company) => sum + (company.num_contacts || 0), 0) / data.length)
    };
  };

  // Helper functions
  const calculateMarketBenchmark = (company, competitors) => {
    return {
      tech_level: 'Advanced',
      product_maturity: 'High',
      market_position: 'Leader',
      funding_status: 'Well-funded'
    };
  };

  const calculateTechGap = (company) => {
    const gaps = [];
    if (company.active_tech_count < 20) gaps.push('Limited tech stack');
    if (!company.builtwith_tech?.length) gaps.push('Missing technology data');
    return gaps;
  };

  const calculateProductGap = (company) => {
    const gaps = [];
    if (company.total_active_products < 5) gaps.push('Limited product portfolio');
    if (!company.products_and_services?.length) gaps.push('Missing product data');
    return gaps;
  };

  const calculateFundingGap = (company) => {
    const gaps = [];
    if (!company.funding_rounds?.num_funding_rounds) gaps.push('No funding history');
    if (!company.funding_rounds?.value?.value_usd) gaps.push('Limited funding amount');
    return gaps;
  };

  const calculateContactGap = (company) => {
    const gaps = [];
    if (!company.num_contacts) gaps.push('Limited contact channels');
    if (!company.contact_email && !company.contact_phone) gaps.push('Missing contact information');
    return gaps;
  };

  // Recommendation generators
  const generateTechRecommendations = (company) => {
    const recommendations = [];
    if (company.active_tech_count < 20) {
      recommendations.push('Expand technology stack');
      recommendations.push('Adopt modern technologies');
    }
    return recommendations;
  };

  const generateProductRecommendations = (company) => {
    const recommendations = [];
    if (company.total_active_products < 5) {
      recommendations.push('Diversify product portfolio');
      recommendations.push('Develop new offerings');
    }
    return recommendations;
  };

  const generateFundingRecommendations = (company) => {
    const recommendations = [];
    if (!company.funding_rounds?.num_funding_rounds) {
      recommendations.push('Seek funding opportunities');
      recommendations.push('Develop funding strategy');
    }
    return recommendations;
  };

  const generateContactRecommendations = (company) => {
    const recommendations = [];
    if (!company.num_contacts) {
      recommendations.push('Expand contact channels');
      recommendations.push('Improve accessibility');
    }
    return recommendations;
  };

  const generateAIAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      
      const prompt = `
        Analyze this gap analysis data and provide strategic insights:

        Current State:
        ${JSON.stringify(processedData.current_state, null, 2)}

        Desired State:
        ${JSON.stringify(processedData.desired_state, null, 2)}

        Identified Gaps:
        ${JSON.stringify(processedData.identified_gaps, null, 2)}

        Recommendations:
        ${JSON.stringify(processedData.recommendations, null, 2)}

        Key Metrics:
        ${JSON.stringify(processedData.metrics, null, 2)}

        Please provide:
        1. Gap Analysis Summary
        2. Critical Areas
        3. Priority Actions
        4. Implementation Timeline
        5. Success Metrics

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
      <div className="bg-[#1D1D1F]/90 p-6 rounded-xl backdrop-blur-xl border border-purple-500/20 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-purple-400">
            Gap Analysis Results
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
          {/* Current State Section */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Current State</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedData.current_state.map((item, index) => (
                <div key={index} className="p-3 bg-[#1D1D1F] rounded-lg">
                  <h5 className="font-semibold text-purple-300">{item.name}</h5>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-gray-300">Tech Stack: {item.tech_stack}</p>
                    <p className="text-gray-300">Products: {item.products}</p>
                    <p className="text-gray-300">Contact Channels: {item.contact_channels}</p>
                    <p className="text-gray-300">Funding Rounds: {item.funding_status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desired State Section */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Desired State</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedData.desired_state.map((item, index) => (
                <div key={index} className="p-3 bg-[#1D1D1F] rounded-lg">
                  <h5 className="font-semibold text-purple-300">{item.name}</h5>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-gray-300">Target Tech Stack: {item.target_tech_stack}</p>
                    <p className="text-gray-300">Target Products: {item.target_products}</p>
                    <div className="mt-2">
                      <p className="text-gray-400 font-semibold">Market Benchmark:</p>
                      <ul className="list-disc list-inside text-gray-300">
                        <li>Tech Level: {item.market_benchmark.tech_level}</li>
                        <li>Product Maturity: {item.market_benchmark.product_maturity}</li>
                        <li>Market Position: {item.market_benchmark.market_position}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Identified Gaps Section */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Identified Gaps</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedData.identified_gaps.map((item, index) => (
                <div key={index} className="p-3 bg-[#1D1D1F] rounded-lg">
                  <h5 className="font-semibold text-purple-300">{item.name}</h5>
                  <div className="mt-2 space-y-2">
                    {item.tech_gap?.length > 0 && (
                      <div>
                        <p className="text-gray-400 font-semibold">Tech Gaps:</p>
                        <ul className="list-disc list-inside text-gray-300">
                          {item.tech_gap.map((gap, i) => <li key={i}>{gap}</li>)}
                        </ul>
                      </div>
                    )}
                    {item.product_gap?.length > 0 && (
                      <div>
                        <p className="text-gray-400 font-semibold">Product Gaps:</p>
                        <ul className="list-disc list-inside text-gray-300">
                          {item.product_gap.map((gap, i) => <li key={i}>{gap}</li>)}
                        </ul>
                      </div>
                    )}
                    {item.funding_gap?.length > 0 && (
                      <div>
                        <p className="text-gray-400 font-semibold">Funding Gaps:</p>
                        <ul className="list-disc list-inside text-gray-300">
                          {item.funding_gap.map((gap, i) => <li key={i}>{gap}</li>)}
                        </ul>
                      </div>
                    )}
                    {item.contact_gap?.length > 0 && (
                      <div>
                        <p className="text-gray-400 font-semibold">Contact Gaps:</p>
                        <ul className="list-disc list-inside text-gray-300">
                          {item.contact_gap.map((gap, i) => <li key={i}>{gap}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations Section */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Recommendations</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedData.recommendations.map((item, index) => (
                <div key={index} className="p-3 bg-[#1D1D1F] rounded-lg">
                  <h5 className="font-semibold text-purple-300">{item.name}</h5>
                  <div className="mt-2 space-y-2">
                    {item.tech_recommendations?.length > 0 && (
                      <div>
                        <p className="text-gray-400 font-semibold">Tech Recommendations:</p>
                        <ul className="list-disc list-inside text-gray-300">
                          {item.tech_recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                        </ul>
                      </div>
                    )}
                    {item.product_recommendations?.length > 0 && (
                      <div>
                        <p className="text-gray-400 font-semibold">Product Recommendations:</p>
                        <ul className="list-disc list-inside text-gray-300">
                          {item.product_recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                        </ul>
                      </div>
                    )}
                    {item.funding_recommendations?.length > 0 && (
                      <div>
                        <p className="text-gray-400 font-semibold">Funding Recommendations:</p>
                        <ul className="list-disc list-inside text-gray-300">
                          {item.funding_recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                        </ul>
                      </div>
                    )}
                    {item.contact_recommendations?.length > 0 && (
                      <div>
                        <p className="text-gray-400 font-semibold">Contact Recommendations:</p>
                        <ul className="list-disc list-inside text-gray-300">
                          {item.contact_recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                        </ul>
                      </div>
                    )}
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
                <p className="text-sm text-gray-400">Avg Tech Stack</p>
                <p className="text-xl font-semibold text-purple-300">
                  {processedData.metrics.avg_tech_stack}
                </p>
              </div>
              <div className="p-3 bg-[#1D1D1F] rounded-lg">
                <p className="text-sm text-gray-400">Avg Products</p>
                <p className="text-xl font-semibold text-purple-300">
                  {processedData.metrics.avg_products}
                </p>
              </div>
              <div className="p-3 bg-[#1D1D1F] rounded-lg">
                <p className="text-sm text-gray-400">Avg Funding Rounds</p>
                <p className="text-xl font-semibold text-purple-300">
                  {processedData.metrics.avg_funding_rounds}
                </p>
              </div>
              <div className="p-3 bg-[#1D1D1F] rounded-lg">
                <p className="text-sm text-gray-400">Avg Contacts</p>
                <p className="text-xl font-semibold text-purple-300">
                  {processedData.metrics.avg_contacts}
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
    <div className="min-h-screen bg-[#131314] text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Navigation and View Toggle */}
        <div className="flex items-center justify-between mb-8">
          <div className="bg-[#1D1D1F] p-1 rounded-xl inline-flex">
            <Link 
              href="/swot-analysis"
              className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-purple-600/50 transition-all duration-200"
            >
              SWOT Analysis
            </Link>
            <button 
              className="px-4 py-2 rounded-lg bg-purple-600 text-white"
            >
              Gap Analysis
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

        {/* Render content based on view mode */}
        {viewMode === 'web' ? (
          // Web View - Gap Component
          <Gap />
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