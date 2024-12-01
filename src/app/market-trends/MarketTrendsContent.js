"use client";

import { useState } from 'react';
import Link from 'next/link'; // Import Link from next/link
import { Line, Bar } from 'react-chartjs-2';
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
import { callGeminiApi } from '@/utils/geminiApi';

// Register ChartJS components
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

export default function MarketTrendsContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [apiResponse, setApiResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/market-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const data = await response.json();
      console.log('API Response:', data);
      setApiResponse(data);
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to get data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to parse market size and growth data for charts
  const parseMarketData = (data) => {
    if (!data) return null;

    // Extract market size projections
    const marketSizes = data.key_findings
      .filter(finding => finding.snippet.includes('billion'))
      .map(finding => {
        const match = finding.snippet.match(/\$?\s*(\d+(?:\.\d+)?)\s*billion/);
        return match ? parseFloat(match[1]) : null;
      })
      .filter(size => size !== null);

    // Extract growth rates
    const growthRates = data.key_findings
      .filter(finding => finding.snippet.includes('%'))
      .map(finding => {
        const match = finding.snippet.match(/(\d+(?:\.\d+)?)\s*%/);
        return match ? parseFloat(match[1]) : null;
      })
      .filter(rate => rate !== null);

    return {
      marketSizeData: {
        labels: ['Current', '2025', '2030'],
        datasets: [{
          label: 'Market Size (Billion USD)',
          data: marketSizes.slice(0, 3),
          borderColor: 'rgb(147, 51, 234)',
          backgroundColor: 'rgba(147, 51, 234, 0.5)',
        }]
      },
      growthData: {
        labels: ['CAGR', 'YoY Growth', 'Projected Growth'],
        datasets: [{
          label: 'Growth Rate (%)',
          data: growthRates.slice(0, 3),
          backgroundColor: [
            'rgba(147, 51, 234, 0.5)',
            'rgba(59, 130, 246, 0.5)',
            'rgba(16, 185, 129, 0.5)',
          ],
          borderColor: [
            'rgb(147, 51, 234)',
            'rgb(59, 130, 246)',
            'rgb(16, 185, 129)',
          ],
        }]
      }
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const handleAiAnalysis = async () => {
    if (!apiResponse) return;
    
    setIsAnalyzing(true);
    try {
      console.log("Starting AI Analysis with data:", apiResponse);
      
      const messages = [
        {
          role: "system",
          content: "You are a market analysis expert. Generate a detailed report with clear sections for Market Overview, Growth Projections, Market Drivers, Competitive Landscape, Future Outlook, and Risk Factors."
        },
        {
          role: "user",
          content: `Generate a comprehensive market analysis report with the following data:

Market Size: ${apiResponse.market_size}
Growth Rate: ${apiResponse.growth_rate}

Key Findings:
${apiResponse.key_findings.map(finding => 
  `- ${finding.title}
   ${finding.snippet}
   Source: ${finding.source} (${finding.date})`
).join('\n')}

Market Trends:
${apiResponse.market_trends.map(trend => `- ${trend}`).join('\n')}

Industry Insights:
${apiResponse.industry_insights.map(insight => `- ${insight}`).join('\n')}

Format your response with these exact section headers:

Market Overview:
Growth Projections:
Market Drivers:
Competitive Landscape:
Future Outlook:
Risk Factors:

For each section, include specific numbers, percentages, and actionable insights from the provided data.`
        }
      ];

      console.log("Sending messages to Gemini:", messages);

      const analysis = await callGeminiApi(messages);
      console.log("Received Gemini Analysis:", analysis);

      if (!analysis) {
        throw new Error('No analysis received from Gemini');
      }

      setAiAnalysis(analysis);
      setShowAiAnalysis(true);
    } catch (error) {
      console.error('Error getting AI analysis:', error);
      setError('Failed to get AI analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderApiResponse = (data) => {
    const chartData = parseMarketData(data);

    return (
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="overflow-x-auto -mx-3 sm:mx-0 mb-6 sm:mb-8">
          <div className="bg-[#1D1D1F] p-1 rounded-xl inline-flex min-w-max mx-3 sm:mx-0">
            <button 
              className="px-3 sm:px-4 py-2 rounded-lg bg-purple-600 text-white text-sm sm:text-base whitespace-nowrap"
            >
              Market Trends
            </button>
            <Link href="/competitor-tracking">
              <button 
                className="px-3 sm:px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-purple-600/50 transition-all duration-200 text-sm sm:text-base whitespace-nowrap"
              >
                Competitor Tracking
              </button>
            </Link>
          </div>
        </div>

        {/* AI Analysis Button */}
        <div className="flex justify-end">
          <button
            onClick={showAiAnalysis ? () => setShowAiAnalysis(false) : handleAiAnalysis}
            className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${
              isAnalyzing ? 'bg-purple-600/50 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
            }`}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin"></div>
                <span>Analyzing...</span>
              </>
            ) : showAiAnalysis ? (
              <>
                <span>👈</span>
                <span>Back to Data</span>
              </>
            ) : (
              <>
                <span></span>
                <span>Get AI Analysis</span>
              </>
            )}
          </button>
        </div>

        {showAiAnalysis ? (
          // Show AI Analysis
          <div className="bg-[#2D2D2F] p-4 rounded-xl">
            <h3 className="text-lg font-semibold text-purple-400 mb-4">AI Market Analysis</h3>
            <div className="prose prose-invert max-w-none">
              <div className="whitespace-pre-wrap">{aiAnalysis}</div>
            </div>
          </div>
        ) : (
          // Show Regular Data Display
          <>
            {/* Charts Section */}
            {chartData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <div className="bg-[#2D2D2F] p-4 rounded-xl">
                  <h4 className="text-lg font-semibold text-purple-400 mb-4">Market Size Trend</h4>
                  <div className="h-[300px]">
                    <Line data={chartData.marketSizeData} options={chartOptions} />
                  </div>
                </div>
                <div className="bg-[#2D2D2F] p-4 rounded-xl">
                  <h4 className="text-lg font-semibold text-purple-400 mb-4">Growth Rates</h4>
                  <div className="h-[300px]">
                    <Bar data={chartData.growthData} options={chartOptions} />
                  </div>
                </div>
              </div>
            )}

            {/* Market Overview */}
            <div>
              <h3 className="text-lg font-semibold text-purple-400 mb-2">Market Overview</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#2D2D2F] p-4 rounded-xl">
                  <p className="text-gray-400">Market Size</p>
                  <p className="text-lg">{data.market_size || 'Not available'}</p>
                </div>
                <div className="bg-[#2D2D2F] p-4 rounded-xl">
                  <p className="text-gray-400">Growth Rate</p>
                  <p className="text-lg">{data.growth_rate || 'Not available'}</p>
                </div>
              </div>
            </div>

            {/* Key Findings */}
            <div>
              <h3 className="text-lg font-semibold text-purple-400 mb-2">Key Findings</h3>
              <div className="space-y-3">
                {data.key_findings.map((finding, index) => (
                  <div key={index} className="bg-[#2D2D2F] p-4 rounded-xl">
                    <h4 className="font-medium text-white">{finding.title}</h4>
                    <p className="text-gray-400 mt-1">{finding.snippet}</p>
                    <div className="flex justify-between mt-2 text-sm text-gray-500">
                      <span>{finding.source}</span>
                      <span>{finding.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Market Trends */}
            <div>
              <h3 className="text-lg font-semibold text-purple-400 mb-2">Market Trends</h3>
              <div className="bg-[#2D2D2F] p-4 rounded-xl">
                <ul className="space-y-2">
                  {data.market_trends.map((trend, index) => (
                    <li key={index} className="text-gray-300">{trend}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Industry Insights */}
            <div>
              <h3 className="text-lg font-semibold text-purple-400 mb-2">Industry Insights</h3>
              <div className="bg-[#2D2D2F] p-4 rounded-xl">
                <ul className="space-y-2">
                  {data.industry_insights.map((insight, index) => (
                    <li key={index} className="text-gray-300">{insight}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Sources Section */}
            {data.sources && data.sources.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-purple-400 mb-2">Data Sources</h3>
                <div className="bg-[#2D2D2F] p-4 rounded-xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.sources.map((source, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-purple-500/10 rounded-full flex items-center justify-center">
                          <span className="text-purple-400 text-sm">{index + 1}</span>
                        </div>
                        <div className="flex-grow">
                          <a 
                            href={source.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            {source.domain}
                          </a>
                          <p className="text-gray-400 text-sm mt-1">
                            Accessed: {source.date}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Citation Note */}
            {data.sources && data.sources.length > 0 && (
              <div className="text-sm text-gray-400 mt-4">
                <p>* Data compiled from {data.sources.length} trusted sources</p>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#131314] text-white p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Navigation Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-purple-400 mb-4">Navigation</h2>
          <div className="flex space-x-4">
            <Link href="/">
              <button className="px-4 py-2 rounded-lg bg-purple-600 text-white">Home</button>
            </Link>
            <Link href="/market-trends">
              <button className="px-4 py-2 rounded-lg bg-purple-600 text-white">Market Trends</button>
            </Link>
            <Link href="/competitor-tracking">
              <button className="px-4 py-2 rounded-lg bg-purple-600 text-white">Competitor Tracking</button>
            </Link>
          </div>
        </div>

        {/* Search Form */}
        <div className="mb-6">
          <form onSubmit={handleSubmit} className="w-full">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-grow">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter market or business to analyze..."
                  className="w-full px-4 py-2 bg-[#1D1D1F] border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !searchQuery.trim()}
                className={`px-6 py-2 rounded-xl font-medium transition-all duration-200 ${
                  isLoading || !searchQuery.trim()
                    ? 'bg-purple-600/50 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin"></div>
                  </div>
                ) : (
                  'Analyze'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
            <p>{error}</p>
          </div>
        )}

        {/* API Response Display */}
        <div className="bg-[#1D1D1F] rounded-2xl border border-purple-500/10 p-3 sm:p-4 lg:p-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : apiResponse ? (
            renderApiResponse(apiResponse)
          ) : (
            <div className="text-center text-gray-400 py-8">
              Enter a market or business name above to get started
            </div>
          )}
        </div>
      </div>
    </div>
  );
}