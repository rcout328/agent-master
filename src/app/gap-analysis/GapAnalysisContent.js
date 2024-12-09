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
  const [showPainPointsUI, setShowPainPointsUI] = useState(false);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [productData, setProductData] = useState(null);
  const [isAnalyzingProduct, setIsAnalyzingProduct] = useState(false);

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
        const avgTechStack = competitors.reduce((sum, comp) => sum + (comp.active_tech_count || 0), 0) / competitors.length || 0;
        const avgProducts = competitors.reduce((sum, comp) => sum + (comp.total_active_products || 0), 0) / competitors.length || 0;
        
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
      .filter(item => item.tech_gap.length > 0 || item.product_gap.length > 0 || item.funding_gap.length > 0 || item.contact_gap.length > 0);
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
      avg_tech_stack: Math.round(data.reduce((sum, company) => sum + (company.active_tech_count || 0), 0) / data.length) || 0,
      avg_products: Math.round(data.reduce((sum, company) => sum + (company.total_active_products || 0), 0) / data.length) || 0,
      avg_funding_rounds: Math.round(data.reduce((sum, company) => sum + (company.funding_rounds?.num_funding_rounds || 0), 0) / data.length) || 0,
      avg_contacts: Math.round(data.reduce((sum, company) => sum + (company.num_contacts || 0), 0) / data.length) || 0
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

  const analyzePainPoints = async (companyName) => {
    if (!companyName) {
      alert('Please enter a company name');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pain-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: companyName,
          market_segment: null
        })
      });

      if (!response.ok) throw new Error('Failed to analyze pain points');
      const data = await response.json();
      setPainPointsData(data);
      setShowPainPoints(true);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to analyze pain points: ' + error.message);
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

          {/* Add Pain Points Section */}
          {showPainPoints && painPointsData && (
            <div className="mt-6 bg-[#1D1D1F] p-6 rounded-xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-purple-400">
                  Pain Points Analysis
                </h3>
                <button
                  onClick={() => setShowPainPoints(false)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  Close
                </button>
              </div>

              {isAnalyzingPainPoints ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                  <p className="text-gray-400 mt-4">Analyzing pain points...</p>
                </div>
              ) : painPointsData ? (
                <div className="space-y-6">
                  {/* Major Pain Points */}
                  <div className="bg-[#2D2D2F] p-4 rounded-lg">
                    <h4 className="text-lg font-semibold text-purple-400 mb-3">Major Pain Points</h4>
                    <div className="space-y-4">
                      {painPointsData.analysis.major_pain_points.map((point, index) => (
                        <div key={index} className="bg-[#1D1D1F] p-4 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-medium text-gray-300">{point.issue}</h5>
                            <span className={`px-2 py-1 text-sm rounded ${
                              point.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                              point.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {point.severity} severity
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mb-2">{point.description}</p>
                          <p className="text-sm text-purple-400">Impact: {point.impact}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="bg-[#2D2D2F] p-4 rounded-lg">
                    <h4 className="text-lg font-semibold text-purple-400 mb-3">Categories</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {painPointsData.analysis.categories.map((category, index) => (
                        <div key={index} className="bg-[#1D1D1F] p-4 rounded-lg">
                          <h5 className="font-medium text-gray-300 mb-2">{category.name}</h5>
                          <ul className="space-y-1 text-sm text-gray-400">
                            {category.issues.map((issue, i) => (
                              <li key={i}>• {issue}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="bg-[#2D2D2F] p-4 rounded-lg">
                    <h4 className="text-lg font-semibold text-purple-400 mb-3">Recommendations</h4>
                    <div className="space-y-4">
                      {painPointsData.analysis.recommendations.map((rec, index) => (
                        <div key={index} className="bg-[#1D1D1F] p-4 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-medium text-gray-300">{rec.solution}</h5>
                            <span className={`px-2 py-1 text-sm rounded ${
                              rec.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                              rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {rec.priority} priority
                            </span>
                          </div>
                          <p className="text-sm text-gray-400 mb-2">{rec.implementation}</p>
                          <p className="text-sm text-purple-400">Expected Impact: {rec.expected_impact}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400 py-12">
                  Select a company and click "Analyze Pain Points" to start the analysis
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // First, update the viewSnapshotData function to include pain points reset
  const viewSnapshotData = (snapshot) => {
    setSelectedSnapshot(snapshot);
    setProcessedData(null);
    setPainPointsData(null); // Reset pain points when new snapshot is selected
    setShowPainPoints(false); // Hide pain points section
  };

  // Add this function to handle pain points button click
  const handlePainPointsClick = () => {
    setShowPainPoints(true);
    if (!painPointsData) {
      // Use either selected snapshot or manual input
      const companyName = selectedSnapshot?.data?.name || companyNameInput;
      if (!companyName) {
        // Show input dialog if no company name
        const name = prompt('Enter company name for pain points analysis:');
        if (name) {
          setCompanyNameInput(name);
          analyzePainPoints(name);
        }
      } else {
        analyzePainPoints(companyName);
      }
    }
  };

  // Add this component for the focused pain points UI
  const PainPointsAnalysis = ({ onClose }) => {
    const [companyName, setCompanyName] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [results, setResults] = useState(null);

    const handleAnalyze = async () => {
      if (!companyName) return;
      
      setIsAnalyzing(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pain-points`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: companyName })
        });
        
        const data = await response.json();
        setResults(data);
      } catch (error) {
        console.error('Error:', error);
        alert('Failed to analyze pain points');
      } finally {
        setIsAnalyzing(false);
      }
    };

    // Auto-focus the input when modal opens
    useEffect(() => {
      const timer = setTimeout(() => {
        const input = document.getElementById('company-name-input');
        if (input) input.focus();
      }, 100);
      return () => clearTimeout(timer);
    }, []);

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-[#1D1D1F] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
          <div className="p-6 border-b border-gray-800">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-purple-400">Pain Points Analysis</h2>
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              <input
                id="company-name-input"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name to analyze..."
                className="w-full px-4 py-3 bg-[#2D2D2F] rounded-lg border border-gray-700 focus:border-purple-500 outline-none text-white"
                onKeyPress={(e) => e.key === 'Enter' && companyName && handleAnalyze()}
              />
              <button
                onClick={handleAnalyze}
                disabled={!companyName || isAnalyzing}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  !companyName || isAnalyzing
                    ? 'bg-purple-600/50 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                }`}
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze Pain Points'}
              </button>
            </div>

            {/* Show results */}
            {results && (
              <div className="mt-8 space-y-6">
                {/* Major Pain Points */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-purple-400">Major Pain Points</h3>
                  <div className="grid gap-4">
                    {results.analysis.major_pain_points.map((point, index) => (
                      <div key={index} className="bg-[#2D2D2F] p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-300">{point.issue}</h4>
                          <span className={`px-2 py-1 text-sm rounded ${
                            point.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                            point.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {point.severity} severity
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{point.description}</p>
                        <p className="text-sm text-purple-400">Impact: {point.impact}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Categories */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-purple-400">Categories</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {results.analysis.categories.map((category, index) => (
                      <div key={index} className="bg-[#2D2D2F] p-4 rounded-lg">
                        <h4 className="font-medium text-gray-300 mb-2">{category.name}</h4>
                        <ul className="space-y-1 text-sm text-gray-400">
                          {category.issues.map((issue, i) => (
                            <li key={i}>• {issue}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-purple-400">Recommendations</h3>
                  <div className="space-y-4">
                    {results.analysis.recommendations.map((rec, index) => (
                      <div key={index} className="bg-[#2D2D2F] p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-300">{rec.solution}</h4>
                          <span className={`px-2 py-1 text-sm rounded ${
                            rec.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                            rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {rec.priority} priority
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{rec.implementation}</p>
                        <p className="text-sm text-purple-400">Expected Impact: {rec.expected_impact}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setResults(null);
                    setCompanyName('');
                  }}
                  className="w-full py-3 bg-[#2D2D2F] rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  Analyze Another Company
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Add the ProductSuggestions component
  const ProductSuggestions = ({ onClose }) => {
    const [productDetails, setProductDetails] = useState({
      name: '',
      description: '',
      currentFeatures: '',
      targetMarket: '',
      mainChallenges: '',
      product_url: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [results, setResults] = useState(null);

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (Object.values(productDetails).some(val => !val.trim())) return;

      setIsSubmitting(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/product-suggestions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(productDetails)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setResults(data);
      } catch (error) {
        console.error('Product Analysis Error:', error);
        setError('Failed to analyze product. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-[#1D1D1F] rounded-xl w-full max-w-6xl max-h-[90vh] overflow-auto">
          <div className="p-6 border-b border-gray-800">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-purple-400">Product Enhancement Suggestions</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6">
            {!results ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={productDetails.name}
                    onChange={(e) => setProductDetails(prev => ({...prev, name: e.target.value}))}
                    className="w-full px-4 py-2 bg-[#2D2D2F] rounded-lg border border-gray-700 focus:border-purple-500 outline-none text-white"
                    placeholder="Enter your product name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Product Description
                  </label>
                  <textarea
                    value={productDetails.description}
                    onChange={(e) => setProductDetails(prev => ({...prev, description: e.target.value}))}
                    className="w-full px-4 py-2 bg-[#2D2D2F] rounded-lg border border-gray-700 focus:border-purple-500 outline-none text-white h-24"
                    placeholder="Describe your product in detail"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Current Features
                  </label>
                  <textarea
                    value={productDetails.currentFeatures}
                    onChange={(e) => setProductDetails(prev => ({...prev, currentFeatures: e.target.value}))}
                    className="w-full px-4 py-2 bg-[#2D2D2F] rounded-lg border border-gray-700 focus:border-purple-500 outline-none text-white h-24"
                    placeholder="List your product's current features"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Target Market
                  </label>
                  <input
                    type="text"
                    value={productDetails.targetMarket}
                    onChange={(e) => setProductDetails(prev => ({...prev, targetMarket: e.target.value}))}
                    className="w-full px-4 py-2 bg-[#2D2D2F] rounded-lg border border-gray-700 focus:border-purple-500 outline-none text-white"
                    placeholder="Who is your target market?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Main Challenges
                  </label>
                  <textarea
                    value={productDetails.mainChallenges}
                    onChange={(e) => setProductDetails(prev => ({...prev, mainChallenges: e.target.value}))}
                    className="w-full px-4 py-2 bg-[#2D2D2F] rounded-lg border border-gray-700 focus:border-purple-500 outline-none text-white h-24"
                    placeholder="What challenges are you facing with the product?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Product URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={productDetails.product_url}
                    onChange={(e) => setProductDetails(prev => ({...prev, product_url: e.target.value}))}
                    className="w-full px-4 py-2 bg-[#2D2D2F] rounded-lg border border-gray-700 focus:border-purple-500 outline-none text-white"
                    placeholder="https://example.com/product-page"
                  />
                  <p className="mt-1 text-sm text-gray-400">
                    Add a direct link to your product page for better analysis
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3 rounded-lg font-medium transition-colors ${
                    isSubmitting
                      ? 'bg-purple-600/50 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                  }`}
                >
                  {isSubmitting ? 'Analyzing...' : 'Analyze Product'}
                </button>
              </form>
            ) : (
              <div className="space-y-6">
                {/* Render enhancement suggestions */}
                {results.suggestions?.map((suggestion, index) => (
                  <div key={index} className="bg-[#2D2D2F] p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-purple-400 mb-2">{suggestion.title}</h3>
                    <p className="text-gray-300 mb-3">{suggestion.description}</p>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-blue-400">Key Benefits:</h4>
                      <ul className="list-disc list-inside text-gray-300 space-y-1">
                        {suggestion.benefits.map((benefit, i) => (
                          <li key={i}>{benefit}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-3">
                      <span className={`px-2 py-1 text-sm rounded ${
                        suggestion.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                        suggestion.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {suggestion.priority} priority
                      </span>
                    </div>
                  </div>
                ))}

                {/* Sources */}
                {results.sources?.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-purple-400 mb-4">Research Sources</h3>
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

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Show Pain Points Modal when showPainPointsUI is true */}
      {showPainPointsUI && (
        <PainPointsAnalysis onClose={() => setShowPainPointsUI(false)} />
      )}

      {/* Add Product Suggestions Modal */}
      {showProductSuggestions && (
        <ProductSuggestions onClose={() => setShowProductSuggestions(false)} />
      )}

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
            {/* Pain Points Analysis Button */}
            <button
              onClick={() => setShowPainPointsUI(true)}
              className="px-6 py-2 rounded-xl font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white transition-colors"
            >
              🎯 Pain Points
            </button>
            {/* Product Suggestions Button */}
            <button
              onClick={() => setShowProductSuggestions(true)}
              className="px-6 py-2 rounded-xl font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white transition-colors"
            >
              💡 Product Suggestions
            </button>
            
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
                    onClick={() => viewSnapshotData(snapshot)}
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

                        {/* Pain Points Button */}
                        <button
                          onClick={handlePainPointsClick}
                          disabled={isAnalyzingPainPoints}
                          className={`inline-flex items-center px-4 py-2 rounded-lg transition-colors ${
                            isAnalyzingPainPoints
                              ? 'bg-blue-600/50 cursor-not-allowed'
                              : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                          }`}
                        >
                          <span className="mr-2">🎯</span>
                          {isAnalyzingPainPoints ? 'Analyzing...' : 'Pain Points'}
                        </button>

                        <button 
                          onClick={() => setSelectedSnapshot(null)}
                          className="text-gray-400 hover:text-gray-300"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                    <pre className="bg-black p-4 rounded-lg overflow-auto max-h-96 text-sm text-gray-300">
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
