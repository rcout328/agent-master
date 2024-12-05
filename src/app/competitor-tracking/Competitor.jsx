"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function CompetitorTrackingContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [apiResponse, setApiResponse] = useState({
    main_competitors: [],
    competitor_strengths: [],
    key_findings: [],
    sources: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const analysisRef = useRef(null);

  // Load data from local storage on component mount
  useEffect(() => {
    const storedData = localStorage.getItem('geminiApiResponse');
    if (storedData) {
      setApiResponse(JSON.parse(storedData));
      setCurrentPhase(6); // Assuming the last phase is reached if data is loaded from local storage
    }
  }, []);

  // Check local storage and send request if empty and input is filled
  useEffect(() => {
    const storedData = localStorage.getItem('geminiApiResponse');
    if (!storedData && searchQuery.trim()) {
      handleSubmit(new Event('submit'));
    }
  }, [searchQuery]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setCurrentPhase(1);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/competitor-analysis', {
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
      
      // Update data progressively
      if (data.main_competitors?.length) {
        setCurrentPhase(2);
        setApiResponse(prev => ({ ...prev, main_competitors: data.main_competitors }));
      }
      if (data.competitor_strengths?.length) {
        setCurrentPhase(3);
        setApiResponse(prev => ({ ...prev, competitor_strengths: data.competitor_strengths }));
      }
      if (data.key_findings?.length) {
        setCurrentPhase(4);
        setApiResponse(prev => ({ ...prev, key_findings: data.key_findings }));
      }
      if (data.sources?.length) {
        setCurrentPhase(5);
        setApiResponse(prev => ({ ...prev, sources: data.sources }));
      }

      // Store the API response in local storage
      localStorage.setItem('geminiApiResponse', JSON.stringify(data));
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to get competitor data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPhaseStatus = () => {
    return (
      <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
        <p>Loading phase {currentPhase}...</p>
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
      pdf.text("Competitor Analysis", 20, 25);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Report for: ${searchQuery}`, 20, 35);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pdf.internal.pageSize.getWidth() - 60, 35);

      let yPos = 50; // Starting position after header

      // Helper function to add section
      const addSection = (title, data) => {
        if (!data || data.length === 0) return yPos;

        // Add section title
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.setTextColor(128, 90, 213); // Purple color
        pdf.text(title, 20, yPos);
        yPos += 10;

        // Add items
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);
        data.forEach((item, index) => {
          pdf.text(`${index + 1}. ${item}`, 20, yPos);
          yPos += 5;
        });
        return yPos;
      };

      // Add sections to PDF
      yPos = addSection("Main Competitors", apiResponse.main_competitors);
      yPos = addSection("Competitor Strengths", apiResponse.competitor_strengths);
      yPos = addSection("Key Findings", apiResponse.key_findings);
      yPos = addSection("Data Sources", apiResponse.sources.map(source => source.domain));

      // Save the PDF
      pdf.save(`Competitor_Analysis_${searchQuery}.pdf`);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Define renderSection function
  const renderSection = (title, data, subsections) => {
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-purple-400 mb-4">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((item, index) => (
            <div key={index} className="bg-[#1D1D1F] p-4 rounded-lg">
              <p className="text-gray-300">{item}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Define renderSourcesSection function
  const renderSourcesSection = (sources) => {
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-purple-400 mb-4">Data Sources</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sources.map((source, index) => (
            <div key={index} className="bg-[#1D1D1F] p-4 rounded-lg">
              <p className="text-gray-300">{source.domain}</p>
              <p className="text-gray-400">Accessed: {source.date}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#131314] text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Competitor Tracking
            </h1>
            <p className="text-gray-400 mt-2">Analyze competitors and their strengths</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Navigation Button */}
            <Link
              href="/market-trends"
              className="px-4 py-2 rounded-xl font-medium bg-[#2D2D2F] text-gray-400 hover:text-white hover:bg-purple-600/50 transition-all duration-200"
            >
              Market Trends
            </Link>
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
                  <span role="img" aria-label="download"></span>
                  <span>Export PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter business name for competitor analysis..."
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
          <div id="competitor-tracking-content" className="space-y-8">
            {renderSection("Main Competitors", apiResponse.main_competitors, {})}
            {renderSection("Competitor Strengths", apiResponse.competitor_strengths, {})}
            {renderSection("Key Findings", apiResponse.key_findings, {})}
            {renderSourcesSection(apiResponse.sources)}
          </div>
        )}
      </div>
    </div>
  );
}