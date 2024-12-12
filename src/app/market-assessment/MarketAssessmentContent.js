"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaChartLine, FaHistory, FaImpact, FaArrowRight } from 'react-icons/fa';

export default function MarketAssessmentContent() {
  const [viewMode, setViewMode] = useState('form');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [allReports, setAllReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [parsedReport, setParsedReport] = useState('');

  const [marketInputs, setMarketInputs] = useState({
    company_name: '',
    industry: '',
    market_type: 'general',
    analysis_depth: 'detailed',
    timeframe: '2024',
    focus_areas: [],
    market_region: 'global',
    metrics: []
  });

  // Predefined options
  const marketTypes = [
    { value: 'general', label: 'General Market Assessment' },
    { value: 'competitive', label: 'Competitive Assessment' },
    { value: 'growth', label: 'Growth Assessment' },
    { value: 'entry', label: 'Market Entry Assessment' }
  ];

  const focusAreas = [
    "Market Size and Potential",
    "Competitive Landscape",
    "Growth Opportunities",
    "Market Trends",
    "Customer Segments",
    "Entry Barriers",
    "Regulatory Environment"
  ];

  const metrics = [
    "Market Share",
    "Revenue Growth",
    "Customer Acquisition Cost",
    "Market Penetration",
    "Brand Awareness",
    "Customer Lifetime Value"
  ];

  const regions = [
    { value: 'global', label: 'Global' },
    { value: 'north_america', label: 'North America' },
    { value: 'europe', label: 'Europe' },
    { value: 'asia_pacific', label: 'Asia Pacific' },
    { value: 'latin_america', label: 'Latin America' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'focus_areas' || name === 'metrics') {
      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
      setMarketInputs(prev => ({
        ...prev,
        [name]: selectedOptions
      }));
    } else {
      setMarketInputs(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const startAnalysis = async () => {
    if (!marketInputs.company_name) {
      setError('Company name is required');
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);

      const response = await fetch('http://localhost:5001/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          report_type: 'market_assessment',
          inputs: {
            ...marketInputs,
            analysis_type: 'market_assessment'
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate report');
      }

      const data = await response.json();
      setAnalysisResult(data);
      fetchAllReports();
      setViewMode('results');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fetchAllReports = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/reports');
      const data = await response.json();
      setAllReports(data.reports.filter(report => 
        report.report_type.includes('market_assessment')
      ));
    } catch (err) {
      console.error('Error fetching reports:', err);
    }
  };

  useEffect(() => {
    fetchAllReports();
  }, []);

  useEffect(() => {
    if (analysisResult?.analysis_report) {
      try {
        // If the report is a file path, fetch the content
        if (typeof analysisResult.analysis_report === 'string' && 
            analysisResult.analysis_report.endsWith('.md')) {
          fetch(`http://localhost:5001/api/report-content/${analysisResult.analysis_report}`)
            .then(res => res.json())
            .then(data => {
              const formattedReport = formatMarkdownContent(data.content);
              setParsedReport(formattedReport);
            })
            .catch(err => {
              console.error('Error fetching report:', err);
              setParsedReport('Error loading report content');
            });
        } else {
          // Direct content formatting
          const formattedReport = formatMarkdownContent(analysisResult.analysis_report);
          setParsedReport(formattedReport);
        }
      } catch (err) {
        console.error('Error processing report:', err);
        setParsedReport('Error processing report content');
      }
    }
  }, [analysisResult]);

  const formatMarkdownContent = (content) => {
    return content
      // Headers
      .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mt-8 mb-4 text-gray-900">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mt-6 mb-3 text-gray-800">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-xl font-semibold mt-4 mb-2 text-gray-700">$1</h3>')
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      // Lists
      .replace(/^\- (.*$)/gm, '<li class="ml-4 mb-2 text-gray-700">• $1</li>')
      // Tables
      .replace(/\|(.+)\|/g, '<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200">$1</table></div>')
      .replace(/\|---(.+)---\|/g, '<thead class="bg-gray-50"><tr>$1</tr></thead>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline">$1</a>')
      // Paragraphs
      .replace(/^(?!<[hl]|<li|<table)(.*$)/gm, '<p class="mb-4 text-gray-600 leading-relaxed">$1</p>')
      // List wrapper
      .replace(/(<li.*<\/li>)/s, '<ul class="mb-6 space-y-2">$1</ul>');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="mb-8 flex justify-between items-center">
          <div className="bg-white p-1 rounded-xl inline-flex shadow-sm">
            <button
              onClick={() => setViewMode('form')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'form' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              New Assessment
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'history'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              Assessment History
            </button>
          </div>

          {/* Simple text link to Impact Assessment */}
          <Link 
            href="/impact-assessment"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Impact Assessment
          </Link>
        </div>

        {/* Main Content */}
        {viewMode === 'form' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">Market Assessment</h2>
            
            {/* Form Content */}
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Company Name</label>
                  <input
                    type="text"
                    name="company_name"
                    value={marketInputs.company_name}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter company name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Industry</label>
                  <input
                    type="text"
                    name="industry"
                    value={marketInputs.industry}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter industry"
                  />
                </div>
              </div>

              {/* Assessment Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Assessment Type</label>
                  <select
                    name="market_type"
                    value={marketInputs.market_type}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    {marketTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Market Region</label>
                  <select
                    name="market_region"
                    value={marketInputs.market_region}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    {regions.map(region => (
                      <option key={region.value} value={region.value}>{region.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Focus Areas and Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Focus Areas</label>
                  <select
                    name="focus_areas"
                    multiple
                    value={marketInputs.focus_areas}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                  >
                    {focusAreas.map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Key Metrics</label>
                  <select
                    name="metrics"
                    multiple
                    value={marketInputs.metrics}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                  >
                    {metrics.map(metric => (
                      <option key={metric} value={metric}>{metric}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                </div>
              </div>

              <button
                onClick={startAnalysis}
                disabled={isAnalyzing}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
              >
                {isAnalyzing ? 'Generating Assessment...' : 'Generate Market Assessment'}
              </button>
            </div>
          </div>
        )}

        {viewMode === 'history' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">Assessment History</h2>
            
            {allReports.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allReports.map((report, index) => (
                  <div 
                    key={index}
                    className="bg-gray-50 rounded-lg p-6 border border-gray-200 hover:border-blue-500 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedReport(report);
                      setShowReportModal(true);
                    }}
                  >
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      {report.company_name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Generated: {new Date(report.timestamp).toLocaleString()}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-600 text-sm">View Report</span>
                      <FaChartLine className="text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12">
                No assessment reports found
              </div>
            )}
          </div>
        )}

        {/* Results View */}
        {viewMode === 'results' && analysisResult && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">Assessment Results</h2>
            
            {/* Summary Section */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4 text-gray-700">Assessment Summary</h3>
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="mb-2">
                      <span className="font-medium text-gray-700">Company:</span>{' '}
                      {analysisResult.summary?.company || marketInputs.company_name}
                    </p>
                    <p className="mb-2">
                      <span className="font-medium text-gray-700">Industry:</span>{' '}
                      {analysisResult.summary?.industry || marketInputs.industry}
                    </p>
                    <p>
                      <span className="font-medium text-gray-700">Generated:</span>{' '}
                      {new Date().toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="mb-2">
                      <span className="font-medium text-gray-700">Assessment Type:</span>{' '}
                      {marketInputs.market_type}
                    </p>
                    <p>
                      <span className="font-medium text-gray-700">Region:</span>{' '}
                      {marketInputs.market_region}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Analysis */}
            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-700">Market Assessment Report</h3>
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div
                  className="prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: parsedReport }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Report Modal */}
        {showReportModal && selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">
                    {selectedReport.company_name} - Market Assessment
                  </h3>
                  <p className="text-sm text-gray-600">Generated: {selectedReport.timestamp}</p>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div 
                  className="prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: formatMarkdownContent(selectedReport.content) 
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 