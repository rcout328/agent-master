"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
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
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [apiResponse, setApiResponse] = useState(() => {
    if (typeof window !== 'undefined') {
      const storedData = localStorage.getItem('marketTrendsData');
      return storedData ? JSON.parse(storedData) : null;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && apiResponse) {
      localStorage.setItem('marketTrendsData', JSON.stringify(apiResponse));
    }
  }, [apiResponse]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setCurrentPhase(1);

    try {
      const response = await fetch('http://127.0.0.1:5010/api/market-trends', {
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
      console.log('Market Trends API Response:', data);
      
      // Update data progressively
      if (data.market_size_growth?.total_market_value?.length) {
        setCurrentPhase(2);
        setApiResponse(prev => ({ ...prev, market_size_growth: data.market_size_growth }));
      }
      if (data.competitive_analysis?.market_leaders?.length) {
        setCurrentPhase(3);
        setApiResponse(prev => ({ ...prev, competitive_analysis: data.competitive_analysis }));
      }
      if (data.industry_trends?.current_trends?.length) {
        setCurrentPhase(4);
        setApiResponse(prev => ({ ...prev, industry_trends: data.industry_trends }));
      }
      if (data.growth_forecast?.short_term?.length) {
        setCurrentPhase(5);
        setApiResponse(prev => ({ ...prev, growth_forecast: data.growth_forecast }));
      }
      if (data.risk_assessment?.market_challenges?.length) {
        setCurrentPhase(6);
        setApiResponse(prev => ({ ...prev, risk_assessment: data.risk_assessment }));
      }
      if (data.sources?.length) {
        setCurrentPhase(7);
        setApiResponse(prev => ({ ...prev, sources: data.sources }));
      }

    } catch (error) {
      console.error('Error:', error);
      setError('Failed to get market trends data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPhaseStatus = () => {
    const phases = [
      'Starting Analysis',
      'Market Size & Growth',
      'Competitive Analysis',
      'Industry Trends',
      'Growth Forecast',
      'Risk Assessment',
      'Data Sources'
    ];

    return (
      <div className="mb-6">
        <div className="flex items-center space-x-2">
          {phases.map((phase, index) => (
            <div key={index} className="flex items-center">
              <div className={`h-2 w-2 rounded-full ${
                currentPhase > index ? 'bg-purple-500' : 'bg-gray-600'
              }`} />
              <span className={`text-sm ml-1 ${
                currentPhase > index ? 'text-purple-400' : 'text-gray-500'
              }`}>
                {phase}
              </span>
              {index < phases.length - 1 && (
                <div className={`h-0.5 w-4 mx-2 ${
                  currentPhase > index ? 'bg-purple-500' : 'bg-gray-600'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSection = (title, data, subsections) => {
    if (!data) return null;

    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-purple-400 mb-4">{title}</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Object.entries(subsections).map(([key, label]) => (
            <div key={key} className="p-4 bg-[#2D2D2F] rounded-lg">
              <h4 className="font-medium text-white mb-2">{label}</h4>
              <ul className="space-y-2">
                {data[key]?.map((item, i) => (
                  <li key={i} className="text-gray-300">{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSourcesSection = (sources) => {
    if (!sources?.length) return null;

    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-purple-400 mb-2">Data Sources</h3>
        <div className="bg-[#2D2D2F] p-4 rounded-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sources.map((source, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-500/10 rounded-full flex items-center justify-center">
                  <span className="text-purple-400 text-sm">{index + 1}</span>
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <a 
                      href={source.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      {source.domain}
                    </a>
                    <span className="text-xs text-gray-500 ml-2">
                      {source.section}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mt-1">
                    Accessed: {source.date}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const exportToPDF = async () => {
    if (!apiResponse || Object.keys(apiResponse).length === 0) return;
    
    setIsExporting(true);
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Add header
      pdf.setFillColor(48, 48, 51); // Dark background
      pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 40, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(24);
      pdf.text("Market Trends Analysis", 20, 25);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Report for: ${searchQuery}`, 20, 35);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pdf.internal.pageSize.getWidth() - 60, 35);

      let yPos = 50; // Starting position after header

      // Helper function to add section
      const addSection = (title, data, subsections) => {
        if (!data) return yPos;

        // Add section title
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.setTextColor(128, 90, 213); // Purple color
        pdf.text(title, 20, yPos);
        yPos += 10;

        // Add subsections
        Object.entries(subsections).forEach(([key, label]) => {
          // Check if we need a new page
          if (yPos > 250) {
            pdf.addPage();
            yPos = 20;
          }

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(12);
          pdf.setTextColor(80, 80, 80);
          pdf.text(label, 25, yPos);
          yPos += 7;

          // Add items
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(10);
          pdf.setTextColor(60, 60, 60);
          data[key]?.forEach(item => {
            // Handle text wrapping
            const lines = pdf.splitTextToSize(item, 160);
            lines.forEach(line => {
              if (yPos > 270) {
                pdf.addPage();
                yPos = 20;
              }
              pdf.text(line, 30, yPos);
              yPos += 5;
            });
            yPos += 2;
          });
          yPos += 5;
        });

        yPos += 10;
        return yPos;
      };

      // Add each section
      addSection("Market Size & Growth", apiResponse.market_size_growth, {
        total_market_value: "Total Market Value",
        market_segments: "Market Segments",
        regional_distribution: "Regional Distribution"
      });

      addSection("Competitive Analysis", apiResponse.competitive_analysis, {
        market_leaders: "Market Leaders",
        competitive_advantages: "Competitive Advantages",
        market_concentration: "Market Concentration"
      });

      addSection("Industry Trends", apiResponse.industry_trends, {
        current_trends: "Current Trends",
        technology_impact: "Technology Impact",
        regulatory_environment: "Regulatory Environment"
      });

      addSection("Growth Forecast", apiResponse.growth_forecast, {
        short_term: "Short-term Outlook",
        long_term: "Long-term Potential",
        growth_drivers: "Growth Drivers"
      });

      addSection("Risk Assessment", apiResponse.risk_assessment, {
        market_challenges: "Market Challenges",
        economic_factors: "Economic Factors",
        competitive_threats: "Competitive Threats"
      });

      // Add sources section
      if (apiResponse.sources?.length) {
        if (yPos > 250) {
          pdf.addPage();
          yPos = 20;
        }

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.setTextColor(128, 90, 213);
        pdf.text("Data Sources", 20, yPos);
        yPos += 10;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);

        apiResponse.sources.forEach((source, index) => {
          if (yPos > 270) {
            pdf.addPage();
            yPos = 20;
          }
          pdf.text(`${index + 1}. ${source.domain}`, 25, yPos);
          pdf.setTextColor(100, 100, 100);
          pdf.text(`Accessed: ${source.date}`, 25, yPos + 4);
          yPos += 10;
        });
      }

      // Add footer to each page
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Generated by Market Trends Analysis Tool - Page ${i} of ${pageCount}`,
          pdf.internal.pageSize.getWidth() / 2,
          pdf.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      // Save the PDF
      pdf.save(`${searchQuery.replace(/\s+/g, '_')}_market_trends.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#131314] text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Market Trends Analysis
            </h1>
            <p className="text-gray-400 mt-2">Analyze market trends, growth, and opportunities</p>
          </div>
          <button
            onClick={exportToPDF}
            disabled={!apiResponse || Object.keys(apiResponse).length === 0 || isExporting}
            className={`px-4 py-2 rounded-xl font-medium flex items-center space-x-2 transition-all duration-200 ${
              apiResponse && Object.keys(apiResponse).length > 0 && !isExporting
                ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin"></div>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <span role="img" aria-label="download">📥</span>
                <span>Export PDF</span>
              </>
            )}
          </button>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter business or market to analyze..."
              className="flex-grow px-4 py-2 bg-[#1D1D1F] border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
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

        {/* Phase Status */}
        {isLoading && renderPhaseStatus()}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
            {error}
          </div>
        )}

        {/* Results */}
        {apiResponse && (
          <div id="market-trends-content" className="space-y-8">
            {renderSection("Market Size & Growth", apiResponse.market_size_growth, {
              total_market_value: "Total Market Value",
              market_segments: "Market Segments",
              regional_distribution: "Regional Distribution"
            })}
            
            {renderSection("Competitive Analysis", apiResponse.competitive_analysis, {
              market_leaders: "Market Leaders",
              competitive_advantages: "Competitive Advantages",
              market_concentration: "Market Concentration"
            })}
            
            {renderSection("Industry Trends", apiResponse.industry_trends, {
              current_trends: "Current Trends",
              technology_impact: "Technology Impact",
              regulatory_environment: "Regulatory Environment"
            })}
            
            {renderSection("Growth Forecast", apiResponse.growth_forecast, {
              short_term: "Short-term Outlook",
              long_term: "Long-term Potential",
              growth_drivers: "Growth Drivers"
            })}
            
            {renderSection("Risk Assessment", apiResponse.risk_assessment, {
              market_challenges: "Market Challenges",
              economic_factors: "Economic Factors",
              competitive_threats: "Competitive Threats"
            })}
            
            {renderSourcesSection(apiResponse.sources)}
          </div>
        )}
      </div>
    </div>
  );
}