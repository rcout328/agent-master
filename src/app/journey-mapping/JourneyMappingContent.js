"use client";

import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Link from 'next/link';
import Journey from './Joureny';

// Initialize Gemini
const genAI = new GoogleGenerativeAI("AIzaSyAE2SKBA38bOktQBdXS6mTK5Y1a-nKB3Mo");

export default function JourneyMappingContent() {
  const [viewMode, setViewMode] = useState('api'); // 'api' or 'web'
  const [storedSnapshots, setStoredSnapshots] = useState([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [processedData, setProcessedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

      // Process journey data
      const processed = {
        pre_purchase: analyzePrePurchase(raw_data),
        purchase: analyzePurchase(raw_data),
        post_purchase: analyzePostPurchase(raw_data),
        optimization: analyzeOptimization(raw_data),
        metrics: analyzeMetrics(raw_data)
      };

      console.log('Processed journey data:', processed);
      setProcessedData(processed);

    } catch (error) {
      console.error('Error processing data:', error);
      alert('Failed to process snapshot data: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper functions for journey analysis
  const analyzePrePurchase = (data) => {
    return data
      .filter(company => company.web_traffic_by_semrush)
      .map(company => ({
        name: company.name,
        traffic_rank: company.web_traffic_by_semrush.global_traffic_rank,
        visit_duration: company.web_traffic_by_semrush.visit_duration,
        bounce_rate: company.web_traffic_by_semrush.bounce_rate_pct,
        page_views: company.web_traffic_by_semrush.page_views_per_visit,
        monthly_visits: company.monthly_visits || 0
      }))
      .filter(item => item.traffic_rank || item.monthly_visits);
  };

  const analyzePurchase = (data) => {
    return data
      .filter(company => company.featured_list)
      .map(company => ({
        name: company.name,
        funding_total: company.featured_list[0]?.org_funding_total?.value_usd || 0,
        num_investors: company.featured_list[0]?.org_num_investors || 0,
        org_count: company.featured_list[0]?.org_num || 0
      }))
      .filter(item => item.funding_total || item.num_investors);
  };

  const analyzePostPurchase = (data) => {
    return data
      .filter(company => company.social_media_links || company.num_contacts)
      .map(company => ({
        name: company.name,
        social_presence: company.social_media_links?.length || 0,
        contact_channels: company.num_contacts || 0,
        engagement_score: calculateEngagementScore(company)
      }))
      .filter(item => item.social_presence || item.contact_channels);
  };

  const analyzeOptimization = (data) => {
    return data
      .filter(company => company.web_traffic_by_semrush)
      .map(company => ({
        name: company.name,
        growth_opportunities: identifyGrowthOpportunities(company),
        improvement_areas: findImprovementAreas(company)
      }))
      .filter(item => item.growth_opportunities.length || item.improvement_areas.length);
  };

  const analyzeMetrics = (data) => {
    return {
      total_monthly_visits: data.reduce((sum, company) => sum + (company.monthly_visits || 0), 0),
      avg_bounce_rate: Math.round(data.reduce((sum, company) => sum + (company.web_traffic_by_semrush?.bounce_rate_pct || 0), 0) / data.filter(c => c.web_traffic_by_semrush?.bounce_rate_pct).length),
      total_funding: data.reduce((sum, company) => sum + (company.featured_list?.[0]?.org_funding_total?.value_usd || 0), 0),
      total_investors: data.reduce((sum, company) => sum + (company.featured_list?.[0]?.org_num_investors || 0), 0)
    };
  };

  // Additional helper functions
  const calculateEngagementScore = (company) => {
    let score = 0;
    if (company.monthly_visits) score += company.monthly_visits / 1000;
    if (company.web_traffic_by_semrush?.visit_duration) score += company.web_traffic_by_semrush.visit_duration / 10;
    if (company.web_traffic_by_semrush?.page_views_per_visit) score += company.web_traffic_by_semrush.page_views_per_visit * 20;
    if (company.social_media_links) score += company.social_media_links.length * 10;
    return Math.round(score);
  };

  const identifyGrowthOpportunities = (company) => {
    const opportunities = [];
    if (company.web_traffic_by_semrush?.bounce_rate_pct > 50) opportunities.push('Reduce bounce rate');
    if (company.web_traffic_by_semrush?.visit_duration < 100) opportunities.push('Increase visit duration');
    if (company.web_traffic_by_semrush?.page_views_per_visit < 2) opportunities.push('Improve page views');
    if (!company.social_media_links?.length) opportunities.push('Expand social presence');
    return opportunities;
  };

  const findImprovementAreas = (company) => {
    const areas = [];
    if (!company.featured_list?.length) areas.push('Expand market presence');
    if (!company.num_contacts) areas.push('Increase contact channels');
    if (company.web_traffic_by_semrush?.monthly_rank_growth_pct < 0) areas.push('Improve traffic ranking');
    return areas;
  };

  const generateAIAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      
      const prompt = `
        Analyze this customer journey data and provide strategic insights:

        Pre-Purchase Metrics:
        ${JSON.stringify(processedData.pre_purchase, null, 2)}

        Purchase Data:
        ${JSON.stringify(processedData.purchase, null, 2)}

        Post-Purchase Analysis:
        ${JSON.stringify(processedData.post_purchase, null, 2)}

        Key Metrics:
        ${JSON.stringify(processedData.metrics, null, 2)}

        Please provide:
        1. Customer Journey Analysis
        2. Key Touchpoints
        3. Engagement Patterns
        4. Optimization Recommendations
        5. Growth Strategy

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
            Journey Analysis Results
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
          {/* Pre-Purchase Journey */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Pre-Purchase Journey</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedData.pre_purchase.map((item, index) => (
                <div key={index} className="p-3 bg-[#1D1D1F] rounded-lg">
                  <h5 className="font-semibold text-purple-300">{item.name}</h5>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-gray-300">Monthly Visits: {item.monthly_visits?.toLocaleString()}</p>
                    <p className="text-gray-300">Traffic Rank: {item.traffic_rank}</p>
                    <p className="text-gray-300">Visit Duration: {item.visit_duration} seconds</p>
                    <p className="text-gray-300">Bounce Rate: {item.bounce_rate}%</p>
                    <p className="text-gray-300">Page Views: {item.page_views}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Purchase Experience */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Purchase Experience</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedData.purchase.map((item, index) => (
                <div key={index} className="p-3 bg-[#1D1D1F] rounded-lg">
                  <h5 className="font-semibold text-purple-300">{item.name}</h5>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-gray-300">Funding Total: ${item.funding_total.toLocaleString()}</p>
                    <p className="text-gray-300">Number of Investors: {item.num_investors}</p>
                    <p className="text-gray-300">Organization Count: {item.org_count}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Post-Purchase Journey */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Post-Purchase Journey</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedData.post_purchase.map((item, index) => (
                <div key={index} className="p-3 bg-[#1D1D1F] rounded-lg">
                  <h5 className="font-semibold text-purple-300">{item.name}</h5>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-gray-300">Social Presence: {item.social_presence}</p>
                    <p className="text-gray-300">Contact Channels: {item.contact_channels}</p>
                    <p className="text-gray-300">Engagement Score: {item.engagement_score}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Optimization Opportunities */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Optimization Opportunities</h4>
            <div className="grid grid-cols-1 gap-4">
              {processedData.optimization.map((item, index) => (
                <div key={index} className="p-3 bg-[#1D1D1F] rounded-lg">
                  <h5 className="font-semibold text-purple-300">{item.name}</h5>
                  <div className="mt-2">
                    <div className="mb-2">
                      <h6 className="text-sm font-semibold text-purple-300">Growth Opportunities:</h6>
                      <ul className="list-disc list-inside text-sm text-gray-300">
                        {item.growth_opportunities.map((opp, i) => (
                          <li key={i}>{opp}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h6 className="text-sm font-semibold text-purple-300">Improvement Areas:</h6>
                      <ul className="list-disc list-inside text-sm text-gray-300">
                        {item.improvement_areas.map((area, i) => (
                          <li key={i}>{area}</li>
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
                <p className="text-sm text-gray-400">Monthly Visits</p>
                <p className="text-xl font-semibold text-purple-300">
                  {processedData.metrics.total_monthly_visits.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-[#1D1D1F] rounded-lg">
                <p className="text-sm text-gray-400">Avg Bounce Rate</p>
                <p className="text-xl font-semibold text-purple-300">
                  {processedData.metrics.avg_bounce_rate}
                </p>
              </div>
              <div className="p-3 bg-[#1D1D1F] rounded-lg">
                <p className="text-sm text-gray-400">Total Funding</p>
                <p className="text-xl font-semibold text-purple-300">
                  ${processedData.metrics.total_funding.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-[#1D1D1F] rounded-lg">
                <p className="text-sm text-gray-400">Total Investors</p>
                <p className="text-xl font-semibold text-purple-300">
                  {processedData.metrics.total_investors.toLocaleString()}
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
              href="/icp-creation"
              className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-purple-600/50 transition-all duration-200"
            >
              ICP Creation
            </Link>
            <button 
              className="px-4 py-2 rounded-lg bg-purple-600 text-white"
            >
              Journey Mapping
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
          // Web View - Journey Component
          <Journey />
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