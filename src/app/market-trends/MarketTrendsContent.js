"use client";

import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Link from 'next/link';
import MarketTrand from './MarketTrand';
import Mark from './Mark';

export default function MarketTrendsContent() {
  const [viewMode, setViewMode] = useState('api');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [parsedReport, setParsedReport] = useState('');
  const [userInputs, setUserInputs] = useState({
    company_name: '',
    industry: '',
    focus_areas: [],
    time_period: '2024'
  });

  const [analysisStatus, setAnalysisStatus] = useState('idle');
  const [showValidation, setShowValidation] = useState(false);

  const focusAreaOptions = [
    "Market Size and Growth",
    "Competitor Analysis",
    "Customer Demographics",
    "Technology Trends",
    "Financial Analysis",
    "Geographic Expansion",
    "Product Development"
  ];

  // Simple function to convert markdown-like text to HTML
  const convertToHtml = (text) => {
    if (!text) return '';
    
    return text
      // Headers
      .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mt-6 mb-4 text-gray-900">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mt-6 mb-3 text-gray-800">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-xl font-semibold mt-4 mb-2 text-gray-700">$1</h3>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      // Lists
      .replace(/^\- (.*$)/gm, '<li class="ml-4 mb-1 text-gray-700">• $1</li>')
      // Paragraphs
      .replace(/^(?!<[hl]|<li)(.*$)/gm, '<p class="mb-4 text-gray-600 leading-relaxed">$1</p>')
      // List wrapper
      .replace(/(<li.*<\/li>)/s, '<ul class="mb-4">$1</ul>');
  };

  useEffect(() => {
    if (analysisResult?.analysis_report) {
      const htmlContent = convertToHtml(analysisResult.analysis_report);
      setParsedReport(htmlContent);
    }
  }, [analysisResult]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserInputs(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFocusAreaChange = (e) => {
    const value = Array.from(e.target.selectedOptions, option => option.value);
    setUserInputs(prev => ({
      ...prev,
      focus_areas: value
    }));
  };

  const startAnalysis = async () => {
    if (!userInputs.company_name) {
      setError('Company name is required');
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      setAnalysisStatus('starting');

      const response = await fetch('http://localhost:5001/api/market-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userInputs)
      });

      const data = await response.json();
      
      if (data.status === 'error') {
        throw new Error(data.message);
      }

      setAnalysisResult(data);
      setAnalysisStatus('completed');
    } catch (err) {
      setError(err.message);
      setAnalysisStatus('error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">Market Analysis Configuration</h2>
          
          {/* Input Form */}
          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Company Name</label>
              <input
                type="text"
                name="company_name"
                value={userInputs.company_name}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter company name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Industry</label>
              <input
                type="text"
                name="industry"
                value={userInputs.industry}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter industry"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Focus Areas</label>
              <select
                multiple
                name="focus_areas"
                value={userInputs.focus_areas}
                onChange={handleFocusAreaChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {focusAreaOptions.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">Hold Ctrl/Cmd to select multiple areas</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Time Period</label>
              <input
                type="text"
                name="time_period"
                value={userInputs.time_period}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 2024"
              />
            </div>
          </div>

          <button
            onClick={startAnalysis}
            disabled={isAnalyzing}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
          >
            {isAnalyzing ? 'Analyzing...' : 'Start Analysis'}
          </button>
        </div>

        {/* Analysis Status */}
        {isAnalyzing && (
          <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
            <div className="flex items-center space-x-3">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <p className="text-gray-700">Analysis in progress...</p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
            <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
              {error}
            </div>
          </div>
        )}

        {/* Results Display */}
        {analysisResult && (
          <div className="bg-white rounded-lg shadow-lg">
            <div className="p-8">
              <h3 className="text-2xl font-bold mb-6 text-gray-800">Analysis Results</h3>
              
              {/* Summary */}
              <div className="mb-8">
                <h4 className="text-xl font-semibold mb-4 text-gray-700">Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-lg">
                  <div>
                    <p className="mb-2"><span className="font-medium">Company:</span> {analysisResult.summary.company}</p>
                    <p><span className="font-medium">Industry:</span> {analysisResult.summary.industry}</p>
                  </div>
                  <div>
                    <p className="mb-2"><span className="font-medium">Time Period:</span> {analysisResult.summary.time_period}</p>
                    <p><span className="font-medium">Focus Areas:</span> {analysisResult.summary.focus_areas.join(', ')}</p>
                  </div>
                </div>
              </div>

              {/* Validation Report with Dropdown */}
              <div className="mb-8">
                <button
                  onClick={() => setShowValidation(!showValidation)}
                  className="flex items-center justify-between w-full text-left text-xl font-semibold mb-4 text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <span>Validation Report</span>
                  <svg
                    className={`w-6 h-6 transform transition-transform duration-200 ${showValidation ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showValidation && (
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <pre className="whitespace-pre-wrap text-gray-700 leading-relaxed">{analysisResult.validation_report}</pre>
                  </div>
                )}
              </div>

              {/* Market Analysis Report */}
              <div>
                <h4 className="text-xl font-semibold mb-4 text-gray-700">Market Analysis Report</h4>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div 
                    className="space-y-4"
                    dangerouslySetInnerHTML={{ __html: parsedReport }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}