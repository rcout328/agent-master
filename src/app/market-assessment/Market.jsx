"use client";

import { useState, useRef, useEffect } from 'react';
import { useStoredInput } from '@/hooks/useStoredInput';
import { Bar } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import Link from 'next/link';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

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
  const [marketAnalysis, setMarketAnalysis] = useState({
    market_overview: [],
    market_dynamics: [],
    competitive_landscape: [],
    future_outlook: [],
    sources: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(0);
  const analysisRef = useRef(null);

  // Load market analysis from local storage on component mount
  useEffect(() => {
    const storedAnalysis = localStorage.getItem(`marketAnalysis_${userInput}`);
    if (storedAnalysis) {
      setMarketAnalysis(JSON.parse(storedAnalysis));
      setCurrentPhase(6); // Assuming all phases are complete if data is loaded
    }
  }, [userInput]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setCurrentPhase(1);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/market-assessment', { // Updated port to match combined_api.py
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
      console.log('Market API Response:', data);
      
      // Update data progressively
      if (data.market_overview?.length) {
        setCurrentPhase(2);
        setMarketAnalysis(prev => ({ ...prev, market_overview: data.market_overview }));
      }
      if (data.market_dynamics?.length) {
        setCurrentPhase(3);
        setMarketAnalysis(prev => ({ ...prev, market_dynamics: data.market_dynamics }));
      }
      if (data.competitive_landscape?.length) {
        setCurrentPhase(4);
        setMarketAnalysis(prev => ({ ...prev, competitive_landscape: data.competitive_landscape }));
      }
      if (data.future_outlook?.length) {
        setCurrentPhase(5);
        setMarketAnalysis(prev => ({ ...prev, future_outlook: data.future_outlook }));
      }
      if (data.sources?.length) {
        setCurrentPhase(6);
        setMarketAnalysis(prev => ({ ...prev, sources: data.sources }));
      }
      
      localStorage.setItem(`marketAnalysis_${userInput}`, JSON.stringify(data));

    } catch (error) {
      console.error('Error:', error);
      setError('Failed to get market analysis. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Market Assessment Report", 10, 10);
    
    let y = 20;
    const sections = [
      { title: "Market Overview", data: marketAnalysis.market_overview },
      { title: "Market Dynamics", data: marketAnalysis.market_dynamics },
      { title: "Competitive Landscape", data: marketAnalysis.competitive_landscape },
      { title: "Future Outlook", data: marketAnalysis.future_outlook },
      { title: "Data Sources", data: marketAnalysis.sources.map(source => source.domain) } // Changed to an array
    ];

    sections.forEach(section => {
      doc.setFontSize(16);
      doc.text(section.title, 10, y);
      y += 10;
      doc.setFontSize(12);
      if (Array.isArray(section.data)) { // Check if section.data is an array
        section.data.forEach(item => {
          doc.text(item, 10, y);
          y += 10;
        });
      } else {
        doc.text(section.data, 10, y); // Handle case where data is a string
        y += 10;
      }
      y += 5; // Add space between sections
    });

    doc.save("market_assessment_report.pdf");
  };

  const renderMarketSection = (title, data) => {
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
      'Market Overview',
      'Market Dynamics',
      'Competitive Landscape',
      'Future Outlook',
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
              Market Assessment
            </h1>
            <p className="text-gray-400 mt-2">Analyze market size, dynamics, and opportunities</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-[#1D1D1F] p-1 rounded-xl mb-6 sm:mb-8 inline-flex w-full sm:w-auto overflow-x-auto">
          <button 
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-purple-600 text-white text-sm sm:text-base whitespace-nowrap"
          >
            Market Assessment
          </button>
          <Link 
            href="/impact-assessment"
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-purple-600/50 transition-all duration-200 text-sm sm:text-base whitespace-nowrap"
          >
            Impact Assessment
          </Link>
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
                placeholder="Enter your business details for market assessment..."
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
                'Assess Market'
              )}
            </button>
          </form>

          {/* PDF Export Button */}
          <div className="mt-4">
            <button
              onClick={exportToPDF}
              className="w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl bg-purple-600 text-white font-medium transition-all duration-200 text-sm sm:text-base"
            >
              Export to PDF
            </button>
          </div>

          {/* Analysis Results */}
          <div ref={analysisRef} className="mt-6">
            {error ? (
              <div className="text-red-500">{error}</div>
            ) : (
              <div className="space-y-6">
                {renderMarketSection("Market Overview", marketAnalysis.market_overview)}
                {renderMarketSection("Market Dynamics", marketAnalysis.market_dynamics)}
                {renderMarketSection("Competitive Landscape", marketAnalysis.competitive_landscape)}
                {renderMarketSection("Future Outlook", marketAnalysis.future_outlook)}
                
                {/* Add Sources Section */}
                {renderSourcesSection(marketAnalysis.sources)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 