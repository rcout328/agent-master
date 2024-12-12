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

  const [savedReports, setSavedReports] = useState([]);

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
      .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mt-6 mb-4 text-purple-400">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mt-6 mb-3 text-purple-400">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-xl font-semibold mt-4 mb-2 text-purple-400">$1</h3>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
      // Lists
      .replace(/^\- (.*$)/gm, '<li class="ml-4 mb-1 text-white">• $1</li>')
      // Paragraphs
      .replace(/^(?!<[hl]|<li)(.*$)/gm, '<p class="mb-4 text-white leading-relaxed">$1</p>')
      // List wrapper
      .replace(/(<li.*<\/li>)/s, '<ul class="mb-4">$1</ul>');
  };

  useEffect(() => {
    if (analysisResult?.analysis_report) {
      const htmlContent = convertToHtml(analysisResult.analysis_report);
      setParsedReport(htmlContent);
    }
  }, [analysisResult]);

  useEffect(() => {
    // Load saved reports
    const savedReportsFromStorage = localStorage.getItem('marketTrendReports');
    if (savedReportsFromStorage) {
      setSavedReports(JSON.parse(savedReportsFromStorage));
    }

    // Load current analysis
    const currentAnalysis = localStorage.getItem('currentMarketAnalysis');
    if (currentAnalysis) {
      const parsedAnalysis = JSON.parse(currentAnalysis);
      setAnalysisResult(parsedAnalysis.result);
      setUserInputs(parsedAnalysis.inputs);
    }
  }, []);

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
      // Clear previous results
      setAnalysisResult(null);
      setParsedReport('');
      setIsAnalyzing(true);
      setError(null);
      
      // Clear current analysis from localStorage when starting new analysis
      localStorage.removeItem('currentMarketAnalysis');

      const response = await fetch('https://varun324242-sj.hf.space/api/market-analysis', {
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

      // Save new report to local storage
      const newReport = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        company: userInputs.company_name,
        industry: userInputs.industry,
        result: data
      };

      const updatedReports = [newReport, ...savedReports].slice(0, 10);
      localStorage.setItem('marketTrendReports', JSON.stringify(updatedReports));
      setSavedReports(updatedReports);

      // Save current analysis
      localStorage.setItem('currentMarketAnalysis', JSON.stringify({
        result: data,
        inputs: userInputs,
        timestamp: new Date().toISOString()
      }));

      setAnalysisResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearReports = () => {
    localStorage.removeItem('marketTrendReports');
    localStorage.removeItem('currentMarketAnalysis');
    setSavedReports([]);
    setAnalysisResult(null);
    setParsedReport('');
    setUserInputs({
      company_name: '',
      industry: '',
      focus_areas: [],
      time_period: '2024'
    });
  };

  const loadSavedReport = (report) => {
    // Save as current analysis
    localStorage.setItem('currentMarketAnalysis', JSON.stringify({
      result: report.result,
      inputs: {
        company_name: report.company,
        industry: report.industry,
        focus_areas: report.result.summary.focus_areas || [],
        time_period: report.result.summary.time_period || '2024'
      },
      timestamp: report.timestamp
    }));

    setAnalysisResult(report.result);
    setUserInputs({
      company_name: report.company,
      industry: report.industry,
      focus_areas: report.result.summary.focus_areas || [],
      time_period: report.result.summary.time_period || '2024'
    });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Market Trends Analysis
          </h1>
        </div>

        <div className="mb-10 flex justify-center">
          <div className="bg-[#1D1D1F]/60 backdrop-blur-xl p-1.5 rounded-xl inline-flex shadow-xl">
            <button className="px-8 py-2.5 rounded-lg transition-all duration-300 bg-purple-600/90 text-white">
              Market Analysis
            </button>
            <Link 
              href="/competitor-tracking"
              className="px-8 py-2.5 rounded-lg text-white hover:text-white hover:bg-white/5"
            >
              Competitor Tracking
            </Link>
          </div>
        </div>

        {savedReports.length > 0 && (
          <div className="mb-6 flex justify-between items-center">
            <div className="text-sm text-white">
              {savedReports.length} saved report{savedReports.length !== 1 ? 's' : ''}
            </div>
            <button
              onClick={clearReports}
              className="px-4 py-1.5 text-sm rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
            >
              Clear All Reports
            </button>
          </div>
        )}

        {savedReports.length > 0 && (
          <div className="mb-8 bg-[#1D1D1F]/60 backdrop-blur-xl rounded-xl p-4 border border-gray-800/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-purple-400">Recent Reports</h3>
            </div>
            <div className="space-y-2">
              {savedReports.map(report => (
                <div 
                  key={report.id}
                  className="flex justify-between items-center p-3 rounded-lg bg-[#2D2D2F]/50 hover:bg-[#2D2D2F]/70 transition-colors cursor-pointer"
                  onClick={() => loadSavedReport(report)}
                >
                  <div>
                    <p className="text-white font-medium">{report.company}</p>
                    <p className="text-sm text-white">{report.industry}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white">
                      {new Date(report.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-8">
          <div className="bg-[#1D1D1F]/80 backdrop-blur-xl rounded-xl shadow-xl p-8 border border-gray-800/50">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-400">Company Name</label>
                <input
                  name="company_name"
                  value={userInputs.company_name}
                  onChange={handleInputChange}
                  className="w-full p-2.5 bg-[#2D2D2F]/50 text-white rounded-lg border border-gray-700/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10"
                  placeholder="Enter company name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-400">Industry</label>
                <input
                  name="industry"
                  value={userInputs.industry}
                  onChange={handleInputChange}
                  className="w-full p-2.5 bg-[#2D2D2F]/50 text-white rounded-lg border border-gray-700/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10"
                  placeholder="Enter industry"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium text-purple-400">Focus Areas</label>
                <div className="grid grid-cols-3 gap-2 bg-[#2D2D2F]/50 p-3 rounded-lg border border-gray-700/50">
                  {focusAreaOptions.map(area => (
                    <label 
                      key={area} 
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-purple-600/10 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        name="focus_areas"
                        value={area}
                        checked={userInputs.focus_areas.includes(area)}
                        onChange={(e) => {
                          const value = e.target.value;
                          setUserInputs(prev => ({
                            ...prev,
                            focus_areas: e.target.checked 
                              ? [...prev.focus_areas, value]
                              : prev.focus_areas.filter(item => item !== value)
                          }));
                        }}
                        className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500/20"
                      />
                      <span className="text-sm text-white group-hover:text-white">
                        {area}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-400">Time Period</label>
                <input
                  name="time_period"
                  value={userInputs.time_period}
                  onChange={handleInputChange}
                  className="w-full p-2.5 bg-[#2D2D2F]/50 text-white rounded-lg border border-gray-700/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10"
                  placeholder="e.g., 2024"
                />
              </div>

              <div className="col-span-2">
                <button
                  onClick={startAnalysis}
                  disabled={isAnalyzing}
                  className="w-full px-6 py-2.5 rounded-lg font-medium bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Start Analysis'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[#1D1D1F]/80 backdrop-blur-xl rounded-xl shadow-xl border border-gray-800/50">
            {isAnalyzing ? (
              <div className="h-60 flex items-center justify-center">
                <div className="flex items-center gap-3">
                  <div className="animate-spin h-6 w-6 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                  <p className="text-white text-lg">Analyzing market trends...</p>
                </div>
              </div>
            ) : analysisResult ? (
              <div className="p-8 space-y-6">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                  Analysis Results
                </h2>
                
                <div className="bg-[#2D2D2F]/70 p-6 rounded-lg border border-gray-700/50">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <p className="text-white">
                        <span className="font-medium text-purple-400">Company:</span>
                        <span className="ml-2">{analysisResult.summary.company}</span>
                      </p>
                      <p className="text-white">
                        <span className="font-medium text-purple-400">Industry:</span>
                        <span className="ml-2">{analysisResult.summary.industry}</span>
                      </p>
                    </div>
                    <div className="space-y-3">
                      <p className="text-white">
                        <span className="font-medium text-purple-400">Time Period:</span>
                        <span className="ml-2">{analysisResult.summary.time_period}</span>
                      </p>
                      <p className="text-white">
                        <span className="font-medium text-purple-400">Focus Areas:</span>
                        <span className="ml-2">{analysisResult.summary.focus_areas.join(', ')}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#2D2D2F]/70 p-6 rounded-lg border border-gray-700/50">
                  <div className="prose prose-invert max-w-none">
                    <div 
                      className="
                        text-white
                        leading-relaxed 
                        [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:text-purple-400 [&>h1]:mb-6
                        [&>h2]:text-2xl [&>h2]:font-semibold [&>h2]:text-purple-400 [&>h2]:mt-8 [&>h2]:mb-4
                        [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-purple-400 [&>h3]:mt-6 [&>h3]:mb-3
                        [&>p]:text-white [&>p]:mb-4 [&>p]:text-base [&>p]:leading-relaxed
                        [&>ul]:mb-6 [&>ul]:list-disc [&>ul]:pl-6 
                        [&>ul>li]:text-white [&>ul>li]:mb-2
                        [&>ol]:mb-6 [&>ol]:list-decimal [&>ol]:pl-6
                        [&>ol>li]:text-white [&>ol>li]:mb-2
                        [&>strong]:text-purple-300 [&>strong]:font-semibold
                        [&>em]:text-purple-200 [&>em]:italic
                        [&>blockquote]:border-l-4 [&>blockquote]:border-purple-400 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-white
                      "
                      dangerouslySetInnerHTML={{ __html: parsedReport }} 
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-60 flex items-center justify-center">
                <p className="text-white text-lg">
                  Analysis results will appear here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}