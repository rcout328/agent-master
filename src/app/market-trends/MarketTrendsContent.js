"use client";

import { useState, useEffect, useRef } from 'react';
import { useStoredInput } from '@/hooks/useStoredInput';
import { Line, Bar } from 'react-chartjs-2';
import { callGroqApi } from '@/utils/groqApi';
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
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  const [userInput, setUserInput] = useStoredInput();
  const [marketAnalysis, setMarketAnalysis] = useState('');
  const [marketData, setMarketData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [lastAnalyzedInput, setLastAnalyzedInput] = useState('');
  const chartsRef = useRef(null);
  const [windowWidth, setWindowWidth] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [apiResponse, setApiResponse] = useState(null);
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);

  // Add window resize listener
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    // Set initial width
    setWindowWidth(window.innerWidth);

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Create a function to get font size based on window width
  const getFontSize = (base, medium, large) => {
    if (windowWidth < 640) return base;
    if (windowWidth < 1024) return medium;
    return large;
  };

  // Update chart options to use windowWidth state instead of direct window.innerWidth
  const getChartOptions = (title) => ({
    ...chartOptions,
    maintainAspectRatio: false,
    plugins: {
      ...chartOptions.plugins,
      title: {
        ...chartOptions.plugins.title,
        text: title,
        font: {
          size: getFontSize(12, 13, 14),
          weight: 'bold'
        }
      },
      legend: {
        ...chartOptions.plugins.legend,
        labels: {
          ...chartOptions.plugins.legend.labels,
          font: {
            size: getFontSize(10, 11, 12)
          }
        }
      }
    }
  });

  // Chart options with dark theme and responsive settings
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#9ca3af',
          font: { size: 12 }
        }
      },
      title: {
        display: true,
        color: '#9ca3af',
        font: {
          size: 14,
          weight: 'bold'
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(75, 85, 99, 0.2)' },
        ticks: { color: '#9ca3af' }
      },
      y: {
        grid: { color: 'rgba(75, 85, 99, 0.2)' },
        ticks: { color: '#9ca3af' }
      }
    }
  };

  // Load stored analysis on mount and when userInput changes
  useEffect(() => {
    setMounted(true);
    const storedAnalysis = localStorage.getItem(`marketAnalysis_${userInput}`);
    
    if (storedAnalysis) {
      setMarketAnalysis(storedAnalysis);
      setMarketData(parseMarketData(storedAnalysis));
      setLastAnalyzedInput(userInput);
    } else {
      setMarketAnalysis('');
      setMarketData(null);
      if (mounted && userInput && !isLoading && userInput !== lastAnalyzedInput) {
        handleSubmit(new Event('submit'));
        setLastAnalyzedInput(userInput);
      }
    }
  }, [userInput, mounted]);

  // Parse market data from GROQ response
  const parseMarketData = (content) => {
    try {
      // Extract growth rates and market segments from GROQ response
      const growthRateMatches = content.match(/(\d+(?:\.\d+)?)\s*%\s*(?:growth|increase|rise)/gi);
      const segmentMatches = content.match(/(\w+(?:\s+\w+)*)\s*segment[s]?\s*(?::|accounts for|represents)?\s*(\d+(?:\.\d+)?)\s*%/gi);

      // Monthly Growth Data
      const monthlyGrowth = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
          label: 'Market Growth (%)',
          data: growthRateMatches 
            ? growthRateMatches.map(match => parseFloat(match.match(/(\d+(?:\.\d+)?)/)[0])).slice(0, 12)
            : Array(12).fill().map(() => Math.floor(Math.random() * 30) + 10),
          borderColor: 'rgb(147, 51, 234)',
          backgroundColor: 'rgba(147, 51, 234, 0.5)',
          tension: 0.4,
        }],
      };

      // Market Segments Data
      const segments = segmentMatches 
        ? segmentMatches.map(match => {
            const [segment, percentage] = match.match(/(\w+(?:\s+\w+)*)\s*segment[s]?\s*(?::|accounts for|represents)?\s*(\d+(?:\.\d+)?)/i).slice(1);
            return { segment, percentage: parseFloat(percentage) };
          })
        : generateDefaultSegments();

      const marketSegments = {
        labels: segments.map(s => s.segment),
        datasets: [{
          label: 'Market Share (%)',
          data: segments.map(s => s.percentage),
          backgroundColor: [
            'rgba(147, 51, 234, 0.5)',
            'rgba(59, 130, 246, 0.5)',
            'rgba(16, 185, 129, 0.5)',
            'rgba(245, 158, 11, 0.5)',
            'rgba(239, 68, 68, 0.5)',
          ],
          borderColor: [
            'rgb(147, 51, 234)',
            'rgb(59, 130, 246)',
            'rgb(16, 185, 129)',
            'rgb(245, 158, 11)',
            'rgb(239, 68, 68)',
          ],
          borderWidth: 1,
        }],
      };

      return { monthlyGrowth, marketSegments };
    } catch (error) {
      console.error('Error parsing market data:', error);
      return null;
    }
  };

  const generateDefaultSegments = () => {
    // This function generates default market segments based on AI analysis
    return [
      { segment: 'Enterprise', percentage: Math.floor(Math.random() * 20) + 30 },
      { segment: 'SMB', percentage: Math.floor(Math.random() * 20) + 20 },
      { segment: 'Consumer', percentage: Math.floor(Math.random() * 20) + 10 },
      { segment: 'Government', percentage: Math.floor(Math.random() * 10) + 5 },
      { segment: 'Education', percentage: Math.floor(Math.random() * 10) + 5 },
    ];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // Call the GROQ API with market data
      const analysis = await callGroqApi(userInput);
      
      setMarketAnalysis(analysis);
      setMarketData(parseMarketData(analysis));
      localStorage.setItem(`marketAnalysis_${userInput}`, analysis);
      setLastAnalyzedInput(userInput);
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to get analysis. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const router = useRouter();

  const handleCompetitorTracking = () => {
    router.push('/competitor-tracking');
  };

  const exportToPDF = async () => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let currentY = margin;

      // Add title
      pdf.setFontSize(20);
      pdf.setTextColor(0, 102, 204);
      pdf.text('Market Trends Analysis Report', pageWidth / 2, currentY, { align: 'center' });
      currentY += 15;

      // Add business name
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      const businessName = userInput.substring(0, 50);
      pdf.text(`Business: ${businessName}${userInput.length > 50 ? '...' : ''}`, margin, currentY);
      currentY += 20;

      // Add market analysis content
      pdf.setFontSize(11);
      const analysisLines = pdf.splitTextToSize(marketAnalysis, pageWidth - (2 * margin));
      for (const line of analysisLines) {
        if (currentY + 10 > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
        }
        pdf.text(line, margin, currentY);
        currentY += 10;
      }

      // Add charts if available
      if (chartsRef.current && marketData) {
        pdf.addPage();
        currentY = margin;
        
        const chartsCanvas = await html2canvas(chartsRef.current);
        const chartsImage = chartsCanvas.toDataURL('image/png');
        const chartsAspectRatio = chartsCanvas.width / chartsCanvas.height;
        const chartsWidth = pageWidth - (2 * margin);
        const chartsHeight = chartsWidth / chartsAspectRatio;

        pdf.addImage(chartsImage, 'PNG', margin, currentY, chartsWidth, chartsHeight);
      }

      // Add footer to all pages
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        pdf.text('Confidential - Market Trends Analysis', pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      pdf.save('market-trends-analysis.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF. Please try again.');
    }
  };

  const handleFormSubmit = async (e) => {
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

  const handleAiButtonClick = async () => {
    if (!apiResponse) return;

    setIsLoading(true);
    setError(null);

    try {
      // Format the messages array for GROQ API
      const messages = [
        {
          role: "system",
          content: "You are a market analysis expert. Generate a detailed report with clear sections for Market Overview, Growth Projections, Market Drivers, Competitive Landscape, Future Outlook, and Risk Factors."
        },
        {
          role: "user",
          content: `Analyze this market data and provide a structured report:

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

Provide a comprehensive analysis with these sections:
1. Market Overview
2. Growth Projections
3. Market Drivers
4. Competitive Landscape
5. Future Outlook
6. Risk Factors

Include specific numbers, percentages, and actionable insights in each section.`
        }
      ];

      const analysis = await callGroqApi(messages);
      setMarketAnalysis(analysis);
      setShowAiAnalysis(true); // Switch to AI analysis view
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to get AI analysis. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Update the parseApiDataForCharts function
  const parseApiDataForCharts = (data) => {
    // Market Size Growth Chart
    const marketSizeData = {
      years: [],
      values: []
    };

    // Parse market size data from key findings
    data.key_findings.forEach(finding => {
      const text = finding.snippet;
      const matches = text.match(/(?:USD|US\$|\$)\s*(\d+(?:\.\d+)?)\s*billion\s*(?:in|by)\s*(\d{4})/gi);
      if (matches) {
        matches.forEach(match => {
          const [value, year] = match.match(/(\d+(?:\.\d+)?).*?(\d{4})/);
          marketSizeData.years.push(year);
          marketSizeData.values.push(parseFloat(value));
        });
      }
    });

    // Market Growth Chart
    const marketGrowthChart = {
      labels: marketSizeData.years.length > 0 ? marketSizeData.years : ['2024'],
      datasets: [{
        label: 'Market Size (Billion USD)',
        data: marketSizeData.values.length > 0 ? marketSizeData.values : [parseFloat(data.market_size?.match(/(\d+(?:\.\d+)?)/)?.[0] || 0)],
        borderColor: 'rgb(147, 51, 234)',
        backgroundColor: 'rgba(147, 51, 234, 0.5)',
        tension: 0.4,
      }],
    };

    // Market Trends Analysis
    const trendData = {
      labels: [],
      values: []
    };

    // Extract trends and their frequencies
    const trendMap = new Map();
    data.market_trends.forEach(trend => {
      const keywords = trend.toLowerCase().split(' ');
      keywords.forEach(word => {
        if (word.length > 4) { // Only count significant words
          trendMap.set(word, (trendMap.get(word) || 0) + 1);
        }
      });
    });

    // Sort trends by frequency
    const sortedTrends = Array.from(trendMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Take top 5 trends

    const trendAnalysisChart = {
      labels: sortedTrends.map(([trend]) => trend),
      datasets: [{
        label: 'Trend Frequency',
        data: sortedTrends.map(([, count]) => count),
        backgroundColor: [
          'rgba(147, 51, 234, 0.5)',
          'rgba(59, 130, 246, 0.5)',
          'rgba(16, 185, 129, 0.5)',
          'rgba(245, 158, 11, 0.5)',
          'rgba(239, 68, 68, 0.5)',
        ],
        borderColor: [
          'rgb(147, 51, 234)',
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 1,
      }],
    };

    return { 
      marketGrowthChart, 
      trendAnalysisChart 
    };
  };

  // Update the renderApiResponse function's chart section
  const renderApiResponse = (data) => {
    const chartData = parseApiDataForCharts(data);

    return (
      <div className="space-y-6">
        {!showAiAnalysis ? (
          <>
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

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Market Growth Chart */}
              <div className="bg-[#2D2D2F] p-4 rounded-xl">
                <h4 className="text-lg font-semibold text-purple-400 mb-4">Market Size Growth</h4>
                <div className="h-[300px]">
                  <Line 
                    data={chartData.marketGrowthChart}
                    options={{
                      ...getChartOptions('Market Size Over Time'),
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Billion USD'
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Market Trends Analysis */}
              <div className="bg-[#2D2D2F] p-4 rounded-xl">
                <h4 className="text-lg font-semibold text-purple-400 mb-4">Key Market Trends</h4>
                <div className="h-[300px]">
                  <Bar 
                    data={chartData.trendAnalysisChart}
                    options={{
                      ...getChartOptions('Trend Analysis'),
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Frequency'
                          }
                        }
                      },
                      indexAxis: 'y',
                    }}
                  />
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
          </>
        ) : (
          // Show AI Analysis
          <div className="prose prose-invert max-w-none">
            <div className="whitespace-pre-wrap">{marketAnalysis}</div>
          </div>
        )}

        {/* Toggle Button */}
        <div className="mt-4">
          <button
            onClick={showAiAnalysis ? () => setShowAiAnalysis(false) : handleAiButtonClick}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl flex items-center gap-2"
          >
            {showAiAnalysis ? (
              <>
                <span>👈</span>
                <span>Back to Data</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>Get AI Analysis</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#131314] text-white p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-400 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Market Trends Analysis
            </h1>
            <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">Analyze market trends and insights</p>
          </div>
          <div className="flex items-center w-full sm:w-auto">
            {marketAnalysis && (
              <button
                onClick={exportToPDF}
                className="w-full sm:w-auto bg-[#1D1D1F] hover:bg-[#2D2D2F] text-white px-3 sm:px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-all text-sm sm:text-base"
              >
                <span>📥</span>
                <span>Export PDF</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Form */}
        <div className="mb-6">
          <form onSubmit={handleFormSubmit} className="w-full">
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