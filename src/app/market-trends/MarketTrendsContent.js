"use client";

import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Link from 'next/link';
import MarketTrand from './MarketTrand';
import Mark from './Mark';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Initialize Gemini
const genAI = new GoogleGenerativeAI("AIzaSyAE2SKBA38bOktQBdXS6mTK5Y1a-nKB3Mo");

// Add this before the component definition
const fundingChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: { color: '#fff' }
    },
    tooltip: {
      backgroundColor: 'rgba(0,0,0,0.8)',
      titleColor: '#fff',
      bodyColor: '#fff',
      callbacks: {
        label: (context) => {
          const value = context.raw;
          if (context.dataset.yAxisID === 'y') {
            return `Funding: $${(value/1000000000).toFixed(2)}B`;
          }
          return `Investors: ${value.toLocaleString()}`;
        }
      }
    }
  },
  scales: {
    y: {
      type: 'linear',
      position: 'left',
      grid: { color: 'rgba(255,255,255,0.1)' },
      ticks: { 
        color: '#fff',
        callback: (value) => `$${(value/1000000000).toFixed(1)}B`
      }
    },
    investors: {
      type: 'linear',
      position: 'right',
      grid: { display: false },
      ticks: { 
        color: '#fff',
        callback: (value) => value.toLocaleString()
      }
    },
    x: {
      grid: { display: false },
      ticks: { 
        color: '#fff',
        maxRotation: 45,
        minRotation: 45,
        callback: (value) => {
          // Truncate long names
          const label = value.toString();
          return label.length > 20 ? label.substring(0, 18) + '...' : label;
        }
      }
    }
  }
};

export default function MarketTrendsContent() {
  const [viewMode, setViewMode] = useState('api'); // 'api' or 'web'
  const [storedSnapshots, setStoredSnapshots] = useState([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [processedData, setProcessedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMarkComponent, setShowMarkComponent] = useState(false);
  const [showDataOptions, setShowDataOptions] = useState(false);
  const [marketData, setMarketData] = useState(null);
  const [selectedGraph, setSelectedGraph] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [showGraphs, setShowGraphs] = useState(false);

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

  const fetchMarketData = async () => {
    try {
      if (!selectedSnapshot) {
        alert('Please select a snapshot first');
        return;
      }

      let processedData = [];
      if (selectedSnapshot.data?.results) {
        processedData = selectedSnapshot.data.results;
      } else if (selectedSnapshot.data?.data) {
        processedData = selectedSnapshot.data.data;
      } else if (Array.isArray(selectedSnapshot.data)) {
        processedData = selectedSnapshot.data;
      }

      console.log('Processing snapshot data:', processedData);
      setMarketData(processedData);
      setShowDataOptions(true);
      setShowGraphs(true);
    } catch (error) {
      console.error('Error processing snapshot data:', error);
      alert('Error processing snapshot data');
    }
  };

  const generateFundingTrendsChart = () => {
    if (!marketData || !marketData.length) return null;

    console.log('Raw market data:', marketData);

    // Process data for funding trends
    const fundingByCompany = marketData.reduce((acc, company) => {
      try {
        // Extract company name
        const title = company.title || company.name || 'Unknown';
        let fundingValue = 0;
        let numFundingRounds = 0;

        // Try different funding data paths
        if (company.funding_total?.value_usd) {
          // Primary funding path
          fundingValue = parseFloat(company.funding_total.value_usd);
          numFundingRounds = company.funding_total.num_funding_rounds || 0;
        } else if (company.financials_highlights?.funding_total?.value_usd) {
          // Secondary funding path
          fundingValue = parseFloat(company.financials_highlights.funding_total.value_usd);
          numFundingRounds = company.financials_highlights.funding_total.num_funding_rounds || 0;
        } else if (company.overview_highlights?.funding_total?.value_usd) {
          // Tertiary funding path
          fundingValue = parseFloat(company.overview_highlights.funding_total.value_usd);
          numFundingRounds = company.overview_highlights.funding_total.num_funding_rounds || 0;
        }

        // Get number of investors from funding_rounds if available
        const numInvestors = company.funding_rounds?.length || 0;
        
        // Only include if funding value exists and is greater than 0
        if (fundingValue > 0) {
          const cleanTitle = title.replace(/\s*\([^)]*\)/g, '').trim();
          
          // Check if we already have this company
          if (acc[cleanTitle]) {
            // Update if new value is higher
            if (fundingValue > acc[cleanTitle].funding) {
              acc[cleanTitle] = {
                funding: fundingValue,
                numFundingRounds: numFundingRounds,
                numInvestors: numInvestors
              };
            }
          } else {
            acc[cleanTitle] = {
              funding: fundingValue,
              numFundingRounds: numFundingRounds,
              numInvestors: numInvestors
            };
          }
        }

      } catch (e) {
        console.error('Error processing company funding data:', e);
        console.error('Problematic company data:', company);
      }
      return acc;
    }, {});

    // Sort companies by funding amount and take top 10
    const topCompanies = Object.entries(fundingByCompany)
      .sort(([, a], [, b]) => b.funding - a.funding)
      .slice(0, 10);

    console.log('Processed funding data:', topCompanies);

    // Format data for chart
    const chartData = {
      labels: topCompanies.map(([name]) => name),
      datasets: [
        {
          label: 'Total Funding (USD)',
          data: topCompanies.map(([, data]) => data.funding),
          backgroundColor: 'rgba(65, 105, 225, 0.6)',
          borderColor: '#4169E1',
          borderWidth: 1,
          yAxisID: 'y'
        },
        {
          label: 'Number of Funding Rounds',
          data: topCompanies.map(([, data]) => data.numFundingRounds),
          backgroundColor: 'rgba(144, 238, 144, 0.6)',
          borderColor: '#4CAF50',
          borderWidth: 1,
          yAxisID: 'rounds'
        }
      ]
    };

    return chartData;
  };

  const generateVisitGrowthChart = () => {
    if (!marketData || !marketData.length) return null;

    // Process data for visit growth
    const growthByRegion = marketData.reduce((acc, company) => {
      try {
        const region = company.region || company.location || 'Unknown';
        const visits = parseFloat(company.monthly_visits || company.visits || 0);
        const growth = parseFloat(company.monthly_visits_growth || company.growth || 0);

        if (!acc[region]) {
          acc[region] = {
            totalVisits: 0,
            totalGrowth: 0,
            count: 0
          };
        }

        if (!isNaN(visits)) acc[region].totalVisits += visits;
        if (!isNaN(growth)) acc[region].totalGrowth += growth;
        acc[region].count++;
      } catch (e) {
        console.error('Error processing company data:', e);
      }
      return acc;
    }, {});

    // Filter and sort regions by total visits
    const regions = Object.entries(growthByRegion)
      .filter(([region, data]) => data.count > 0 && region !== 'Unknown')
      .sort((a, b) => b[1].totalVisits - a[1].totalVisits)
      .slice(0, 10); // Top 10 regions

    console.log('Visit growth data:', regions);

    return {
      labels: regions.map(([region]) => region),
      datasets: [{
        label: 'Average Monthly Visits',
        data: regions.map(([, data]) => data.totalVisits / data.count),
        backgroundColor: '#90EE90',
        borderColor: '#4CAF50',
        borderWidth: 1
      }, {
        label: 'Growth Rate (%)',
        data: regions.map(([, data]) => data.totalGrowth / data.count),
        backgroundColor: '#FFB6C1',
        borderColor: '#FF69B4',
        borderWidth: 1
      }]
    };
  };

  const handleCreateGraph = (type) => {
    setSelectedGraph(type);
    const data = type === 'funding' ? 
      generateFundingTrendsChart() : 
      generateVisitGrowthChart();
    setChartData(data);
  };

  const handleCloseGraphs = () => {
    setShowGraphs(false);
    setShowDataOptions(false);
    setChartData(null);
    setSelectedGraph(null);
  };

  if (showMarkComponent) {
    return <Mark onClose={() => setShowMarkComponent(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#000000] text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Top Navigation */}
        <div className="flex justify-between items-center p-4 border-b border-gray-800">
          <div className="flex space-x-2">
            <button 
              onClick={() => setShowMarkComponent(true)}
              className="px-4 py-2 bg-[#1D1D1F] rounded-lg text-white hover:bg-purple-600/20 transition-colors"
            >
              View Market Analysis
            </button>
          </div>
        </div>

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

        {/* Data Options Button */}
        <div className="mb-6">
          <button
            onClick={fetchMarketData}
            className="px-6 py-3 bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors"
          >
            Show Data Options
          </button>
        </div>

        {/* Data Options Panel */}
        {showDataOptions && (
          <div className="bg-[#1D1D1F] p-6 rounded-xl mb-6">
            <h3 className="text-xl font-semibold text-purple-400 mb-4">
              Data Visualization Options
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => handleCreateGraph('funding')}
                className="p-4 bg-[#2D2D2F] rounded-xl hover:bg-purple-600/20 transition-colors"
              >
                <h4 className="text-lg font-medium mb-2">Funding Trends</h4>
                <p className="text-sm text-gray-400">
                  Analyze funding activity over time across industries
                </p>
              </button>

              <button
                onClick={() => handleCreateGraph('visits')}
                className="p-4 bg-[#2D2D2F] rounded-xl hover:bg-purple-600/20 transition-colors"
              >
                <h4 className="text-lg font-medium mb-2">Visit Growth</h4>
                <p className="text-sm text-gray-400">
                  Compare website visit growth across regions
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Chart Display */}
        {showGraphs && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
            <div className="max-w-7xl mx-auto p-6">
              <div className="bg-[#1D1D1F] rounded-xl shadow-xl">
                {/* Header */}
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-purple-400">
                    Market Data Visualization
                  </h3>
                  <button 
                    onClick={handleCloseGraphs}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Graph Options */}
                <div className="p-6 border-b border-gray-800">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button
                      onClick={() => handleCreateGraph('funding')}
                      className={`p-4 rounded-xl transition-colors ${
                        selectedGraph === 'funding' 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-[#2D2D2F] hover:bg-purple-600/20'
                      }`}
                    >
                      <h4 className="text-lg font-medium mb-2">Funding Trends</h4>
                      <p className="text-sm text-gray-400">
                        Analyze funding activity over time
                      </p>
                    </button>

                    <button
                      onClick={() => handleCreateGraph('visits')}
                      className={`p-4 rounded-xl transition-colors ${
                        selectedGraph === 'visits' 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-[#2D2D2F] hover:bg-purple-600/20'
                      }`}
                    >
                      <h4 className="text-lg font-medium mb-2">Visit Growth</h4>
                      <p className="text-sm text-gray-400">
                        Compare website visit growth
                      </p>
                    </button>
                  </div>
                </div>

                {/* Chart Display */}
                <div className="p-6">
                  {chartData ? (
                    <div className="h-[500px]">
                      {selectedGraph === 'funding' ? (
                        <Bar 
                          data={chartData}
                          options={fundingChartOptions}
                        />
                      ) : (
                        <Bar 
                          data={chartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'top',
                                labels: { color: '#fff' }
                              },
                              tooltip: {
                                backgroundColor: 'rgba(0,0,0,0.8)',
                                titleColor: '#fff',
                                bodyColor: '#fff'
                              }
                            },
                            scales: {
                              y: {
                                grid: { color: 'rgba(255,255,255,0.1)' },
                                ticks: { color: '#fff' }
                              },
                              x: {
                                grid: { display: false },
                                ticks: { 
                                  color: '#fff',
                                  maxRotation: 45,
                                  minRotation: 45
                                }
                              }
                            }
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 py-12">
                      Select a visualization type above to generate the graph
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}