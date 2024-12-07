"use client";

import { useState, useEffect, useRef } from 'react';
import { useStoredInput } from '@/hooks/useStoredInput';
import jsPDF from 'jspdf';
import Link from 'next/link';

export default function JourneyMappingContent() {
  const [userInput, setUserInput] = useStoredInput();
  const [journeyAnalysis, setJourneyAnalysis] = useState({
    pre_purchase: [],
    purchase: [],
    post_purchase: [],
    optimization: [],
    sources: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const analysisRef = useRef(null);

  // Load data from local storage on component mount
  useEffect(() => {
    const storedData = localStorage.getItem(`journeyMapping_${userInput}`);
    if (storedData) {
      setJourneyAnalysis(JSON.parse(storedData));
      setCurrentPhase(6); // Set to last phase if data is loaded
    }
  }, [userInput]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setCurrentPhase(1);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/journey-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: userInput }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const data = await response.json();
      console.log('Journey API Response:', data);
      
      // Update data progressively
      if (data.pre_purchase?.length) {
        setCurrentPhase(2);
        setJourneyAnalysis(prev => ({ ...prev, pre_purchase: data.pre_purchase }));
      }
      if (data.purchase?.length) {
        setCurrentPhase(3);
        setJourneyAnalysis(prev => ({ ...prev, purchase: data.purchase }));
      }
      if (data.post_purchase?.length) {
        setCurrentPhase(4);
        setJourneyAnalysis(prev => ({ ...prev, post_purchase: data.post_purchase }));
      }
      if (data.optimization?.length) {
        setCurrentPhase(5);
        setJourneyAnalysis(prev => ({ ...prev, optimization: data.optimization }));
      }
      if (data.sources?.length) {
        setCurrentPhase(6);
        setJourneyAnalysis(prev => ({ ...prev, sources: data.sources }));
      }
      
      localStorage.setItem(`journeyMapping_${userInput}`, JSON.stringify(data));

    } catch (error) {
      console.error('Error:', error);
      setError('Failed to get journey analysis. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToPDF = async () => {
    if (!journeyAnalysis || Object.keys(journeyAnalysis).length === 0) return;

    setIsExporting(true);
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Add header
      pdf.setFillColor(48, 48, 51); // Dark background
      pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 60, 'F'); // Increased header height
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(26); // Increased font size
      pdf.text("Customer Journey Mapping", 20, 40); // Adjusted position
      pdf.setFontSize(14); // Increased font size
      pdf.setFont("helvetica", "normal");
      pdf.text(`Report for: ${userInput}`, 20, 50); // Adjusted position
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pdf.internal.pageSize.getWidth() - 60, 50);

      let yPos = 70; // Starting position after header

      // Helper function to add section
      const addSection = (title, data) => {
        if (!data || data.length === 0) return yPos;

        // Add section title
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(18); // Increased font size
        pdf.setTextColor(128, 90, 213); // Purple color
        pdf.text(title, 20, yPos);
        yPos += 10;

        // Add items
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(12); // Increased font size
        pdf.setTextColor(60, 60, 60);
        data.forEach(item => {
          // Handle text wrapping
          const lines = pdf.splitTextToSize(item, 180); // Adjusted width for wrapping
          lines.forEach(line => {
            if (yPos > 270) {
              pdf.addPage();
              yPos = 20;
            }
            pdf.text(line, 30, yPos);
            yPos += 6; // Increased line spacing
          });
          yPos += 4; // Increased spacing between items
        });

        yPos += 10;
        return yPos;
      };

      // Add each section
      addSection("Pre-Purchase Journey", journeyAnalysis.pre_purchase);
      addSection("Purchase Experience", journeyAnalysis.purchase);
      addSection("Post-Purchase Journey", journeyAnalysis.post_purchase);
      addSection("Optimization Opportunities", journeyAnalysis.optimization);

      // Add sources section
      if (journeyAnalysis.sources?.length) {
        if (yPos > 250) {
          pdf.addPage();
          yPos = 20;
        }

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(18); // Increased font size
        pdf.setTextColor(128, 90, 213);
        pdf.text("Data Sources", 20, yPos);
        yPos += 10;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(12); // Increased font size
        pdf.setTextColor(60, 60, 60);

        journeyAnalysis.sources.forEach((source, index) => {
          if (yPos > 270) {
            pdf.addPage();
            yPos = 20;
          }
          pdf.text(`${index + 1}. ${source.domain}`, 25, yPos);
          pdf.setTextColor(100, 100, 100);
          pdf.text(`Accessed: ${source.date}`, 25, yPos + 5);
          yPos += 10;
        });
      }

      // Add footer to each page
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(10); // Increased font size
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Generated by Journey Mapping Tool - Page ${i} of ${pageCount}`,
          pdf.internal.pageSize.getWidth() / 2,
          pdf.internal.pageSize.getHeight() - 15, // Adjusted position
          { align: "center" }
        );
      }

      // Save the PDF
      pdf.save(`${userInput.replace(/\s+/g, '_')}_journey_analysis.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const renderJourneySection = (title, data) => {
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-purple-400 mb-2">{title}</h3>
        <div className="bg-[#2D2D2F] p-4 rounded-xl">
          {data.length > 0 ? (
            <ul className="space-y-2">
              {data.map((item, index) => (
                <li key={index} className="text-gray-300">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">No {title.toLowerCase()} data available.</p>
          )}
        </div>
      </div>
    );
  };

  const renderSourcesSection = (sources) => {
    if (!sources || sources.length === 0) return null;

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
        <div className="text-sm text-gray-400 mt-2">
          * Data compiled from {sources.length} trusted sources
        </div>
      </div>
    );
  };

  const renderPhaseStatus = () => {
    const phases = [
      'Starting Analysis',
      'Pre-Purchase Journey',
      'Purchase Experience',
      'Post-Purchase Journey',
      'Optimization',
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

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Customer Journey Mapping
            </h1>
            <p className="text-gray-400 mt-2">Map and analyze customer touchpoints</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-[#1D1D1F] p-1 rounded-xl mb-6 sm:mb-8 inline-flex w-full sm:w-auto overflow-x-auto">
          <Link 
            href="/icp-creation"
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-purple-600/50 transition-all duration-200 text-sm sm:text-base whitespace-nowrap"
          >
            ICP Creation
          </Link>
          <button 
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-purple-600 text-white text-sm sm:text-base whitespace-nowrap"
          >
            Journey Mapping
          </button>
        </div>

        {/* Add phase status indicator */}
        {isLoading && renderPhaseStatus()}

        {/* Main Content */}
        <div className="bg-[#1D1D1F] rounded-2xl border border-purple-500/10 p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Enter your business details for journey mapping..."
                className="w-full h-32 sm:h-40 px-3 sm:px-4 py-2 sm:py-3 bg-black text-gray-200 rounded-xl border border-purple-500/20 
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
                  <span>Analyzing...</span>
                </div>
              ) : (
                'Create Journey Map'
              )}
            </button>
          </form>

          {/* Analysis Results */}
          <div ref={analysisRef} className="mt-6">
            {error ? (
              <div className="text-red-500">{error}</div>
            ) : (
              <div className="space-y-6">
                {renderJourneySection("Pre-Purchase Journey", journeyAnalysis.pre_purchase)}
                {renderJourneySection("Purchase Experience", journeyAnalysis.purchase)}
                {renderJourneySection("Post-Purchase Journey", journeyAnalysis.post_purchase)}
                {renderJourneySection("Optimization Opportunities", journeyAnalysis.optimization)}
                
                {/* Add Sources Section */}
                {renderSourcesSection(journeyAnalysis.sources)}
              </div>
            )}
          </div>

          {/* Export PDF Button */}
          <div className="mt-6">
            <button
              onClick={exportToPDF}
              disabled={isExporting || !journeyAnalysis || Object.keys(journeyAnalysis).length === 0}
              className={`w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-medium transition-all duration-200 text-sm sm:text-base
                          ${!isExporting && journeyAnalysis && Object.keys(journeyAnalysis).length > 0
                ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg shadow-green-500/25'
                : 'bg-gray-600 text-gray-300 cursor-not-allowed'}`}
            >
              {isExporting ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 sm:w-5 h-4 sm:h-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                  <span>Exporting...</span>
                </div>
              ) : (
                'Export to PDF'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}