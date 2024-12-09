"use client";

import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Link from 'next/link';
import Market from './Market';
import { FaGlobe } from 'react-icons/fa';

// Initialize Gemini
const genAI = new GoogleGenerativeAI("AIzaSyAE2SKBA38bOktQBdXS6mTK5Y1a-nKB3Mo");

export default function MarketAssessmentContent() {
  const [viewMode, setViewMode] = useState('api'); // 'api' or 'web'
  const [storedSnapshots, setStoredSnapshots] = useState([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [processedData, setProcessedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showGeographicalAnalysis, setShowGeographicalAnalysis] = useState(false);

  useEffect(() => {
    loadAllSnapshots();
  }, []);

  const loadAllSnapshots = () => {
    try {
      const allKeys = Object.keys(localStorage);
      const snapshots = allKeys
        .filter(key => key.includes('snapshot_'))
        .map(key => {
          try {
            const rawData = JSON.parse(localStorage.getItem(key));
            return {
              id: key.split('snapshot_')[1],
              data: rawData,
              timestamp: new Date().toISOString()
            };
          } catch (e) {
            console.error(`Error parsing snapshot ${key}:`, e);
            return null;
          }
        })
        .filter(Boolean);

      console.log('Loaded snapshots:', snapshots);
      setStoredSnapshots(snapshots);
    } catch (error) {
      console.error('Error loading snapshots:', error);
    }
  };

  const viewSnapshotData = (snapshot) => {
    try {
      console.log('Viewing snapshot:', snapshot.id);
      
      // Get fresh data from localStorage
      const storageKey = `snapshot_${snapshot.id}`;
      const rawData = localStorage.getItem(storageKey);
      
      if (!rawData) {
        throw new Error('Snapshot data not found in localStorage');
      }

      const parsedData = JSON.parse(rawData);
      setSelectedSnapshot({
        ...snapshot,
        data: parsedData
      });
      setProcessedData(null); // Reset processed data
      
    } catch (error) {
      console.error('Error viewing snapshot:', error);
      alert('Failed to load snapshot data');
    }
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

      // Process market assessment data
      const processed = {
        market_overview: analyzeMarketOverview(raw_data),
        market_dynamics: analyzeMarketDynamics(raw_data),
        competitive_landscape: analyzeCompetitiveLandscape(raw_data),
        future_outlook: analyzeFutureOutlook(raw_data),
        metrics: calculateMetrics(raw_data)
      };

      console.log('Processed market data:', processed);
      setProcessedData(processed);

    } catch (error) {
      console.error('Error processing data:', error);
      alert('Failed to process snapshot data: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const analyzeMarketOverview = (data) => {
    return {
      total_companies: data.length,
      regions: [...new Set(data.map(company => company.region))].filter(Boolean),
      total_market_value: data.reduce((sum, company) => sum + (company.monthly_visits || 0), 0),
      growth_rate: calculateAverageGrowth(data)
    };
  };

  const analyzeMarketDynamics = (data) => {
    return {
      industry_distribution: getIndustryDistribution(data),
      funding_overview: analyzeFunding(data),
      visitor_trends: analyzeVisitorTrends(data)
    };
  };

  const analyzeCompetitiveLandscape = (data) => {
    return {
      market_leaders: getMarketLeaders(data),
      industry_concentration: calculateIndustryConcentration(data),
      regional_presence: analyzeRegionalPresence(data)
    };
  };

  const analyzeFutureOutlook = (data) => {
    return {
      growth_opportunities: identifyGrowthOpportunities(data),
      emerging_markets: findEmergingMarkets(data),
      investment_trends: analyzeFundingTrends(data)
    };
  };

  // Helper functions
  const calculateAverageGrowth = (data) => {
    const growthRates = data
      .filter(company => company.monthly_visits_growth)
      .map(company => parseFloat(company.monthly_visits_growth));
    return growthRates.length > 0 ? 
      (growthRates.reduce((a, b) => a + b) / growthRates.length).toFixed(2) + '%' : 
      'N/A';
  };

  const getIndustryDistribution = (data) => {
    const industries = {};
    data.forEach(company => {
      (company.industries || []).forEach(industry => {
        if (industry.value) {
          industries[industry.value] = (industries[industry.value] || 0) + 1;
        }
      });
    });
    return Object.entries(industries)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([industry, count]) => ({
        industry,
        count,
        percentage: ((count / data.length) * 100).toFixed(1) + '%'
      }));
  };

  const analyzeFunding = (data) => {
    const fundedCompanies = data.filter(company => company.funds_raised);
    return {
      total_funding: fundedCompanies.reduce((sum, company) => sum + (parseFloat(company.funds_raised) || 0), 0),
      funded_companies: fundedCompanies.length,
      average_funding: fundedCompanies.length > 0 ? 
        (fundedCompanies.reduce((sum, company) => sum + (parseFloat(company.funds_raised) || 0), 0) / fundedCompanies.length).toFixed(2) : 
        0
    };
  };

  const analyzeVisitorTrends = (data) => {
    return {
      total_visits: data.reduce((sum, company) => sum + (company.monthly_visits || 0), 0),
      average_visits: Math.round(data.reduce((sum, company) => sum + (company.monthly_visits || 0), 0) / data.length),
      growth_trends: data
        .filter(company => company.monthly_visits_growth)
        .sort((a, b) => parseFloat(b.monthly_visits_growth) - parseFloat(a.monthly_visits_growth))
        .slice(0, 5)
        .map(company => ({
          name: company.name,
          growth: company.monthly_visits_growth
        }))
    };
  };

  const getMarketLeaders = (data) => {
    return data
      .sort((a, b) => (b.monthly_visits || 0) - (a.monthly_visits || 0))
      .slice(0, 5)
      .map(company => ({
        name: company.name,
        market_share: ((company.monthly_visits || 0) / data.reduce((sum, c) => sum + (c.monthly_visits || 0), 0) * 100).toFixed(1) + '%',
        visits: company.monthly_visits || 0
      }));
  };

  const calculateIndustryConcentration = (data) => {
    const industryCount = {};
    data.forEach(company => {
      (company.industries || []).forEach(industry => {
        if (industry.value) {
          industryCount[industry.value] = (industryCount[industry.value] || 0) + (company.monthly_visits || 0);
        }
      });
    });
    return Object.entries(industryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([industry, visits]) => ({
        industry,
        concentration: ((visits / data.reduce((sum, c) => sum + (c.monthly_visits || 0), 0)) * 100).toFixed(1) + '%'
      }));
  };

  const analyzeRegionalPresence = (data) => {
    const regions = {};
    data.forEach(company => {
      if (company.region) {
        regions[company.region] = (regions[company.region] || 0) + 1;
      }
    });
    return Object.entries(regions)
      .sort(([, a], [, b]) => b - a)
      .map(([region, count]) => ({
        region,
        companies: count,
        percentage: ((count / data.length) * 100).toFixed(1) + '%'
      }));
  };

  const identifyGrowthOpportunities = (data) => {
    const growingIndustries = {};
    data.forEach(company => {
      if (company.monthly_visits_growth && company.industries) {
        company.industries.forEach(industry => {
          if (industry.value) {
            growingIndustries[industry.value] = (growingIndustries[industry.value] || 0) + 
              parseFloat(company.monthly_visits_growth);
          }
        });
      }
    });
    return Object.entries(growingIndustries)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([industry, growth]) => ({
        industry,
        growth: (growth / data.filter(c => 
          c.industries?.some(i => i.value === industry)
        ).length).toFixed(1) + '%'
      }));
  };

  const findEmergingMarkets = (data) => {
    const regionalGrowth = {};
    data.forEach(company => {
      if (company.region && company.monthly_visits_growth) {
        regionalGrowth[company.region] = {
          growth: (regionalGrowth[company.region]?.growth || 0) + parseFloat(company.monthly_visits_growth),
          count: (regionalGrowth[company.region]?.count || 0) + 1
        };
      }
    });
    return Object.entries(regionalGrowth)
      .map(([region, data]) => ({
        region,
        avg_growth: (data.growth / data.count).toFixed(1) + '%'
      }))
      .sort((a, b) => parseFloat(b.avg_growth) - parseFloat(a.avg_growth))
      .slice(0, 3);
  };

  const analyzeFundingTrends = (data) => {
    const fundedCompanies = data.filter(company => company.funds_raised);
    return {
      total_investments: fundedCompanies.reduce((sum, company) => sum + (parseFloat(company.funds_raised) || 0), 0),
      avg_investment: fundedCompanies.length > 0 ? 
        (fundedCompanies.reduce((sum, company) => sum + (parseFloat(company.funds_raised) || 0), 0) / fundedCompanies.length).toFixed(2) : 0,
      funded_ratio: ((fundedCompanies.length / data.length) * 100).toFixed(1) + '%'
    };
  };

  const calculateMetrics = (data) => {
    return {
      total_companies: data.length,
      total_visits: data.reduce((sum, company) => sum + (company.monthly_visits || 0), 0),
      avg_growth: calculateAverageGrowth(data),
      total_funding: data.reduce((sum, company) => sum + (parseFloat(company.funds_raised) || 0), 0)
    };
  };

  const generateAIAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      
      const prompt = `
        Analyze this market data and provide strategic insights:

        Market Overview:
        ${JSON.stringify(processedData.market_overview, null, 2)}

        Market Dynamics:
        ${JSON.stringify(processedData.market_dynamics, null, 2)}

        Competitive Landscape:
        ${JSON.stringify(processedData.competitive_landscape, null, 2)}

        Future Outlook:
        ${JSON.stringify(processedData.future_outlook, null, 2)}

        Key Metrics:
        ${JSON.stringify(processedData.metrics, null, 2)}

        Please provide:
        1. Market Size & Growth Analysis
        2. Competitive Position Assessment
        3. Growth Opportunities
        4. Risk Factors
        5. Strategic Recommendations

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
            Market Analysis Results
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
          {/* Market Overview Section */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Market Overview</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-[#1D1D1F] rounded-lg">
                <p className="text-sm text-gray-400">Total Companies</p>
                <p className="text-xl font-semibold text-purple-300">
                  {processedData.market_overview.total_companies}
                </p>
              </div>
              <div className="p-3 bg-[#1D1D1F] rounded-lg">
                <p className="text-sm text-gray-400">Market Value</p>
                <p className="text-xl font-semibold text-purple-300">
                  {processedData.market_overview.total_market_value.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-[#1D1D1F] rounded-lg">
                <p className="text-sm text-gray-400">Growth Rate</p>
                <p className="text-xl font-semibold text-purple-300">
                  {processedData.market_overview.growth_rate}
                </p>
              </div>
              <div className="p-3 bg-[#1D1D1F] rounded-lg">
                <p className="text-sm text-gray-400">Regions</p>
                <p className="text-xl font-semibold text-purple-300">
                  {processedData.market_overview.regions.length}
                </p>
              </div>
            </div>
          </div>

          {/* Market Dynamics Section */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Market Dynamics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-sm font-semibold text-purple-300 mb-2">Industry Distribution</h5>
                {processedData.market_dynamics.industry_distribution.map((item, index) => (
                  <div key={index} className="flex justify-between items-center mb-2">
                    <span className="text-gray-300">{item.industry}</span>
                    <span className="text-purple-300">{item.percentage}</span>
                  </div>
                ))}
              </div>
              <div>
                <h5 className="text-sm font-semibold text-purple-300 mb-2">Funding Overview</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total Funding</span>
                    <span className="text-purple-300">${processedData.market_dynamics.funding_overview.total_funding.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Funded Companies</span>
                    <span className="text-purple-300">{processedData.market_dynamics.funding_overview.funded_companies}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Competitive Landscape Section */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Competitive Landscape</h4>
            <div className="space-y-4">
              <div>
                <h5 className="text-sm font-semibold text-purple-300 mb-2">Market Leaders</h5>
                {processedData.competitive_landscape.market_leaders.map((leader, index) => (
                  <div key={index} className="flex justify-between items-center mb-2">
                    <span className="text-gray-300">{leader.name}</span>
                    <span className="text-purple-300">{leader.market_share}</span>
                  </div>
                ))}
              </div>
              <div>
                <h5 className="text-sm font-semibold text-purple-300 mb-2">Regional Presence</h5>
                {processedData.competitive_landscape.regional_presence.map((region, index) => (
                  <div key={index} className="flex justify-between items-center mb-2">
                    <span className="text-gray-300">{region.region}</span>
                    <span className="text-purple-300">{region.percentage}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Future Outlook Section */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Future Outlook</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-sm font-semibold text-purple-300 mb-2">Growth Opportunities</h5>
                {processedData.future_outlook.growth_opportunities.map((opportunity, index) => (
                  <div key={index} className="flex justify-between items-center mb-2">
                    <span className="text-gray-300">{opportunity.industry}</span>
                    <span className="text-purple-300">{opportunity.growth}</span>
                  </div>
                ))}
              </div>
              <div>
                <h5 className="text-sm font-semibold text-purple-300 mb-2">Emerging Markets</h5>
                {processedData.future_outlook.emerging_markets.map((market, index) => (
                  <div key={index} className="flex justify-between items-center mb-2">
                    <span className="text-gray-300">{market.region}</span>
                    <span className="text-purple-300">{market.avg_growth}</span>
                  </div>
                ))}
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

  const GeographicalAnalysis = ({ onClose }) => {
    const [selectedSnapshot, setSelectedSnapshot] = useState(null);
    const [storedSnapshots, setStoredSnapshots] = useState([]);
    const [analysis, setAnalysis] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
      loadSnapshots();
    }, []);

    const loadSnapshots = () => {
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

    const analyzeGeographicalData = async () => {
      if (!selectedSnapshot) return;

      setIsAnalyzing(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/geographical-analysis`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(selectedSnapshot.data)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setAnalysis(data);
      } catch (error) {
        console.error('Analysis Error:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-[#1D1D1F] rounded-xl w-full max-w-6xl max-h-[90vh] overflow-auto">
          <div className="p-6 border-b border-gray-800">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-purple-400">Geographical Analysis</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6">
            {!selectedSnapshot ? (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-purple-400">Select Snapshot</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {storedSnapshots.map((snapshot) => (
                    <div
                      key={snapshot.id}
                      onClick={() => setSelectedSnapshot(snapshot)}
                      className="bg-[#2D2D2F] p-4 rounded-lg cursor-pointer hover:bg-[#3D3D3F] transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-purple-400">Snapshot {snapshot.id}</span>
                        <span className="text-sm text-gray-400">
                          {new Date(snapshot.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : !analysis ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-purple-400">
                    Snapshot {selectedSnapshot.id}
                  </h3>
                  <button
                    onClick={() => setSelectedSnapshot(null)}
                    className="text-gray-400 hover:text-gray-300"
                  >
                    Back to Snapshots
                  </button>
                </div>

                <div className="bg-[#2D2D2F] p-4 rounded-lg">
                  <pre className="text-sm text-gray-300 overflow-auto">
                    {JSON.stringify(selectedSnapshot.data, null, 2)}
                  </pre>
                </div>

                <button
                  onClick={analyzeGeographicalData}
                  disabled={isAnalyzing}
                  className={`w-full py-3 rounded-lg font-medium transition-colors ${
                    isAnalyzing
                      ? 'bg-purple-600/50 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                  }`}
                >
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Geographical Data'}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Regional Distribution */}
                <div className="bg-[#2D2D2F] p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-purple-400 mb-4">Regional Distribution</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysis.regional_distribution.map((region, index) => (
                      <div key={index} className="bg-[#3D3D3F] p-3 rounded">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-300">{region.name}</span>
                          <span className="text-purple-400">{region.company_count} companies</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded">
                          <div
                            className="h-full bg-purple-600 rounded"
                            style={{ width: `${region.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Industry Clusters */}
                <div className="bg-[#2D2D2F] p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-purple-400 mb-4">Industry Clusters</h3>
                  <div className="space-y-4">
                    {analysis.industry_clusters.map((cluster, index) => (
                      <div key={index} className="bg-[#3D3D3F] p-3 rounded">
                        <h4 className="font-medium text-gray-300 mb-2">{cluster.region}</h4>
                        <div className="flex flex-wrap gap-2">
                          {cluster.industries.map((industry, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-sm"
                            >
                              {industry}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Growth Trends */}
                <div className="bg-[#2D2D2F] p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-purple-400 mb-4">Growth Trends</h3>
                  <div className="space-y-4">
                    {analysis.growth_trends.map((trend, index) => (
                      <div key={index} className="bg-[#3D3D3F] p-3 rounded">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-300">{trend.region}</span>
                          <span className={`px-2 py-1 rounded text-sm ${
                            trend.growth_rate > 0 
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {trend.growth_rate > 0 ? '+' : ''}{trend.growth_rate}%
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">{trend.insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
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
              Market Assessment
            </button>
            <Link 
              href="/impact-assessment"
              className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-purple-600/50 transition-all duration-200"
            >
              Impact Assessment
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
            <button
              onClick={() => setShowGeographicalAnalysis(true)}
              className="px-6 py-2 rounded-xl font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white transition-colors"
            >
              <FaGlobe className="inline-block mr-2" />
              Geographical Analysis
            </button>
          </div>
        </div>

        {/* Render content based on view mode */}
        {viewMode === 'web' ? (
          // Web View - Market Component
          <Market />
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
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold text-purple-400">
                        Snapshot #{snapshot.id}
                      </h3>
                      <span className="text-sm text-gray-400">
                        {new Date(snapshot.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-gray-300 text-sm">
                      <p>Data points: {
                        snapshot.data ? 
                          typeof snapshot.data === 'object' ? 
                            Object.keys(snapshot.data).length : 
                            Array.isArray(snapshot.data) ? 
                              snapshot.data.length : 
                              0
                          : 0
                      }</p>
                      <p className="mt-1 text-gray-400">Click to view details</p>
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
                    
                    {/* Raw Data Preview */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Raw Data Preview</h4>
                      <pre className="bg-[#2D2D2F] p-4 rounded-lg overflow-auto max-h-96 text-sm text-gray-300">
                        {JSON.stringify(selectedSnapshot.data, null, 2)}
                      </pre>
                    </div>

                    {/* Processed Data */}
                    {processedData && (
                      <div className="mt-6">
                        <h4 className="text-sm font-medium text-gray-400 mb-2">Processed Analysis</h4>
                        {renderProcessedDataReview()}
                      </div>
                    )}
                  </div>
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

      {/* Add modal */}
      {showGeographicalAnalysis && (
        <GeographicalAnalysis onClose={() => setShowGeographicalAnalysis(false)} />
      )}
    </div>
  );
} 