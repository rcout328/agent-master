"use client";

import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Link from 'next/link';
import MarketTrand from './MarketTrand';

// Initialize Gemini
const genAI = new GoogleGenerativeAI("AIzaSyAE2SKBA38bOktQBdXS6mTK5Y1a-nKB3Mo");

export default function MarketTrendsContent() {
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
    console.log(localStorage); // Log the localStorage
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
      
      // Extract data array from the snapshot - handle the nested structure
      let raw_data = [];
      if (snapshotData && snapshotData.data) {
        // Handle different possible data structures
        if (Array.isArray(snapshotData.data)) {
          raw_data = snapshotData.data;
        } else if (snapshotData.data.data && Array.isArray(snapshotData.data.data)) {
          raw_data = snapshotData.data.data;
        } else if (snapshotData.data.results && Array.isArray(snapshotData.data.results)) {
          raw_data = snapshotData.data.results;
        }
      }

      console.log('Raw data records:', raw_data.length);

      if (!Array.isArray(raw_data) || raw_data.length === 0) {
        throw new Error('No valid data array found in snapshot');
      }

      // Helper functions for market analysis
      const calculateCompanySize = (data) => {
        const sizes = data
          .filter(company => company.num_employees)
          .map(company => {
            try {
              const size = company.num_employees.split('-')[0].replace('+', '');
              return parseInt(size);
            } catch {
              return 0;
            }
          });
        return `${sizes.length > 0 ? Math.round(sizes.reduce((a, b) => a + b) / sizes.length) : 0} employees`;
      };

      const determineMarketStage = (data) => {
        const foundedYears = [];
        const currentYear = new Date().getFullYear();
        data.forEach(company => {
          if (company.founded_date) {
            try {
              const year = parseInt(company.founded_date.slice(0, 4));
              foundedYears.push(currentYear - year);
            } catch {
              // Skip invalid dates
            }
          }
        });
        const avgAge = foundedYears.length > 0 ? 
          foundedYears.reduce((a, b) => a + b) / foundedYears.length : 0;
        return avgAge < 5 ? "Emerging Market" : avgAge < 10 ? "Growth Market" : "Mature Market";
      };

      const getMarketSegments = (data) => {
        const segments = {};
        data.forEach(company => {
          (company.industries || []).forEach(industry => {
            if (industry.value) {
              segments[industry.value] = (segments[industry.value] || 0) + 1;
            }
          });
        });
        return Object.entries(segments)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([k, v]) => `${k}: ${v}`);
      };

      const getRegionalDistribution = (data) => {
        const regions = {};
        data.forEach(company => {
          if (company.region) {
            regions[company.region] = (regions[company.region] || 0) + 1;
          }
        });
        return Object.entries(regions)
          .sort(([, a], [, b]) => b - a)
          .map(([k, v]) => `${k}: ${v}`);
      };

      const getMarketLeaders = (data) => {
        return data
          .sort((a, b) => (b.cb_rank || 0) - (a.cb_rank || 0))
          .slice(0, 5)
          .map(company => `${company.name}: ${company.about?.slice(0, 100)}...`);
      };

      const calculateMarketShare = (data) => {
        const totalVisits = data.reduce((sum, c) => sum + (c.monthly_visits || 0), 0);
        if (totalVisits === 0) return {};
        
        return Object.fromEntries(
          data
            .sort((a, b) => (b.monthly_visits || 0) - (a.monthly_visits || 0))
            .slice(0, 5)
            .map(company => [
              company.name,
              ((company.monthly_visits || 0) / totalVisits * 100).toFixed(2) + '%'
            ])
        );
      };

      // Process the data
      const processed = {
        market_size_growth: {
          total_market_value: [
            `Total Companies: ${raw_data.length}`,
            `Average Size: ${calculateCompanySize(raw_data)}`,
            `Market Stage: ${determineMarketStage(raw_data)}`
          ],
          market_segments: getMarketSegments(raw_data),
          regional_distribution: getRegionalDistribution(raw_data)
        },
        competitive_landscape: {
          market_leaders: getMarketLeaders(raw_data),
          industry_dynamics: [
            `Total Companies: ${raw_data.length}`,
            `Funded Companies: ${raw_data.filter(c => c.funding_rounds).length}`,
            `Public Companies: ${raw_data.filter(c => c.ipo_status === 'public').length}`
          ]
        },
        metrics: {
          market_share: calculateMarketShare(raw_data)
        }
      };

      console.log('Processed data:', processed);
      setProcessedData(processed);

    } catch (error) {
      console.error('Error processing data:', error);
      alert('Failed to process snapshot data: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateMarketAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      console.log('Starting Gemini analysis...');

      const prompt = `
        Analyze this market data and provide a comprehensive market trends report.
        
        Market Size & Growth:
        ${processedData.market_size_growth.total_market_value.join('\n')}
        
        Market Segments:
        ${processedData.market_size_growth.market_segments.join('\n')}
        
        Regional Distribution:
        ${processedData.market_size_growth.regional_distribution.join('\n')}
        
        Market Leaders:
        ${processedData.competitive_landscape.market_leaders.join('\n')}
        
        Industry Dynamics:
        ${processedData.competitive_landscape.industry_dynamics.join('\n')}
        
        Market Share:
        ${Object.entries(processedData.metrics.market_share)
          .map(([company, share]) => `${company}: ${share}`)
          .join('\n')}
        
        Please provide:
        1. Key Market Trends
        2. Growth Opportunities
        3. Competitive Analysis
        4. Market Challenges
        5. Strategic Recommendations
        
        Format the analysis in clear sections with bullet points.
      `;

      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
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
      console.error('Error during Gemini analysis:', error);
      alert('Failed to generate analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const viewSnapshotData = (snapshot) => {
    setSelectedSnapshot(snapshot);
    setAnalysis(null); // Clear previous analysis
  };

  const renderProcessedDataReview = () => {
    if (!processedData) return null;

    return (
      <div className="bg-[#1D1D1F]/90 p-6 rounded-xl backdrop-blur-xl border border-purple-500/20 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-purple-400">
            Market Analysis Results
          </h3>
          <div className="flex space-x-4">
            <button
              onClick={generateMarketAnalysis}
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
          {/* Market Size & Growth */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Market Size & Growth</h4>
            <div className="space-y-2">
              {processedData.market_size_growth.total_market_value.map((item, index) => (
                <p key={index} className="text-gray-300">{item}</p>
              ))}
            </div>
            
            <h5 className="text-md font-semibold text-purple-400 mt-4 mb-2">Market Segments</h5>
            <div className="space-y-1">
              {processedData.market_size_growth.market_segments.map((segment, index) => (
                <p key={index} className="text-gray-300">{segment}</p>
              ))}
            </div>

            <h5 className="text-md font-semibold text-purple-400 mt-4 mb-2">Regional Distribution</h5>
            <div className="space-y-1">
              {processedData.market_size_growth.regional_distribution.map((region, index) => (
                <p key={index} className="text-gray-300">{region}</p>
              ))}
            </div>
          </div>

          {/* Competitive Landscape */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Competitive Landscape</h4>
            
            <h5 className="text-md font-semibold text-purple-400 mb-2">Market Leaders</h5>
            <div className="space-y-2">
              {processedData.competitive_landscape.market_leaders.map((leader, index) => (
                <p key={index} className="text-gray-300">{leader}</p>
              ))}
            </div>

            <h5 className="text-md font-semibold text-purple-400 mt-4 mb-2">Industry Dynamics</h5>
            <div className="space-y-1">
              {processedData.competitive_landscape.industry_dynamics.map((dynamic, index) => (
                <p key={index} className="text-gray-300">{dynamic}</p>
              ))}
            </div>
          </div>

          {/* Market Share */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Market Share</h4>
            <div className="space-y-1">
              {Object.entries(processedData.metrics.market_share).map(([company, share], index) => (
                <p key={index} className="text-gray-300">
                  {company}: {share}
                </p>
              ))}
            </div>
          </div>

          {/* AI Analysis Results */}
          {analysis && (
            <div className="mt-6 bg-[#2D2D2F] p-4 rounded-lg">
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
            <button 
              className="px-4 py-2 rounded-lg bg-purple-600 text-white"
            >
              Market Trends
            </button>
            <Link 
              href="/competitor-tracking"
              className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-purple-600/50 transition-all duration-200"
            >
              Competitor Tracking
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
          // Web View - MarketTrand Component
          <MarketTrand />
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