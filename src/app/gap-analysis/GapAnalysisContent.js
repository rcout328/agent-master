"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function GapAnalysisContent() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [parsedReport, setParsedReport] = useState('');
  const [savedReports, setSavedReports] = useState([]);
  const [userInputs, setUserInputs] = useState({
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

  useEffect(() => {
    const savedGapReports = localStorage.getItem('gapAnalysisReports');
    if (savedGapReports) {
      setSavedReports(JSON.parse(savedGapReports));
    }

    const currentAnalysis = localStorage.getItem('currentGapAnalysis');
    if (currentAnalysis) {
      const { result, inputs } = JSON.parse(currentAnalysis);
      setAnalysisResult(result);
      setUserInputs(inputs);
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'focus_areas') {
      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
      setUserInputs(prev => ({
        ...prev,
        focus_areas: selectedOptions
      }));
    } else {
      setUserInputs(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const startAnalysis = async () => {
    if (!userInputs.company_name) {
      setError('Company name is required');
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      
      localStorage.removeItem('currentGapAnalysis');

      const response = await fetch('https://varun324242-sj.hf.space/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          report_type: 'gap_analysis',
          inputs: {
            ...userInputs,
            analysis_type: 'gap'
          }
        })
      });

      const data = await response.json();
      
      if (data.status === 'error') {
        throw new Error(data.message);
      }

      // Save new report
      const newReport = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        company_name: userInputs.company_name,
        industry: userInputs.industry,
        result: data
      };

      const updatedReports = [newReport, ...savedReports].slice(0, 10);
      localStorage.setItem('gapAnalysisReports', JSON.stringify(updatedReports));
      setSavedReports(updatedReports);

      // Save current analysis
      localStorage.setItem('currentGapAnalysis', JSON.stringify({
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
    localStorage.removeItem('gapAnalysisReports');
    localStorage.removeItem('currentGapAnalysis');
    setSavedReports([]);
    setAnalysisResult(null);
    setParsedReport('');
    setUserInputs({
      company_name: '',
      industry: '',
      focus_areas: [],
      timeframe: '2024',
      analysis_depth: 'detailed',
      market_region: 'global'
    });
  };

  const loadSavedReport = (report) => {
    localStorage.setItem('currentGapAnalysis', JSON.stringify({
      result: report.result,
      inputs: {
        company_name: report.company_name,
        industry: report.industry,
        focus_areas: report.result.summary.focus_areas || [],
        timeframe: report.result.summary.timeframe || '2024',
        analysis_depth: report.result.summary.analysis_depth || 'detailed',
        market_region: report.result.summary.market_region || 'global'
      },
      timestamp: report.timestamp
    }));

    setAnalysisResult(report.result);
    setUserInputs({
      company_name: report.company_name,
      industry: report.industry,
      focus_areas: report.result.summary.focus_areas || [],
      timeframe: report.result.summary.timeframe || '2024',
      analysis_depth: report.result.summary.analysis_depth || 'detailed',
      market_region: report.result.summary.market_region || 'global'
    });
  };

  useEffect(() => {
    if (analysisResult?.analysis_report) {
      const formattedReport = analysisResult.analysis_report
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/^\- (.*$)/gm, '<li>$1</li>')
        .replace(/^(?!<[hl]|<li)(.*$)/gm, '<p>$1</p>');
      setParsedReport(formattedReport);
    }
  }, [analysisResult]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Gap Analysis
          </h1>
        </div>

        <div className="mb-10 flex justify-center">
          <div className="bg-[#1D1D1F]/60 backdrop-blur-xl p-1.5 rounded-xl inline-flex shadow-xl">
            <Link 
              href="/icp-creation"
              className="px-8 py-2.5 rounded-lg text-white hover:text-white hover:bg-white/5"
            >
              ICP Creation
            </Link>
            <button className="px-8 py-2.5 rounded-lg transition-all duration-300 bg-purple-600/90 text-white">
              Gap Analysis
            </button>
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
                <label className="text-sm font-medium text-purple-400">Focus Areas</label>
                <select
                  name="focus_areas"
                  multiple
                  value={userInputs.focus_areas}
                  onChange={handleInputChange}
                  className="w-full p-2.5 bg-[#2D2D2F]/50 text-white rounded-lg border border-gray-700/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10"
                >
                  {focusAreas.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-400">Market Region</label>
                <select
                  name="market_region"
                  value={userInputs.market_region}
                  onChange={handleInputChange}
                  className="w-full p-2.5 bg-[#2D2D2F]/50 text-white rounded-lg border border-gray-700/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10"
                >
                  {marketRegions.map(region => (
                    <option key={region.value} value={region.value}>{region.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-400">Analysis Depth</label>
                <select
                  name="analysis_depth"
                  value={userInputs.analysis_depth}
                  onChange={handleInputChange}
                  className="w-full p-2.5 bg-[#2D2D2F]/50 text-white rounded-lg border border-gray-700/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10"
                >
                  {analysisDepthOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-400">Timeframe</label>
                <input
                  name="timeframe"
                  value={userInputs.timeframe}
                  onChange={handleInputChange}
                  className="w-full p-2.5 bg-[#2D2D2F]/50 text-white rounded-lg border border-gray-700/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10"
                  placeholder="Enter timeframe (e.g., 2024)"
                />
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={startAnalysis}
                disabled={isAnalyzing}
                className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 disabled:bg-purple-500/50 transition-colors"
              >
                {isAnalyzing ? 'Generating Analysis...' : 'Generate Gap Analysis'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 text-red-400 p-4 rounded-lg">
              {error}
            </div>
          )}

          {analysisResult && (
            <div className="bg-[#1D1D1F]/80 backdrop-blur-xl rounded-xl shadow-xl p-8 border border-gray-800/50">
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
          )}
        </div>
      </div>
    </div>
  );
}
