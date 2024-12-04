"use client";

import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Link from 'next/link';
import jsPDF from 'jspdf';

// Initialize Gemini
const genAI = new GoogleGenerativeAI("AIzaSyAE2SKBA38bOktQBdXS6mTK5Y1a-nKB3Mo");

export default function FeaturePriorityContent() {
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

      // Process feature priority data
      const processed = {
        social_impact: analyzeSocialImpact(raw_data),
        economic_impact: analyzeEconomicImpact(raw_data),
        environmental_impact: analyzeEnvironmentalImpact(raw_data),
        implementation_priority: analyzeImplementationPriority(raw_data),
        metrics: analyzeMetrics(raw_data)
      };

      console.log('Processed feature data:', processed);
      setProcessedData(processed);

    } catch (error) {
      console.error('Error processing data:', error);
      alert('Failed to process snapshot data: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const analyzeSocialImpact = (data) => {
    return data
      .filter(company => company.builtwith_tech || company.total_active_products)
      .map(company => ({
        name: company.name,
        tech_adoption: company.builtwith_tech?.length || 0,
        product_impact: company.total_active_products || 0,
        market_reach: calculateMarketReach(company)
      }))
      .filter(item => item.tech_adoption > 0 || item.product_impact > 0);
  };

  const analyzeEconomicImpact = (data) => {
    return data
      .filter(company => company.funding_rounds || company.similar_companies)
      .map(company => ({
        name: company.name,
        funding_status: company.funding_rounds?.num_funding_rounds || 0,
        funding_amount: company.funding_rounds?.value?.value_usd || 0,
        market_competition: company.similar_companies?.length || 0,
        growth_potential: calculateGrowthPotential(company)
      }))
      .filter(item => item.funding_status > 0 || item.market_competition > 0);
  };

  const analyzeEnvironmentalImpact = (data) => {
    return data
      .filter(company => company.builtwith_tech || company.industries)
      .map(company => ({
        name: company.name,
        tech_efficiency: calculateTechEfficiency(company),
        sustainability_score: calculateSustainabilityScore(company),
        resource_optimization: analyzeResourceOptimization(company)
      }))
      .filter(item => item.tech_efficiency || item.sustainability_score);
  };

  const analyzeImplementationPriority = (data) => {
    return data.map(company => ({
      name: company.name,
      tech_priorities: generateTechPriorities(company),
      product_priorities: generateProductPriorities(company),
      market_priorities: generateMarketPriorities(company),
      timeline_estimate: estimateTimeline(company)
    }));
  };

  const analyzeMetrics = (data) => {
    return {
      avg_tech_stack: Math.round(data.reduce((sum, company) => sum + (company.builtwith_tech?.length || 0), 0) / data.length),
      avg_products: Math.round(data.reduce((sum, company) => sum + (company.total_active_products || 0), 0) / data.length),
      avg_competitors: Math.round(data.reduce((sum, company) => sum + (company.similar_companies?.length || 0), 0) / data.length),
      avg_funding_rounds: Math.round(data.reduce((sum, company) => sum + (company.funding_rounds?.num_funding_rounds || 0), 0) / data.length)
    };
  };

  // Helper functions
  const calculateMarketReach = (company) => {
    const factors = [];
    if (company.monthly_visits > 10000) factors.push('High web traffic');
    if (company.social_media_links?.length > 2) factors.push('Strong social presence');
    return factors;
  };

  const calculateGrowthPotential = (company) => {
    const potential = [];
    if (company.funding_rounds?.num_funding_rounds > 2) potential.push('Strong funding history');
    if (company.similar_companies?.length < 5) potential.push('Low competition');
    return potential;
  };

  const calculateTechEfficiency = (company) => {
    return {
      score: company.builtwith_tech?.length || 0,
      factors: analyzeTechFactors(company)
    };
  };

  const calculateSustainabilityScore = (company) => {
    return {
      score: Math.round(Math.random() * 100), // Replace with actual calculation
      impact: ['Resource usage', 'Energy efficiency']
    };
  };

  const analyzeResourceOptimization = (company) => {
    return {
      efficiency: company.builtwith_tech?.length > 10 ? 'High' : 'Low',
      improvements: ['Resource allocation', 'Tech stack optimization']
    };
  };

  const generateTechPriorities = (company) => {
    const priorities = [];
    if (company.builtwith_tech?.length < 10) priorities.push('Expand tech stack');
    if (!company.active_tech_count) priorities.push('Modernize technology');
    return priorities;
  };

  const generateProductPriorities = (company) => {
    const priorities = [];
    if (company.total_active_products < 5) priorities.push('Diversify product portfolio');
    if (company.similar_companies?.length > 5) priorities.push('Differentiate offerings');
    return priorities;
  };

  const generateMarketPriorities = (company) => {
    const priorities = [];
    if (company.funding_rounds?.num_funding_rounds < 2) priorities.push('Secure funding');
    if (company.similar_companies?.length > 10) priorities.push('Market positioning');
    return priorities;
  };

  const estimateTimeline = (company) => {
    return {
      short_term: ['Tech adoption', 'Product updates'],
      mid_term: ['Market expansion', 'Feature development'],
      long_term: ['Industry leadership', 'Innovation pipeline']
    };
  };

  const analyzeTechFactors = (company) => {
    const factors = [];
    
    if (company.builtwith_tech) {
      // Analyze tech categories
      const categories = new Set(company.builtwith_tech.flatMap(tech => tech.technology_category || []));
      
      // Add factors based on tech categories
      if (categories.has('analytics')) factors.push('Analytics Integration');
      if (categories.has('cdn')) factors.push('Content Delivery');
      if (categories.has('widgets')) factors.push('UI Components');
      if (categories.has('framework')) factors.push('Modern Framework');
      if (categories.has('hosting')) factors.push('Cloud Infrastructure');
      
      // Add factors based on tech count
      if (company.builtwith_tech.length > 20) {
        factors.push('Advanced Tech Stack');
      } else if (company.builtwith_tech.length > 10) {
        factors.push('Moderate Tech Stack');
      } else {
        factors.push('Basic Tech Stack');
      }

      // Add adoption factors
      const popularTechs = company.builtwith_tech.filter(tech => 
        tech.num_companies_using && parseInt(tech.num_companies_using) > 100000
      ).length;
      
      if (popularTechs > 5) {
        factors.push('High Tech Adoption');
      } else if (popularTechs > 2) {
        factors.push('Medium Tech Adoption');
      } else {
        factors.push('Low Tech Adoption');
      }
    }

    // Add default factor if no tech data
    if (factors.length === 0) {
      factors.push('Tech Stack Analysis Needed');
    }

    return factors;
  };

  const generateAIAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      
      const prompt = `
        Analyze this feature priority data and provide strategic insights:

        Social Impact:
        ${JSON.stringify(processedData.social_impact, null, 2)}

        Economic Impact:
        ${JSON.stringify(processedData.economic_impact, null, 2)}

        Environmental Impact:
        ${JSON.stringify(processedData.environmental_impact, null, 2)}

        Implementation Priority:
        ${JSON.stringify(processedData.implementation_priority, null, 2)}

        Key Metrics:
        ${JSON.stringify(processedData.metrics, null, 2)}

        Please provide:
        1. Feature Impact Analysis
        2. Priority Rankings
        3. Implementation Strategy
        4. Timeline Recommendations
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
            Feature Priority Analysis
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
          {/* Social Impact Section */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Social Impact</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedData.social_impact.map((item, index) => (
                <div key={index} className="p-3 bg-[#1D1D1F] rounded-lg">
                  <h5 className="font-semibold text-purple-300">{item.name}</h5>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-gray-300">Tech Adoption: {item.tech_adoption}</p>
                    <p className="text-gray-300">Product Impact: {item.product_impact}</p>
                    <div className="mt-2">
                      <p className="text-gray-400 font-semibold">Market Reach:</p>
                      <ul className="list-disc list-inside text-gray-300">
                        {item.market_reach.map((reach, i) => <li key={i}>{reach}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Economic Impact Section */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Economic Impact</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedData.economic_impact.map((item, index) => (
                <div key={index} className="p-3 bg-[#1D1D1F] rounded-lg">
                  <h5 className="font-semibold text-purple-300">{item.name}</h5>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-gray-300">Funding Status: {item.funding_status} rounds</p>
                    <p className="text-gray-300">Funding Amount: ${item.funding_amount.toLocaleString()}</p>
                    <p className="text-gray-300">Market Competition: {item.market_competition} competitors</p>
                    <div className="mt-2">
                      <p className="text-gray-400 font-semibold">Growth Potential:</p>
                      <ul className="list-disc list-inside text-gray-300">
                        {item.growth_potential.map((potential, i) => <li key={i}>{potential}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Environmental Impact Section */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Environmental Impact</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedData.environmental_impact.map((item, index) => (
                <div key={index} className="p-3 bg-[#1D1D1F] rounded-lg">
                  <h5 className="font-semibold text-purple-300">{item.name}</h5>
                  <div className="mt-2 space-y-2">
                    <div>
                      <p className="text-gray-400 font-semibold">Tech Efficiency:</p>
                      <p className="text-gray-300">Score: {item.tech_efficiency.score}</p>
                      <ul className="list-disc list-inside text-gray-300">
                        {item.tech_efficiency.factors.map((factor, i) => <li key={i}>{factor}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-gray-400 font-semibold">Sustainability:</p>
                      <p className="text-gray-300">Score: {item.sustainability_score.score}</p>
                      <ul className="list-disc list-inside text-gray-300">
                        {item.sustainability_score.impact.map((impact, i) => <li key={i}>{impact}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Implementation Priority Section */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Implementation Priority</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedData.implementation_priority.map((item, index) => (
                <div key={index} className="p-3 bg-[#1D1D1F] rounded-lg">
                  <h5 className="font-semibold text-purple-300">{item.name}</h5>
                  <div className="mt-2 space-y-2">
                    <div>
                      <p className="text-gray-400 font-semibold">Tech Priorities:</p>
                      <ul className="list-disc list-inside text-gray-300">
                        {item.tech_priorities.map((priority, i) => <li key={i}>{priority}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-gray-400 font-semibold">Product Priorities:</p>
                      <ul className="list-disc list-inside text-gray-300">
                        {item.product_priorities.map((priority, i) => <li key={i}>{priority}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-gray-400 font-semibold">Timeline:</p>
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        <div>
                          <p className="text-xs text-gray-400">Short Term</p>
                          <ul className="list-disc list-inside text-gray-300 text-sm">
                            {item.timeline_estimate.short_term.map((task, i) => <li key={i}>{task}</li>)}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Mid Term</p>
                          <ul className="list-disc list-inside text-gray-300 text-sm">
                            {item.timeline_estimate.mid_term.map((task, i) => <li key={i}>{task}</li>)}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Long Term</p>
                          <ul className="list-disc list-inside text-gray-300 text-sm">
                            {item.timeline_estimate.long_term.map((task, i) => <li key={i}>{task}</li>)}
                          </ul>
                        </div>
                      </div>
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
                <p className="text-sm text-gray-400">Avg Competitors</p>
                <p className="text-xl font-semibold text-purple-300">
                  {processedData.metrics.avg_competitors}
                </p>
              </div>
              <div className="p-3 bg-[#1D1D1F] rounded-lg">
                <p className="text-sm text-gray-400">Avg Funding Rounds</p>
                <p className="text-xl font-semibold text-purple-300">
                  {processedData.metrics.avg_funding_rounds}
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-6">Stored Snapshots</h2>
        
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

        {/* Selected Snapshot */}
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

        {storedSnapshots.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            No stored snapshots found
          </div>
        )}
      </div>
    </div>
  );
}