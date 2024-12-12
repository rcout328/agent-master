"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function GapAnalysisContent() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [parsedReport, setParsedReport] = useState('');
  const [showValidation, setShowValidation] = useState(false);
  const [allReports, setAllReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportContent, setReportContent] = useState('');

  const [gapFormInputs, setGapFormInputs] = useState({
    company_name: '',
    industry: '',
    focus_areas: [],
    timeframe: '2024',
    analysis_depth: 'detailed',
    market_region: 'global'
  });

  // Predefined options
  const focusAreas = [
    "Market Size and Growth",
    "Industry Trends",
    "Market Segments",
    "Geographic Distribution",
    "Competitive Landscape"
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
    { value: 'asia_pacific', label: 'Asia Pacific' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'focus_areas') {
      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
      setGapFormInputs(prev => ({
        ...prev,
        focus_areas: selectedOptions
      }));
    } else {
      setGapFormInputs(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const startAnalysis = async () => {
    if (!gapFormInputs.company_name) {
      setError('Company name is required');
      return;
    }

    if (!gapFormInputs.focus_areas || gapFormInputs.focus_areas.length === 0) {
      setError('Please select at least one focus area');
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);

      const response = await fetch('https://varun324242-sj.hf.space/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          report_type: 'gap_analysis',
          inputs: {
            ...gapFormInputs,
            analysis_type: 'gap'
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate report');
      }

      const data = await response.json();
      
      if (data.status === 'error') {
        throw new Error(data.message);
      }

      setAnalysisResult(data);
      fetchAllReports();
    } catch (err) {
      setError(err.message || 'An error occurred while generating the report');
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Parse markdown when analysis result changes
  useEffect(() => {
    if (analysisResult?.analysis_report) {
      const formattedReport = analysisResult.analysis_report
        .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mt-6 mb-4 text-gray-900">$1</h1>')
        .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mt-6 mb-3 text-gray-800">$1</h2>')
        .replace(/^### (.*$)/gm, '<h3 class="text-xl font-semibold mt-4 mb-2 text-gray-700">$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
        .replace(/^\- (.*$)/gm, '<li class="ml-4 mb-1 text-gray-700">• $1</li>')
        .replace(/^(?!<[hl]|<li)(.*$)/gm, '<p class="mb-4 text-gray-600 leading-relaxed">$1</p>')
        .replace(/(<li.*<\/li>)/s, '<ul class="mb-4 space-y-2">$1</ul>');
      
      setParsedReport(formattedReport);
    }
  }, [analysisResult]);

  const fetchAllReports = async () => {
    try {
      const response = await fetch('https://varun324242-sj.hf.space/api/reports');
      const data = await response.json();
      setAllReports(data.reports.filter(report => report.report_type.includes('gap')));
    } catch (err) {
      console.error('Error fetching reports:', err);
    }
  };

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

  useEffect(() => {
    fetchAllReports();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="mb-8">
          <div className="bg-white p-1 rounded-xl inline-flex shadow-sm">
            <Link 
              href="/competitor-tracking"
              className="px-4 py-2 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-all duration-200"
            >
              Competitor Tracking
            </Link>
            <button 
              className="px-4 py-2 rounded-lg bg-blue-600 text-white"
            >
              Gap Analysis
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">Gap Analysis</h2>
          
          {/* Input Form */}
          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Company Name</label>
              <input
                type="text"
                name="company_name"
                value={gapFormInputs.company_name}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="Your company name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Industry</label>
              <input
                type="text"
                name="industry"
                value={gapFormInputs.industry}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="Your industry"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Focus Areas</label>
              <select
                name="focus_areas"
                multiple
                value={gapFormInputs.focus_areas}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 min-h-[120px]"
              >
                {focusAreas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple areas</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Market Region</label>
              <select
                name="market_region"
                value={gapFormInputs.market_region}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                {marketRegions.map(region => (
                  <option key={region.value} value={region.value}>{region.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Analysis Depth</label>
              <select
                name="analysis_depth"
                value={gapFormInputs.analysis_depth}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                {analysisDepthOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Timeframe</label>
              <input
                type="text"
                name="timeframe"
                value={gapFormInputs.timeframe}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="Enter timeframe (e.g., 2024)"
              />
            </div>
          </div>

          <button
            onClick={startAnalysis}
            disabled={isAnalyzing}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
          >
            {isAnalyzing ? 'Generating Gap Analysis...' : 'Generate Gap Analysis'}
          </button>
        </div>

        {/* Analysis Status */}
        {isAnalyzing && (
          <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
            <div className="flex items-center space-x-3">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <p className="text-gray-700">Generating gap analysis...</p>
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
              <h2 className="text-3xl font-bold mb-6 text-gray-800">Gap Analysis Results</h2>
              
              {/* Summary Card */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-gray-700">Analysis Summary</h3>
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="mb-2">
                        <span className="font-medium text-gray-700">Company:</span>{' '}
                        {analysisResult.summary.company}
                      </p>
                      <p className="mb-2">
                        <span className="font-medium text-gray-700">Industry:</span>{' '}
                        {analysisResult.summary.industry}
                      </p>
                      <p>
                        <span className="font-medium text-gray-700">Generated:</span>{' '}
                        {analysisResult.summary.timestamp}
                      </p>
                    </div>
                    <div>
                      <p className="mb-2">
                        <span className="font-medium text-gray-700">Market Region:</span>{' '}
                        {gapFormInputs.market_region}
                      </p>
                      <p>
                        <span className="font-medium text-gray-700">Analysis Depth:</span>{' '}
                        {gapFormInputs.analysis_depth}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analysis Report */}
              <div>
                <h3 className="text-xl font-semibold mb-4 text-gray-700">Gap Analysis Report</h3>
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <div
                    className="prose prose-lg max-w-none"
                    dangerouslySetInnerHTML={{ __html: parsedReport }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Report Modal */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">
                    {selectedReport.company_name} - Gap Analysis
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
                    __html: reportContent
                      .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mt-6 mb-4 text-gray-900">$1</h1>')
                      .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mt-6 mb-3 text-gray-800">$1</h2>')
                      .replace(/^### (.*$)/gm, '<h3 class="text-xl font-semibold mt-4 mb-2 text-gray-700">$1</h3>')
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
                      .replace(/^\- (.*$)/gm, '<li class="ml-4 mb-1 text-gray-700">• $1</li>')
                      .replace(/^(?!<[hl]|<li)(.*$)/gm, '<p class="mb-4 text-gray-600 leading-relaxed">$1</p>')
                      .replace(/(<li.*<\/li>)/s, '<ul class="mb-4 space-y-2">$1</ul>')
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
