"use client";

import { useState, useEffect, useRef } from 'react';
import { useStoredInput } from '@/hooks/useStoredInput';
import { Bar } from 'react-chartjs-2';
import { callGroqApi } from '@/utils/groqApi';
import { useRouter } from 'next/navigation';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function MarketAssessmentContent() {
  const [userInput, setUserInput] = useStoredInput();
  const [marketStatement, setMarketStatement] = useState('');
  const [marketData, setMarketData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [lastAnalyzedInput, setLastAnalyzedInput] = useState('');
  const router = useRouter();

  // Add refs for PDF content
  const chartsRef = useRef(null);
  const analysisRef = useRef(null);

  // Chart options with dark theme and responsive settings
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#9ca3af',
          font: { 
            size: typeof window !== 'undefined' ? window.innerWidth < 768 ? 10 : 12 : 12
          }
        }
      },
      title: {
        display: true,
        color: '#9ca3af',
        font: {
          size: typeof window !== 'undefined' ? window.innerWidth < 768 ? 12 : 14 : 14,
          weight: 'bold'
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(75, 85, 99, 0.2)' },
        ticks: { 
          color: '#9ca3af',
          font: {
            size: typeof window !== 'undefined' ? window.innerWidth < 768 ? 8 : 10 : 10
          }
        }
      },
      y: {
        grid: { color: 'rgba(75, 85, 99, 0.2)' },
        ticks: { 
          color: '#9ca3af',
          font: {
            size: typeof window !== 'undefined' ? window.innerWidth < 768 ? 8 : 10 : 10
          }
        }
      }
    }
  };

  // Handle navigation to Impact Assessment
  const handleImpactAssessment = () => {
    router.push('/impact-assessment');
  };

  // Load stored statement on mount and when userInput changes
  useEffect(() => {
    setMounted(true);
    const storedStatement = localStorage.getItem(`marketStatement_${userInput}`);
    
    if (storedStatement) {
      setMarketStatement(storedStatement);
      setMarketData(parseMarketData(storedStatement));
      setLastAnalyzedInput(userInput);
    } else {
      setMarketStatement('');
      setMarketData(null);
      if (mounted && userInput && !isLoading && userInput !== lastAnalyzedInput) {
        handleSubmit(new Event('submit'));
        setLastAnalyzedInput(userInput);
      }
    }
  }, [userInput, mounted]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // First call to get market metrics and share data
      const metricsResponse = await callGroqApi([
        {
          role: "system",
          content: `You are a market assessment expert. Generate realistic market metrics, shares, and projections. Do not use any markdown formatting or asterisks in your response.`
        },
        {
          role: "user",
          content: `Assess the market for this business: ${userInput}
          
          Generate metrics in exactly this format:
          Market Size 2024: [X] Billion
          Annual Growth Rate: [X]%
          
          Regional Distribution:
          North America: [X]%
          Europe: [X]%
          Asia Pacific: [X]%
          Latin America: [X]%
          Middle East & Africa: [X]%

          Market Share Distribution:
           (Company A): [X]%
           (Company B): [X]%
          (Company C): [X]%
          Others: [X]%

          Rules:
          - Use realistic market sizes
          - Growth rates should be realistic (5-30%)
          - Regional percentages must sum to 100%
          - Market shares must sum to 100%
          - Consider competitive landscape
          - Account for market position
          - Do not use any markdown formatting or asterisks
          `
        }
      ]);

      // Combine responses
      const fullResponse = `${metricsResponse}`;

      setMarketStatement(fullResponse);
      setMarketData(parseMarketData(fullResponse));
      localStorage.setItem(`marketStatement_${userInput}`, fullResponse);
      setLastAnalyzedInput(userInput);
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to get assessment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Update parseMarketData function to include market share parsing
  const parseMarketData = (content) => {
    try {
      // Extract market size and growth rate
      const marketSizeMatch = content.match(/Market\s+Size\s+2024:\s*(\d+(?:\.\d+)?)\s*Billion/i);
      const growthRateMatch = content.match(/Annual\s+Growth\s+Rate:\s*(\d+(?:\.\d+)?)\s*%/i);
      
      // Extract regional distribution
      const regionPattern = /(North America|Europe|Asia Pacific|Latin America|Middle East & Africa):\s*(\d+(?:\.\d+)?)\s*%/gi;
      const regionMatches = [...content.matchAll(regionPattern)];

      // Parse regional distribution
      const regions = regionMatches.length > 0
        ? regionMatches.map(match => ({
            region: match[1],
            percentage: parseFloat(match[2])
          }))
        : [
            { region: 'North America', percentage: 35 },
            { region: 'Europe', percentage: 28 },
            { region: 'Asia Pacific', percentage: 22 },
            { region: 'Latin America', percentage: 10 },
            { region: 'Middle East & Africa', percentage: 5 },
          ];

      // Adjust regional distribution based on user input
      const adjustedRegions = regions.map(region => {
        return {
          region: region.region,
          percentage: Math.max(0, Math.min(100, region.percentage + (Math.random() * 10 - 5))) // Random adjustment
        };
      });

      // Market Distribution Data
      const marketDistribution = {
        labels: adjustedRegions.map(r => r.region),
        datasets: [{
          label: 'Market Share (%)',
          data: adjustedRegions.map(r => r.percentage),
          backgroundColor: [
            'rgba(147, 51, 234, 0.5)',  // Purple
            'rgba(59, 130, 246, 0.5)',   // Blue
            'rgba(16, 185, 129, 0.5)',   // Green
            'rgba(245, 158, 11, 0.5)',   // Orange
            'rgba(239, 68, 68, 0.5)',    // Red
          ],
          borderColor: [
            'rgb(147, 51, 234)',
            'rgb(59, 130, 246)',
            'rgb(16, 185, 129)',
            'rgb(245, 158, 11)',
            'rgb(239, 68, 68)',
          ],
          borderWidth: 1,
        }]
      };

      // Market Share Distribution Data
      const marketShares = {
        labels: [
          'DataDig (Company C)',
          'Others'
        ],
        datasets: [{
          label: 'Market Share (%)',
          data: [
            marketSizeMatch ? parseFloat(content.match(/DataDig\s+\(Company\s+C\):\s*(\d+(?:\.\d+)?)\s*%/i)?.[1]) || 0 : 0,
            marketSizeMatch ? 100 - (parseFloat(content.match(/DataDig\s+\(Company\s+C\):\s*(\d+(?:\.\d+)?)\s*%/i)?.[1] || 0) ) : 0 // Calculate 'Others' share
          ],
          backgroundColor: [
            'rgba(16, 185, 129, 0.5)',   // Green
            'rgba(239, 68, 68, 0.5)',    // Red
          ],
          borderColor: [
            'rgb(16, 185, 129)',
            'rgb(239, 68, 68)',
          ],
          borderWidth: 1,
        }]
      };

      // Return all chart data
      return { 
        marketDistribution,
        marketShares  // Add market shares to returned data
      };
    } catch (error) {
      console.error('Error parsing market data:', error);
      return null;
    }
  };

  // Add export function
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
      pdf.text('Market Assessment Report', pageWidth / 2, currentY, { align: 'center' });
      currentY += 15;

      // Add business name
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      const businessName = userInput.substring(0, 50);
      pdf.text(`Business: ${businessName}${userInput.length > 50 ? '...' : ''}`, margin, currentY);
      currentY += 20;

      // Add market assessment content
      pdf.setFontSize(11);
      const analysisLines = pdf.splitTextToSize(marketStatement, pageWidth - (2 * margin));
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
        pdf.text('Confidential - Market Assessment Report', pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      pdf.save('market-assessment-report.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF. Please try again.');
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#131314] text-white p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-8 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Market Assessment
            </h1>
            <p className="text-sm sm:text-base text-gray-400 mt-2">Assess market size, segments, and opportunities</p>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
            {marketStatement && (
              <button
                onClick={exportToPDF}
                className="bg-[#1D1D1F] hover:bg-[#2D2D2F] text-white px-3 sm:px-4 py-2 rounded-xl flex items-center space-x-2 transition-all text-sm sm:text-base w-full sm:w-auto justify-center"
              >
                <span>📥</span>
                <span>Export PDF</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-[#1D1D1F] p-1 rounded-xl mb-4 sm:mb-8 inline-flex w-full sm:w-auto">
          <button 
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-purple-600 text-white text-sm sm:text-base"
          >
            Market Assessment
          </button>
          <button 
            onClick={handleImpactAssessment}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-purple-600/50 transition-all duration-200 text-sm sm:text-base"
          >
            Impact Assessment
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-8">
          {marketData && (
            <div ref={chartsRef} className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Market Distribution Chart */}
              <div className="bg-[#1D1D1F] p-3 sm:p-6 rounded-2xl border border-purple-500/10">
                <div className="h-[300px] sm:h-[400px]">
                  <Bar 
                    options={{
                      ...chartOptions,
                      plugins: {
                        ...chartOptions.plugins,
                        title: { ...chartOptions.plugins.title, text: 'Regional Distribution' }
                      }
                    }} 
                    data={marketData.marketDistribution}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Assessment Form */}
        <div className="bg-[#1D1D1F] rounded-2xl border border-purple-500/10 p-3 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
            Market Assessment
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Enter your business details for market assessment..."
                className="w-full h-24 sm:h-32 px-3 sm:px-4 py-2 sm:py-3 bg-[#131314] text-gray-200 rounded-xl border border-purple-500/20 
                         placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none text-sm sm:text-base"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !userInput.trim()}
              className={`w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-medium transition-all duration-200 text-sm sm:text-base
                        ${!isLoading && userInput.trim()
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/25'
                  : 'bg-gray-600 text-gray-300 cursor-not-allowed'}`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 sm:w-5 h-4 sm:h-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                  <span>Assessing...</span>
                </div>
              ) : (
                'Assess Market'
              )}
            </button>
          </form>

          {/* Assessment Results */}
          <div ref={analysisRef} className="mt-4 sm:mt-6">
            {error ? (
              <div className="text-red-500 text-sm sm:text-base">
                {error}
                <p className="text-xs sm:text-sm mt-2">Please try refreshing the page or contact support if the problem persists.</p>
              </div>
            ) : isLoading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-gray-900"></div>
              </div>
            ) : marketStatement ? (
              <div className="prose text-gray-300 max-w-none text-sm sm:text-base">
                <div className="whitespace-pre-wrap">{marketStatement}</div>
              </div>
            ) : (
              <div className="text-gray-500 italic text-sm sm:text-base">
                Market assessment results will appear here...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 