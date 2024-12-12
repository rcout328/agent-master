"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SimpleMarkdown from 'simple-markdown';

export default function CompetitorTrackingContent() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [parsedReport, setParsedReport] = useState('');
  const [showValidation, setShowValidation] = useState(false);
  const [userInputs, setUserInputs] = useState({
    company_name: '',
    industry: '',
    competitors: [],
    metrics: [],
    timeframe: '2024',
    analysis_depth: 'detailed',
    market_region: 'global',
    analysis_scope: 4
  });

  const [currentCompetitor, setCurrentCompetitor] = useState('');
  const [allReports, setAllReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportContent, setReportContent] = useState('');

  const metricOptions = [
    "Market Share",
    "Product Features", 
    "Pricing Strategy",
    "Marketing Channels",
    "Customer Satisfaction"
  ];

  const analysisDepthOptions = [
    { value: 'basic', label: 'Basic Analysis' },
    { value: 'detailed', label: 'Detailed Analysis' },
    { value: 'comprehensive', label: 'Comprehensive Analysis' }
  ];

  const marketRegions = [
    { value: 'global', label: 'Global' },
    { value: 'north_america', label: 'North America' },
    { value: 'europe', label: 'Europe' },
    { value: 'asia_pacific', label: 'Asia Pacific' },
    { value: 'latin_america', label: 'Latin America' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserInputs(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCompetitorAdd = () => {
    if (currentCompetitor.trim()) {
      setUserInputs(prev => ({
        ...prev,
        competitors: [...prev.competitors, currentCompetitor.trim()]
      }));
      setCurrentCompetitor('');
    }
  };

  const removeCompetitor = (index) => {
    setUserInputs(prev => ({
      ...prev,
      competitors: prev.competitors.filter((_, i) => i !== index)
    }));
  };

  const handleMetricsChange = (e) => {
    const value = Array.from(e.target.selectedOptions, option => option.value);
    setUserInputs(prev => ({
      ...prev,
      metrics: value
    }));
  };

  const startAnalysis = async () => {
    if (!userInputs.company_name) {
      setError('Company name is required');
      return;
    }

    if (userInputs.competitors.length === 0) {
      setError('At least one competitor is required');
      return;
    }

    if (userInputs.metrics.length === 0) {
      setError('Please select at least one metric');
      return;
    }

    if (!userInputs.industry) {
      setError('Industry is required');
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);

      const requestData = {
        report_type: 'competitor_tracking',
        inputs: {
          ...userInputs,
          analysis_scope: parseInt(userInputs.analysis_scope),
          timeframe: userInputs.timeframe.toString()
        }
      };

      const response = await fetch('https://varun324242-sj.hf.space/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status === 'error') {
        throw new Error(data.message);
      }

      setAnalysisResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fetchAllReports = async () => {
    try {
      const response = await fetch('https://varun324242-sj.hf.space/api/reports');
      const data = await response.json();
      setAllReports(data.reports);
    } catch (err) {
      console.error('Error fetching reports:', err);
    }
  };

  useEffect(() => {
    if (analysisResult?.analysis_report) {
      const formattedReport = analysisResult.analysis_report
        .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mt-6 mb-4">$1</h1>')
        .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mt-6 mb-3">$1</h2>')
        .replace(/^### (.*$)/gm, '<h3 class="text-xl font-semibold mt-4 mb-2">$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^\- (.*$)/gm, '<li class="ml-4 mb-1">• $1</li>')
        .replace(/^(?!<[hl]|<li)(.*$)/gm, '<p class="mb-4 leading-relaxed">$1</p>')
        .replace(/(<li.*<\/li>)/s, '<ul class="mb-4 space-y-2">$1</ul>');
      
      setParsedReport(formattedReport);
    }
  }, [analysisResult]);

  useEffect(() => {
    fetchAllReports();
  }, []);

  const viewReport = async (report) => {
    try {
      const response = await fetch(`https://varun324242-sj.hf.space/api/report-content/${report.filename}`);
      const data = await response.json();
      
      if (data.status === 'success') {
        setSelectedReport(report);
        setReportContent(data.content);
        setShowReportModal(true);
      }
    } catch (err) {
      console.error('Error fetching report content:', err);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Competitor Tracking Analysis
          </h1>
        </div>

        {/* Navigation */}
        <div className="mb-10 flex justify-center">
          <div className="bg-[#1D1D1F]/60 backdrop-blur-xl p-1.5 rounded-xl inline-flex shadow-xl">
            <Link 
              href="/market-trends"
              className="px-8 py-2.5 rounded-lg text-white hover:text-white hover:bg-white/5"
            >
              Market Analysis
            </Link>
            <button className="px-8 py-2.5 rounded-lg transition-all duration-300 bg-purple-600/90 text-white">
              Competitor Tracking
            </button>
          </div>
        </div>

        {/* Input Form */}
        <div className="space-y-6 mb-8 bg-[#1D1D1F]/60 backdrop-blur-xl p-8 rounded-xl">
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Company Name</label>
            <input
              type="text"
              name="company_name"
              value={userInputs.company_name}
              onChange={handleInputChange}
              className="w-full p-3 bg-[#2D2D2F] border border-gray-700 rounded-md focus:ring-2 focus:ring-purple-500 text-white"
              placeholder="Your company name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Industry</label>
            <input
              type="text"
              name="industry"
              value={userInputs.industry}
              onChange={handleInputChange}
              className="w-full p-3 bg-[#2D2D2F] border border-gray-700 rounded-md focus:ring-2 focus:ring-purple-500 text-white"
              placeholder="Your industry"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Competitors</label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={currentCompetitor}
                onChange={(e) => setCurrentCompetitor(e.target.value)}
                className="flex-1 p-3 bg-[#2D2D2F] border border-gray-700 rounded-md focus:ring-2 focus:ring-purple-500 text-white"
                placeholder="Add competitor"
              />
              <button
                onClick={handleCompetitorAdd}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Add
              </button>
            </div>
            <div className="space-y-2">
              {userInputs.competitors.map((competitor, index) => (
                <div key={index} className="flex items-center justify-between bg-[#2D2D2F] p-2 rounded">
                  <span className="text-white">{competitor}</span>
                  <button
                    onClick={() => removeCompetitor(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Tracking Metrics</label>
            <select
              multiple
              name="metrics"
              value={userInputs.metrics}
              onChange={handleMetricsChange}
              className="w-full p-3 bg-[#2D2D2F] border border-gray-700 rounded-md focus:ring-2 focus:ring-purple-500 text-white"
            >
              {metricOptions.map(metric => (
                <option key={metric} value={metric}>{metric}</option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-400">Hold Ctrl/Cmd to select multiple metrics</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Analysis Depth</label>
            <select
              name="analysis_depth"
              value={userInputs.analysis_depth}
              onChange={handleInputChange}
              className="w-full p-3 bg-[#2D2D2F] border border-gray-700 rounded-md focus:ring-2 focus:ring-purple-500 text-white"
            >
              {analysisDepthOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Market Region</label>
            <select
              name="market_region"
              value={userInputs.market_region}
              onChange={handleInputChange}
              className="w-full p-3 bg-[#2D2D2F] border border-gray-700 rounded-md focus:ring-2 focus:ring-purple-500 text-white"
            >
              {marketRegions.map(region => (
                <option key={region.value} value={region.value}>{region.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={startAnalysis}
            disabled={isAnalyzing}
            className="w-full bg-purple-600 text-white px-6 py-3 rounded-md font-medium hover:bg-purple-700 disabled:bg-purple-800/50 transition-colors"
          >
            {isAnalyzing ? 'Analyzing Competitors...' : 'Start Analysis'}
          </button>
        </div>

        {/* Analysis Status */}
        {isAnalyzing && (
          <div className="bg-[#1D1D1F]/60 backdrop-blur-xl p-6 rounded-xl mb-8">
            <div className="flex items-center space-x-3">
              <div className="animate-spin h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full"></div>
              <p className="text-white">Analyzing competitors...</p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-[#1D1D1F]/60 backdrop-blur-xl p-6 rounded-xl mb-8">
            <div className="bg-red-900/50 border border-red-500/50 rounded-md p-4 text-red-200">
              {error}
            </div>
          </div>
        )}

        {/* Results Display */}
        {analysisResult && (
          <div className="bg-[#1D1D1F]/60 backdrop-blur-xl rounded-xl">
            <div className="p-8">
              <h2 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                Analysis Results
              </h2>
              
              <div className="prose prose-invert max-w-none 
                [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:mb-4 
                [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:mb-3
                [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:mb-2
                [&>p]:mb-4 [&>p]:leading-relaxed
                [&>ul]:mb-4 [&>ul]:space-y-2
                [&>strong]:text-purple-300 [&>strong]:font-semibold
                [&>em]:text-purple-200 [&>em]:italic
                [&>blockquote]:border-l-4 [&>blockquote]:border-purple-400 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-white"
                dangerouslySetInnerHTML={{ __html: parsedReport }}
              />
            </div>
          </div>
        )}

        {showReportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#1D1D1F] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {selectedReport.company_name} - {selectedReport.report_type}
                  </h3>
                  <p className="text-sm text-gray-400">Generated: {selectedReport.timestamp}</p>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div
                  className="prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: reportContent }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}