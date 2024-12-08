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
  const [showJourneySimulation, setShowJourneySimulation] = useState(false);
  const [simulationResults, setSimulationResults] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [journeyData, setJourneyData] = useState(null);
  const [error, setError] = useState(null);

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
      <div className="bg-black p-6 rounded-xl backdrop-blur-xl border border-purple-500/20 mt-6">
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

  const JourneySimulation = ({ onClose }) => {
    const [competitor, setCompetitor] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [results, setResults] = useState(null);

    const handleSimulation = async () => {
      if (!competitor) return;
      
      setIsAnalyzing(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/journey-mapping`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: competitor })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setResults(data);
      } catch (error) {
        console.error('Simulation Error:', error);
        setError('Failed to simulate journey. Please try again.');
      } finally {
        setIsAnalyzing(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-[#1D1D1F] rounded-xl w-full max-w-6xl max-h-[90vh] overflow-auto">
          <div className="p-6 border-b border-gray-800">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-purple-400">Journey Simulation</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              <input
                type="text"
                value={competitor}
                onChange={(e) => setCompetitor(e.target.value)}
                placeholder="Enter competitor name to analyze..."
                className="w-full px-4 py-3 bg-[#2D2D2F] rounded-lg border border-gray-700 focus:border-purple-500 outline-none text-white"
              />
              <button
                onClick={handleSimulation}
                disabled={!competitor || isAnalyzing}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  !competitor || isAnalyzing
                    ? 'bg-purple-600/50 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                }`}
              >
                {isAnalyzing ? 'Analyzing Journey...' : 'Simulate Journey'}
              </button>
            </div>

            {results && (
              <div className="mt-8 space-y-6">
                {/* Pre-Purchase Journey */}
                {results.journey_map?.pre_purchase && results.journey_map.pre_purchase.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-purple-400">Pre-Purchase Journey</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {results.journey_map.pre_purchase.map((stage, index) => (
                        <div key={index} className="bg-[#2D2D2F] p-4 rounded-lg">
                          <h4 className="font-medium text-gray-300 mb-3">{stage.stage}</h4>
                          <div className="space-y-3">
                            {/* Touchpoints */}
                            <div>
                              <h5 className="text-sm font-medium text-purple-400 mb-1">Touchpoints</h5>
                              <div className="flex flex-wrap gap-2">
                                {stage.touchpoints.map((point, i) => (
                                  <span key={i} className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-sm">
                                    {point}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Customer Actions */}
                            <div>
                              <h5 className="text-sm font-medium text-blue-400 mb-1">Actions</h5>
                              <div className="flex flex-wrap gap-2">
                                {stage.customer_actions.map((action, i) => (
                                  <span key={i} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">
                                    {action}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Pain Points */}
                            <div>
                              <h5 className="text-sm font-medium text-red-400 mb-1">Pain Points</h5>
                              <div className="flex flex-wrap gap-2">
                                {stage.pain_points.map((point, i) => (
                                  <span key={i} className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-sm">
                                    {point}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Opportunities */}
                            <div>
                              <h5 className="text-sm font-medium text-green-400 mb-1">Opportunities</h5>
                              <div className="flex flex-wrap gap-2">
                                {stage.opportunities.map((opp, i) => (
                                  <span key={i} className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm">
                                    {opp}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Purchase Journey */}
                {results.journey_map?.purchase && results.journey_map.purchase.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-purple-400">Purchase Journey</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {results.journey_map.purchase.map((stage, index) => (
                        <div key={index} className="bg-[#2D2D2F] p-4 rounded-lg">
                          {/* Same structure as pre-purchase stage */}
                          <h4 className="font-medium text-gray-300 mb-3">{stage.stage}</h4>
                          <div className="space-y-3">
                            {/* Touchpoints */}
                            <div>
                              <h5 className="text-sm font-medium text-purple-400 mb-1">Touchpoints</h5>
                              <div className="flex flex-wrap gap-2">
                                {stage.touchpoints.map((point, i) => (
                                  <span key={i} className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-sm">
                                    {point}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Customer Actions */}
                            <div>
                              <h5 className="text-sm font-medium text-blue-400 mb-1">Actions</h5>
                              <div className="flex flex-wrap gap-2">
                                {stage.customer_actions.map((action, i) => (
                                  <span key={i} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">
                                    {action}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Pain Points */}
                            <div>
                              <h5 className="text-sm font-medium text-red-400 mb-1">Pain Points</h5>
                              <div className="flex flex-wrap gap-2">
                                {stage.pain_points.map((point, i) => (
                                  <span key={i} className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-sm">
                                    {point}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Opportunities */}
                            <div>
                              <h5 className="text-sm font-medium text-green-400 mb-1">Opportunities</h5>
                              <div className="flex flex-wrap gap-2">
                                {stage.opportunities.map((opp, i) => (
                                  <span key={i} className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm">
                                    {opp}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Post-Purchase Journey */}
                {results.journey_map?.post_purchase && results.journey_map.post_purchase.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-purple-400">Post-Purchase Journey</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {results.journey_map.post_purchase.map((stage, index) => (
                        <div key={index} className="bg-[#2D2D2F] p-4 rounded-lg">
                          {/* Same structure as pre-purchase stage */}
                          <h4 className="font-medium text-gray-300 mb-3">{stage.stage}</h4>
                          <div className="space-y-3">
                            {/* Touchpoints */}
                            <div>
                              <h5 className="text-sm font-medium text-purple-400 mb-1">Touchpoints</h5>
                              <div className="flex flex-wrap gap-2">
                                {stage.touchpoints.map((point, i) => (
                                  <span key={i} className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-sm">
                                    {point}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Customer Actions */}
                            <div>
                              <h5 className="text-sm font-medium text-blue-400 mb-1">Actions</h5>
                              <div className="flex flex-wrap gap-2">
                                {stage.customer_actions.map((action, i) => (
                                  <span key={i} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">
                                    {action}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Pain Points */}
                            <div>
                              <h5 className="text-sm font-medium text-red-400 mb-1">Pain Points</h5>
                              <div className="flex flex-wrap gap-2">
                                {stage.pain_points.map((point, i) => (
                                  <span key={i} className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-sm">
                                    {point}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Opportunities */}
                            <div>
                              <h5 className="text-sm font-medium text-green-400 mb-1">Opportunities</h5>
                              <div className="flex flex-wrap gap-2">
                                {stage.opportunities.map((opp, i) => (
                                  <span key={i} className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm">
                                    {opp}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Optimization Opportunities */}
                {results.journey_map?.optimization && results.journey_map.optimization.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-purple-400">Optimization Opportunities</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {results.journey_map.optimization.map((item, index) => (
                        <div key={index} className="bg-[#2D2D2F] p-4 rounded-lg">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-medium text-gray-300">{item.area}</h4>
                            <span className={`px-2 py-1 text-sm rounded ${
                              item.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                              item.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {item.priority} priority
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mb-2">{item.current_state}</p>
                          <p className="text-sm text-purple-400 mb-2">{item.target_state}</p>
                          <div className="space-y-2">
                            {item.recommendations.map((rec, i) => (
                              <div key={i} className="text-sm text-gray-300 flex items-start gap-2">
                                <span className="text-purple-400">•</span>
                                <span>{rec}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sources */}
                {results.sources && results.sources.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-xl font-semibold text-purple-400 mb-4">Data Sources</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {results.sources.map((source, index) => (
                        <a
                          key={index}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-[#2D2D2F] p-4 rounded-lg hover:bg-[#3D3D3F] transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-purple-400">{source.source}</span>
                            <span className="text-sm text-gray-400">{source.date}</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleJourneyAnalysis = async (query) => {
    if (!query.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Add error handling for API URL
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        throw new Error('API URL not configured');
      }

      const response = await fetch(`${apiUrl}/api/journey-mapping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          query,
          timestamp: new Date().toISOString() 
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data) {
        throw new Error('No data received from API');
      }

      setJourneyData(data);
      setError(null);

    } catch (error) {
      console.error('Journey Analysis Error:', error);
      setError(error.message || 'Failed to analyze journey. Please try again.');
      setJourneyData(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!userInput.trim()) {
      setError('Please enter a query');
      return;
    }

    if (isAnalyzing) {
      return;
    }

    try {
      await handleJourneyAnalysis(userInput);
    } catch (error) {
      console.error('Submit Error:', error);
      setError('Failed to submit analysis request');
    }
  };

  const renderJourneyStage = (stage, data) => {
    if (!data || !data.length) return null;

    return (
      <div className="bg-[#1D1D1F] p-6 rounded-xl mb-6">
        <h3 className="text-xl font-semibold text-purple-400 mb-4">{stage}</h3>
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={index} className="bg-[#2D2D2F] p-4 rounded-lg">
              <h4 className="font-medium text-gray-300 mb-3">{item.stage}</h4>
              
              {/* Touchpoints */}
              <div className="mb-3">
                <h5 className="text-sm font-medium text-purple-400 mb-2">Touchpoints</h5>
                <div className="flex flex-wrap gap-2">
                  {item.touchpoints.map((point, i) => (
                    <span key={i} className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-sm">
                      {point}
                    </span>
                  ))}
                </div>
              </div>

              {/* Customer Actions */}
              <div className="mb-3">
                <h5 className="text-sm font-medium text-blue-400 mb-2">Customer Actions</h5>
                <div className="flex flex-wrap gap-2">
                  {item.customer_actions.map((action, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">
                      {action}
                    </span>
                  ))}
                </div>
              </div>

              {/* Pain Points */}
              <div className="mb-3">
                <h5 className="text-sm font-medium text-red-400 mb-2">Pain Points</h5>
                <div className="flex flex-wrap gap-2">
                  {item.pain_points.map((point, i) => (
                    <span key={i} className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-sm">
                      {point}
                    </span>
                  ))}
                </div>
              </div>

              {/* Opportunities */}
              <div>
                <h5 className="text-sm font-medium text-green-400 mb-2">Opportunities</h5>
                <div className="flex flex-wrap gap-2">
                  {item.opportunities.map((opp, i) => (
                    <span key={i} className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm">
                      {opp}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderOptimization = (data) => {
    if (!data || !data.length) return null;

    return (
      <div className="bg-[#1D1D1F] p-6 rounded-xl mb-6">
        <h3 className="text-xl font-semibold text-purple-400 mb-4">Optimization Opportunities</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((item, index) => (
            <div key={index} className="bg-[#2D2D2F] p-4 rounded-lg">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-medium text-gray-300">{item.area}</h4>
                <span className={`px-2 py-1 text-sm rounded ${
                  item.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                  item.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {item.priority} priority
                </span>
              </div>
              <p className="text-sm text-gray-400 mb-3">{item.current_state}</p>
              <p className="text-sm text-purple-400 mb-3">{item.target_state}</p>
              <div className="space-y-2">
                {item.recommendations.map((rec, i) => (
                  <div key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-purple-400 mt-1"></span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-blue-400 mt-3">Expected Impact: {item.expected_impact}</p>
            </div>
          ))}
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
            <button
              onClick={() => setShowJourneySimulation(true)}
              className="px-6 py-2 rounded-xl font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white transition-colors"
            >
              🔄 Journey Simulation
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
      {showJourneySimulation && (
        <JourneySimulation onClose={() => setShowJourneySimulation(false)} />
      )}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-red-400">{error}</p>
        </div>
      )}
      {isAnalyzing && (
        <div className="mb-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
          <div className="flex items-center space-x-2">
            <div className="animate-spin h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full"></div>
            <p className="text-purple-400">Analyzing journey...</p>
          </div>
        </div>
      )}
    </div>
  );
}