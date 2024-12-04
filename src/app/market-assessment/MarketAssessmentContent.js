"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GoogleGenerativeAI } from "@google/generative-ai";
import jsPDF from 'jspdf';

// Initialize Gemini
const genAI = new GoogleGenerativeAI("AIzaSyAE2SKBA38bOktQBdXS6mTK5Y1a-nKB3Mo");

export default function MarketAssessmentContent() {
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
          const rawData = JSON.parse(localStorage.getItem(key));
          // Handle different data structures
          let processedData = Array.isArray(rawData) ? rawData : 
                            rawData?.data ? rawData.data :
                            rawData?.results ? rawData.results : [];
          
          return {
            id: key.split('snapshot_')[1],
            data: processedData,
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-purple-400 mb-4">Market Assessment</h2>
        <p className="text-gray-300">
          View and analyze market assessment data from your research snapshots.
        </p>
      </div>

      {/* Snapshot Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {storedSnapshots.map((snapshot) => (
          <div
            key={snapshot.id}
            className="bg-[#1D1D1F]/90 p-6 rounded-xl backdrop-blur-xl border border-purple-500/20 
                     hover:border-purple-500/40 transition-all cursor-pointer"
            onClick={() => {
              setSelectedSnapshot(snapshot);
              processSnapshotData(snapshot);
            }}
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
              <p>Companies analyzed: {
                Array.isArray(snapshot.data) ? snapshot.data.length : 0
              }</p>
              <p>Data points collected: {
                Array.isArray(snapshot.data) ? 
                  snapshot.data.reduce((sum, company) => 
                    sum + (company ? Object.keys(company).length : 0), 0
                  ) : 0
              }</p>
            </div>
          </div>
        ))}
      </div>

      {/* No Snapshots Message */}
      {storedSnapshots.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">No snapshots found.</p>
          <Link 
            href="/competitor-tracking"
            className="text-purple-400 hover:text-purple-300 underline"
          >
            Start by collecting competitor data
          </Link>
        </div>
      )}

      {/* Processing State */}
      {isProcessing && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-purple-400">Processing snapshot data...</p>
        </div>
      )}

      {/* Processed Data Review */}
      {renderProcessedDataReview()}
    </div>
  );
} 