"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SimpleMarkdown from 'simple-markdown';

export default function ICPCreationContent() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [parsedReport, setParsedReport] = useState('');
  const [showValidation, setShowValidation] = useState(false);
  const [allReports, setAllReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportContent, setReportContent] = useState('');

  const [userInputs, setUserInputs] = useState({
    company_name: '',
    industry: '',
    target_market: 'global',
    business_model: 'b2b',
    company_size: 'medium',
    annual_revenue: '1m_10m',
    pain_points: [],
    key_requirements: [],
    decision_makers: [],
    budget_range: 'medium',
    time_period: '2024'
  });

  // Predefined options
  const targetMarkets = [
    { value: 'global', label: 'Global' },
    { value: 'north_america', label: 'North America' },
    { value: 'europe', label: 'Europe' },
    { value: 'asia_pacific', label: 'Asia Pacific' }
  ];

  const businessModels = [
    { value: 'b2b', label: 'B2B' },
    { value: 'b2c', label: 'B2C' },
    { value: 'b2b2c', label: 'B2B2C' }
  ];

  const companySizes = [
    { value: 'small', label: 'Small (1-50 employees)' },
    { value: 'medium', label: 'Medium (51-500 employees)' },
    { value: 'large', label: 'Large (501+ employees)' }
  ];

  const revenueRanges = [
    { value: 'under_1m', label: 'Under $1M' },
    { value: '1m_10m', label: '$1M - $10M' },
    { value: '10m_50m', label: '$10M - $50M' },
    { value: 'over_50m', label: 'Over $50M' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserInputs(prev => ({
      ...prev,
      [name]: value
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

      const response = await fetch('https://varun324242-sj.hf.space/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          report_type: 'icp_report',
          inputs: {
            ...userInputs,
            analysis_type: 'icp'
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

  // Parse markdown to HTML using simple-markdown
  const parseMarkdown = (markdown) => {
    const rules = SimpleMarkdown.defaultRules;
    const parser = SimpleMarkdown.parserFor(rules);
    const renderer = SimpleMarkdown.reactFor(SimpleMarkdown.ruleOutput(rules, 'html'));
    const ast = parser(markdown);
    return renderer(ast);
  };

  const convertToHtml = (text) => {
    if (!text) return '';
    
    return text
      .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mt-6 mb-4 text-purple-400">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mt-6 mb-3 text-purple-400">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-xl font-semibold mt-4 mb-2 text-purple-400">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-purple-300 font-semibold">$1</strong>')
      .replace(/^\- (.*$)/gm, '<li class="ml-4 mb-1 text-white">• $1</li>')
      .replace(/^(?!<[hl]|<li)(.*$)/gm, '<p class="mb-4 text-white leading-relaxed">$1</p>')
      .replace(/(<li.*<\/li>)/s, '<ul class="mb-4 space-y-2">$1</ul>');
  };

  useEffect(() => {
    if (analysisResult?.analysis_report) {
      const formattedReport = convertToHtml(analysisResult.analysis_report);
      setParsedReport(formattedReport);
    }
  }, [analysisResult]);

  const fetchAllReports = async () => {
    try {
      const response = await fetch('https://varun324242-sj.hf.space/api/reports');
      const data = await response.json();
      setAllReports(data.reports.filter(report => report.report_type.includes('icp')));
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
        setReportContent(parseMarkdown(data.content));
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
    <div className="min-h-screen bg-[#0D0D0F]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-10 flex justify-center">
          <div className="bg-[#1D1D1F]/60 backdrop-blur-xl p-1.5 rounded-xl inline-flex shadow-xl">
            <button className="px-8 py-2.5 rounded-lg transition-all duration-300 bg-purple-600/90 text-white">
              ICP Creation
            </button>
            <Link 
              href="/gap-analysis"
              className="px-8 py-2.5 rounded-lg text-white hover:text-white hover:bg-white/5"
            >
              Gap Analysis
            </Link>
          </div>
        </div>

        {allReports.length > 0 && (
          <div className="mb-8">
            <div className="bg-[#1D1D1F]/80 backdrop-blur-xl rounded-xl shadow-xl p-6 border border-gray-800/50">
              <h3 className="text-xl font-semibold mb-4 text-purple-400">Saved Reports</h3>
              <div className="space-y-2">
                {allReports.map(report => (
                  <div 
                    key={report.id}
                    className="flex justify-between items-center p-3 rounded-lg bg-[#2D2D2F]/50 hover:bg-[#2D2D2F]/70 transition-colors cursor-pointer"
                    onClick={() => viewReport(report)}
                  >
                    <div>
                      <p className="text-white font-medium">{report.company_name}</p>
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

              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-400">Target Market</label>
                <select
                  name="target_market"
                  value={userInputs.target_market}
                  onChange={handleInputChange}
                  className="w-full p-2.5 bg-[#2D2D2F]/50 text-white rounded-lg border border-gray-700/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10"
                >
                  {targetMarkets.map(market => (
                    <option key={market.value} value={market.value}>{market.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-400">Business Model</label>
                <select
                  name="business_model"
                  value={userInputs.business_model}
                  onChange={handleInputChange}
                  className="w-full p-2.5 bg-[#2D2D2F]/50 text-white rounded-lg border border-gray-700/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10"
                >
                  {businessModels.map(model => (
                    <option key={model.value} value={model.value}>{model.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-400">Company Size</label>
                <select
                  name="company_size"
                  value={userInputs.company_size}
                  onChange={handleInputChange}
                  className="w-full p-2.5 bg-[#2D2D2F]/50 text-white rounded-lg border border-gray-700/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10"
                >
                  {companySizes.map(size => (
                    <option key={size.value} value={size.value}>{size.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-400">Annual Revenue</label>
                <select
                  name="annual_revenue"
                  value={userInputs.annual_revenue}
                  onChange={handleInputChange}
                  className="w-full p-2.5 bg-[#2D2D2F]/50 text-white rounded-lg border border-gray-700/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10"
                >
                  {revenueRanges.map(range => (
                    <option key={range.value} value={range.value}>{range.label}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <button
                  onClick={startAnalysis}
                  disabled={isAnalyzing}
                  className="w-full px-6 py-2.5 rounded-lg font-medium bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? 'Generating ICP Analysis...' : 'Generate ICP Analysis'}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {analysisResult && (
            <div className="bg-[#1D1D1F]/80 backdrop-blur-xl rounded-xl shadow-xl border border-gray-800/50">
              <div className="p-8">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-6">
                  ICP Analysis Results
                </h2>
                
                {/* Summary Section */}
                <div className="bg-[#2D2D2F]/70 p-6 rounded-lg border border-gray-700/50 mb-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <p className="text-white">
                        <span className="font-medium text-purple-400">Company:</span>
                        <span className="ml-2">{analysisResult.summary?.company}</span>
                      </p>
                      <p className="text-white">
                        <span className="font-medium text-purple-400">Industry:</span>
                        <span className="ml-2">{analysisResult.summary?.industry}</span>
                      </p>
                      <p className="text-white">
                        <span className="font-medium text-purple-400">Business Model:</span>
                        <span className="ml-2">{userInputs.business_model.toUpperCase()}</span>
                      </p>
                    </div>
                    <div className="space-y-3">
                      <p className="text-white">
                        <span className="font-medium text-purple-400">Target Market:</span>
                        <span className="ml-2">{userInputs.target_market.replace('_', ' ').toUpperCase()}</span>
                      </p>
                      <p className="text-white">
                        <span className="font-medium text-purple-400">Company Size:</span>
                        <span className="ml-2">{userInputs.company_size.replace('_', ' ').toUpperCase()}</span>
                      </p>
                      <p className="text-white">
                        <span className="font-medium text-purple-400">Revenue Range:</span>
                        <span className="ml-2">
                          {userInputs.annual_revenue.replace('_', ' ').toUpperCase()}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Detailed Report Section */}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}