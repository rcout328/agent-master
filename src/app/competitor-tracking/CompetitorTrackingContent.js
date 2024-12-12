"use client";

import { useState, useEffect } from 'react';
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

    try {
      setIsAnalyzing(true);
      setError(null);

      const response = await fetch('http://localhost:5001/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          report_type: 'competitor_tracking',
          inputs: {
            company_name: userInputs.company_name,
            industry: userInputs.industry,
            competitors: userInputs.competitors,
            metrics: userInputs.metrics,
            timeframe: userInputs.timeframe,
            analysis_depth: userInputs.analysis_depth,
            market_region: userInputs.market_region,
            analysis_scope: userInputs.analysis_scope
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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

  // Function to fetch all reports
  const fetchAllReports = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/reports');
      const data = await response.json();
      setAllReports(data.reports);
    } catch (err) {
      console.error('Error fetching reports:', err);
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

  // Fetch reports on component mount
  useEffect(() => {
    fetchAllReports();
  }, []);

  const viewReport = async (report) => {
    try {
      const response = await fetch(`http://localhost:5001/api/report-content/${report.filename}`);
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">Competitor Tracking Analysis</h2>
          
          {/* Input Form */}
          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Company Name</label>
              <input
                type="text"
                name="company_name"
                value={userInputs.company_name}
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
                value={userInputs.industry}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="Your industry"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Competitors</label>
              <div className="flex space-x-2 mb-2">
                <input
                  type="text"
                  value={currentCompetitor}
                  onChange={(e) => setCurrentCompetitor(e.target.value)}
                  className="flex-1 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Add competitor"
                />
                <button
                  onClick={handleCompetitorAdd}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {userInputs.competitors.map((competitor, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span>{competitor}</span>
                    <button
                      onClick={() => removeCompetitor(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Tracking Metrics</label>
              <select
                multiple
                name="metrics"
                value={userInputs.metrics}
                onChange={handleMetricsChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                {metricOptions.map(metric => (
                  <option key={metric} value={metric}>{metric}</option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">Hold Ctrl/Cmd to select multiple metrics</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Analysis Depth</label>
              <select
                name="analysis_depth"
                value={userInputs.analysis_depth}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                {analysisDepthOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">Market Region</label>
              <select
                name="market_region"
                value={userInputs.market_region}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                {marketRegions.map(region => (
                  <option key={region.value} value={region.value}>{region.label}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={startAnalysis}
            disabled={isAnalyzing}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
          >
            {isAnalyzing ? 'Analyzing Competitors...' : 'Start Analysis'}
          </button>
        </div>

        {/* Analysis Status */}
        {isAnalyzing && (
          <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
            <div className="flex items-center space-x-3">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <p className="text-gray-700">Analyzing competitors...</p>
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

        {/* Generated Reports Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Generated Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allReports.map((report, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold mb-2 text-gray-800">{report.company_name}</h3>
                <p className="text-gray-600 mb-2">Type: {report.report_type}</p>
                <p className="text-gray-600 mb-4">Generated: {report.timestamp}</p>
                <button
                  onClick={() => viewReport(report)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  View Report
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Results Display */}
        {analysisResult && (
          <div className="bg-white rounded-lg shadow-lg">
            <div className="p-8">
              <h2 className="text-3xl font-bold mb-6 text-gray-800">Analysis Results</h2>
              
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
                        <span className="font-medium text-gray-700">Competitors:</span>{' '}
                        {userInputs.competitors.join(', ')}
                      </p>
                      <p>
                        <span className="font-medium text-gray-700">Metrics:</span>{' '}
                        {userInputs.metrics.join(', ')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Validation Report */}
              <div className="mb-8">
                <button
                  onClick={() => setShowValidation(!showValidation)}
                  className="flex items-center justify-between w-full text-left text-xl font-semibold mb-4 text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <span>Validation Report</span>
                  <svg
                    className={`w-6 h-6 transform transition-transform duration-200 ${
                      showValidation ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showValidation && (
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <pre className="whitespace-pre-wrap text-gray-700 font-mono text-sm">
                      {analysisResult.validation_report}
                    </pre>
                  </div>
                )}
              </div>

              {/* Analysis Report */}
              <div>
                <h3 className="text-xl font-semibold mb-4 text-gray-700">Competitor Analysis Report</h3>
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

        {showReportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">
                    {selectedReport.company_name} - {selectedReport.report_type}
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