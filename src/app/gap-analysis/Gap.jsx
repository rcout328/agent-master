"use client";

import { useState, useRef, useEffect } from 'react';
import { useStoredInput } from '@/hooks/useStoredInput';
import jsPDF from 'jspdf';
import Link from 'next/link';

export default function GapAnalysisContent() {
  const [userInput, setUserInput] = useStoredInput();
  const [gapAnalysis, setGapAnalysis] = useState({
    current_state: [],
    desired_state: [],
    identified_gaps: [],
    recommendations: [],
    sources: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(0);
  const analysisRef = useRef(null);

  // Load gap analysis data from local storage on component mount
  useEffect(() => {
    const storedData = localStorage.getItem(`gapAnalysis_${userInput}`);
    if (storedData) {
      const data = JSON.parse(storedData);
      setGapAnalysis(data);
      setCurrentPhase(6); // Set to last phase if data is available
    }
  }, [userInput]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setCurrentPhase(1);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/gap-analysis', { // Updated URL to match the Flask API
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
      console.log('Gap API Response:', data);
      
      // Update data progressively
      if (data.current_state?.length) {
        setCurrentPhase(2);
        setGapAnalysis(prev => ({ ...prev, current_state: data.current_state }));
      }
      if (data.desired_state?.length) {
        setCurrentPhase(3);
        setGapAnalysis(prev => ({ ...prev, desired_state: data.desired_state }));
      }
      if (data.identified_gaps?.length) {
        setCurrentPhase(4);
        setGapAnalysis(prev => ({ ...prev, identified_gaps: data.identified_gaps }));
      }
      if (data.recommendations?.length) {
        setCurrentPhase(5);
        setGapAnalysis(prev => ({ ...prev, recommendations: data.recommendations }));
      }
      if (data.sources?.length) {
        setCurrentPhase(6);
        setGapAnalysis(prev => ({ ...prev, sources: data.sources }));
      }
      
      localStorage.setItem(`gapAnalysis_${userInput}`, JSON.stringify(data));

    } catch (error) {
      console.error('Error:', error);
      setError('Failed to get gap analysis. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Gap Analysis Report", 10, 10);
    
    const sections = [
      { title: "Current State", data: gapAnalysis.current_state },
      { title: "Desired State", data: gapAnalysis.desired_state },
      { title: "Identified Gaps", data: gapAnalysis.identified_gaps },
      { title: "Recommendations", data: gapAnalysis.recommendations },
      { title: "Data Sources", data: gapAnalysis.sources.map(source => source.domain) }
    ];

    let y = 20;
    sections.forEach(section => {
      doc.setFontSize(14);
      doc.text(section.title, 10, y);
      y += 10;
      doc.setFontSize(12);
      section.data.forEach(item => {
        doc.text(`- ${item}`, 10, y);
        y += 5;
      });
      y += 5; // Add space between sections
    });

    doc.save("gap_analysis_report.pdf");
  };

  const renderGapSection = (title, data) => {
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
      'Current State',
      'Desired State',
      'Identified Gaps',
      'Recommendations',
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
              Gap Analysis
            </h1>
            <p className="text-gray-400 mt-2">Analyze current vs desired state gaps</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-[#1D1D1F] p-1 rounded-xl mb-6 sm:mb-8 inline-flex w-full sm:w-auto overflow-x-auto">
          <Link 
            href="/swot-analysis"
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-purple-600/50 transition-all duration-200 text-sm sm:text-base whitespace-nowrap"
          >
            SWOT Analysis
          </Link>
          <button 
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-purple-600 text-white text-sm sm:text-base whitespace-nowrap"
          >
            Gap Analysis
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
                placeholder="Enter your business details for gap analysis..."
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
                'Analyze Gaps'
              )}
            </button>
          </form>

          {/* Analysis Results */}
          <div ref={analysisRef} className="mt-6">
            {error ? (
              <div className="text-red-500">{error}</div>
            ) : (
              <div className="space-y-6">
                {renderGapSection("Current State", gapAnalysis.current_state)}
                {renderGapSection("Desired State", gapAnalysis.desired_state)}
                {renderGapSection("Identified Gaps", gapAnalysis.identified_gaps)}
                {renderGapSection("Recommendations", gapAnalysis.recommendations)}
                
                {/* Add Sources Section */}
                {renderSourcesSection(gapAnalysis.sources)}
              </div>
            )}
          </div>

          {/* Export PDF Button */}
          <div className="mt-6">
            <button
              onClick={exportToPDF}
              disabled={isLoading || !gapAnalysis || Object.keys(gapAnalysis).length === 0}
              className={`w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-medium transition-all duration-200 text-sm sm:text-base
                          ${!isLoading && gapAnalysis && Object.keys(gapAnalysis).length > 0
                ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg shadow-green-500/25'
                : 'bg-gray-600 text-gray-300 cursor-not-allowed'}`}
            >
              Export to PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 