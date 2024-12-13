"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SimpleMarkdown from 'simple-markdown';
import jsPDF from 'jspdf';

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
  const [savedReports, setSavedReports] = useState([]);

  const [generationSteps, setGenerationSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);

  const [showAgentDialog, setShowAgentDialog] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('Competitor Analysis Agent');

  const aiAgents = [
    'Competitor Analysis Agent',
    'Market Intelligence Agent',
    'Strategic Competition Agent',
    'Competitive Research Agent',
    'Industry Analysis Agent'
  ];

  const AI_GENERATION_STEPS = [
    {
      message: "AI Agent gathering competitor data...",
      duration: 2000
    },
    {
      message: "AI Agent analyzing competitive landscape...",
      duration: 2000
    },
    {
      message: "AI Agent evaluating market positions...",
      duration: 2000
    },
    {
      message: "AI Agent comparing strategies...",
      duration: 2000
    },
    {
      message: "AI Agent compiling competitor insights...",
      duration: 2000
    }
  ];

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
      setAnalysisResult(null);
      setParsedReport('');
      localStorage.removeItem('currentCompetitorAnalysis');
      
      setIsAnalyzing(true);
      setError(null);
      setGenerationSteps([]);
      setCurrentStep(0);

      // Show AI agent messages
      for (let i = 0; i < AI_GENERATION_STEPS.length; i++) {
        setCurrentStep(i);
        setGenerationSteps(prev => [...prev, AI_GENERATION_STEPS[i]]);
        await new Promise(resolve => setTimeout(resolve, AI_GENERATION_STEPS[i].duration));
      }

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

      // Save to localStorage after successful API response
      const newReport = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        company: userInputs.company_name,
        industry: userInputs.industry,
        competitors: userInputs.competitors,
        result: data
      };

      const existingReports = JSON.parse(localStorage.getItem('competitorTrackingReports') || '[]');
      const updatedReports = [newReport, ...existingReports].slice(0, 10);
      localStorage.setItem('competitorTrackingReports', JSON.stringify(updatedReports));
      setSavedReports(updatedReports);

      localStorage.setItem('currentCompetitorAnalysis', JSON.stringify({
        result: data,
        inputs: userInputs,
        timestamp: new Date().toISOString()
      }));

      setAnalysisResult(data);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
      setGenerationSteps([]);
      setCurrentStep(0);
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

  useEffect(() => {
    const savedReportsFromStorage = localStorage.getItem('competitorTrackingReports');
    if (savedReportsFromStorage) {
      setSavedReports(JSON.parse(savedReportsFromStorage));
    }

    const currentAnalysis = localStorage.getItem('currentCompetitorAnalysis');
    if (currentAnalysis) {
      const parsedAnalysis = JSON.parse(currentAnalysis);
      setAnalysisResult(parsedAnalysis.result);
      setUserInputs(parsedAnalysis.inputs);
    }
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

  const exportToPDF = async () => {
    if (!analysisResult) return;

    try {
      const pdf = new jsPDF('p', 'pt', 'a4');
      
      // Set font for better text rendering
      pdf.setFont("helvetica");
      
      // Add Header with styling
      pdf.setFontSize(24);
      pdf.setTextColor(128, 90, 213);
      pdf.text('Competitor Tracking Analysis', 40, 40);

      // Add company and competitor info
      const addCompanyInfo = () => {
        pdf.setFontSize(12);
        pdf.setTextColor(60, 60, 60);
        
        const metadata = [
          `Company: ${userInputs.company_name}`,
          `Industry: ${userInputs.industry}`,
          `Generated: ${new Date().toLocaleString()}`,
          `Analysis Depth: ${userInputs.analysis_depth}`,
          `Market Region: ${userInputs.market_region}`
        ];

        let y = 80;
        metadata.forEach(text => {
          pdf.text(text, 40, y);
          y += 20;
        });

        return y + 10;
      };

      // Add competitors section
      const addCompetitors = (startY) => {
        pdf.setFontSize(14);
        pdf.setTextColor(128, 90, 213);
        pdf.text('Analyzed Competitors:', 40, startY);

        pdf.setFontSize(11);
        pdf.setTextColor(60, 60, 60);
        let y = startY + 20;
        
        userInputs.competitors.forEach(competitor => {
          pdf.text(`• ${competitor}`, 50, y);
          y += 15;
        });

        return y + 10;
      };

      // Add metrics section
      const addMetrics = (startY) => {
        pdf.setFontSize(14);
        pdf.setTextColor(128, 90, 213);
        pdf.text('Tracking Metrics:', 40, startY);

        pdf.setFontSize(11);
        pdf.setTextColor(60, 60, 60);
        let y = startY + 20;
        
        userInputs.metrics.forEach(metric => {
          pdf.text(`• ${metric}`, 50, y);
          y += 15;
        });

        return y + 10;
      };

      // Add main analysis content with markdown formatting
      const addAnalysisContent = (startY) => {
        let y = startY;
        const maxWidth = pdf.internal.pageSize.getWidth() - 80;

        // Split content into sections based on markdown headers
        const sections = analysisResult.analysis_report.split(/(?=^#+ )/gm);

        sections.forEach(section => {
          // Add new page if needed
          if (y > pdf.internal.pageSize.getHeight() - 60) {
            pdf.addPage();
            y = 40;
          }

          // Handle different header levels
          if (section.startsWith('# ')) {
            pdf.setFontSize(18);
            pdf.setTextColor(128, 90, 213);
            const title = section.split('\n')[0].replace('# ', '');
            pdf.text(title, 40, y);
            y += 25;
          } else if (section.startsWith('## ')) {
            pdf.setFontSize(16);
            pdf.setTextColor(128, 90, 213);
            const title = section.split('\n')[0].replace('## ', '');
            pdf.text(title, 40, y);
            y += 20;
          } else if (section.startsWith('### ')) {
            pdf.setFontSize(14);
            pdf.setTextColor(128, 90, 213);
            const title = section.split('\n')[0].replace('### ', '');
            pdf.text(title, 40, y);
            y += 20;
          }

          // Handle content (paragraphs and lists)
          const content = section.split('\n').slice(1).join('\n');
          pdf.setFontSize(11);
          pdf.setTextColor(60, 60, 60);

          const lines = content.split('\n');
          lines.forEach(line => {
            if (y > pdf.internal.pageSize.getHeight() - 60) {
              pdf.addPage();
              y = 40;
            }

            if (line.trim().startsWith('- ')) {
              // Handle list items
              const bulletText = line.trim().replace('- ', '');
              const textLines = pdf.splitTextToSize(`• ${bulletText}`, maxWidth - 20);
              textLines.forEach(textLine => {
                pdf.text(textLine, 50, y);
                y += 15;
              });
            } else if (line.trim()) {
              // Handle regular paragraphs
              const textLines = pdf.splitTextToSize(line.trim(), maxWidth);
              textLines.forEach(textLine => {
                pdf.text(textLine, 40, y);
                y += 15;
              });
            }
          });

          y += 10; // Add spacing between sections
        });
      };

      // Add all sections
      let currentY = addCompanyInfo();
      currentY = addCompetitors(currentY);
      currentY = addMetrics(currentY);
      addAnalysisContent(currentY);

      // Add page numbers
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setTextColor(128, 128, 128);
        pdf.text(
          `Page ${i} of ${pageCount}`,
          pdf.internal.pageSize.getWidth() / 2,
          pdf.internal.pageSize.getHeight() - 20,
          { align: 'center' }
        );
      }

      // Save with optimized settings
      pdf.save(`${userInputs.company_name}_competitor_analysis_${new Date().toISOString().split('T')[0]}.pdf`, {
        compress: true,
        precision: 3,
        userUnit: 1.0
      });

    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const clearReports = () => {
    localStorage.removeItem('competitorTrackingReports');
    localStorage.removeItem('currentCompetitorAnalysis');
    setSavedReports([]);
    setAnalysisResult(null);
    setParsedReport('');
    setUserInputs({
      company_name: '',
      industry: '',
      competitors: [],
      metrics: [],
      timeframe: '2024',
      analysis_depth: 'detailed',
      market_region: 'global',
      analysis_scope: 4
    });
  };

  const loadSavedReport = (report) => {
    localStorage.setItem('currentCompetitorAnalysis', JSON.stringify({
      result: report.result,
      inputs: {
        company_name: report.company,
        industry: report.industry,
        competitors: report.competitors,
        metrics: report.result.metrics || [],
        timeframe: report.result.timeframe || '2024',
        analysis_depth: report.result.analysis_depth || 'detailed',
        market_region: report.result.market_region || 'global',
        analysis_scope: 4
      },
      timestamp: report.timestamp
    }));

    setAnalysisResult(report.result);
    setUserInputs({
      company_name: report.company,
      industry: report.industry,
      competitors: report.competitors,
      metrics: report.result.metrics || [],
      timeframe: report.result.timeframe || '2024',
      analysis_depth: report.result.analysis_depth || 'detailed',
      market_region: report.result.market_region || 'global',
      analysis_scope: 4
    });
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
        <div className="mb-10 flex justify-between items-center">
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

          <button
            onClick={() => {
              setShowAgentDialog(true);
              setTimeout(() => {
                const prompt = `Analyze competitors for:
Company: ${userInputs.company_name}
Industry: ${userInputs.industry}
Competitors: ${userInputs.competitors.join(', ')}
Metrics: ${userInputs.metrics.join(', ')}
Market Region: ${userInputs.market_region}
Timeframe: ${userInputs.timeframe}

Please provide a detailed competitor analysis covering:
1. Competitive Landscape Overview
2. Competitor Strengths & Weaknesses
3. Market Position Analysis
4. Strategic Recommendations
5. Competitive Advantages`;

                window.location.href = `/chat?prompt=${encodeURIComponent(prompt)}`;
              }, 5000);
            }}
            className="px-6 py-3 rounded-xl font-medium bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-lg transition-all duration-300 transform hover:scale-[1.02] flex items-center gap-2 border border-white/10"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
              />
            </svg>
            <span>Talk to {selectedAgent}</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-xs text-green-400">Online</span>
            </div>
          </button>
        </div>

        {/* Form Section */}
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
                <label className="text-sm font-medium text-purple-400">Tracking Metrics</label>
                <div className="grid grid-cols-3 gap-2 bg-[#2D2D2F]/50 p-3 rounded-lg border border-gray-700/50">
                  {metricOptions.map(metric => (
                    <label 
                      key={metric} 
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-purple-600/10 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        name="metrics"
                        value={metric}
                        checked={userInputs.metrics.includes(metric)}
                        onChange={(e) => {
                          const value = e.target.value;
                          setUserInputs(prev => ({
                            ...prev,
                            metrics: e.target.checked 
                              ? [...prev.metrics, value]
                              : prev.metrics.filter(item => item !== value)
                          }));
                        }}
                        className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500/20"
                      />
                      <span className="text-sm text-white group-hover:text-white">
                        {metric}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium text-purple-400">Competitors</label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={currentCompetitor}
                      onChange={(e) => setCurrentCompetitor(e.target.value)}
                      className="flex-1 p-2.5 bg-[#2D2D2F]/50 text-white rounded-lg border border-gray-700/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10"
                      placeholder="Add competitor name"
                    />
                    <button
                      onClick={handleCompetitorAdd}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  
                  {userInputs.competitors.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {userInputs.competitors.map((competitor, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-2 bg-[#2D2D2F]/70 rounded-lg group"
                        >
                          <span className="text-white">{competitor}</span>
                          <button
                            onClick={() => removeCompetitor(index)}
                            className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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

              <div className="col-span-2">
                <button
                  onClick={startAnalysis}
                  disabled={isAnalyzing}
                  className="w-full px-6 py-2.5 rounded-lg font-medium bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? 'Analyzing Competitors...' : 'Start Analysis'}
                </button>
              </div>
            </div>
          </div>

          {/* Analysis Results Section */}
          <div className="bg-[#1D1D1F]/80 backdrop-blur-xl rounded-xl shadow-xl border border-gray-800/50">
            {isAnalyzing ? (
              <div className="h-60 flex items-center justify-center">
                <div className="flex items-center gap-3">
                  <div className="animate-spin h-6 w-6 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                  <p className="text-white text-lg">
                    {AI_GENERATION_STEPS[currentStep]?.message || "Processing..."}
                  </p>
                </div>
              </div>
            ) : analysisResult ? (
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                    Analysis Results
                  </h2>
                  <button
                    onClick={exportToPDF}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.707.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export PDF
                  </button>
                </div>

                <div id="report-content" className="bg-black text-white rounded-lg">
                  <div className="p-6 space-y-6">
                    <div className="border-b border-purple-800/50 pb-6">
                      <h1 className="text-3xl font-bold text-purple-400 mb-4">
                        Competitor Analysis Report
                      </h1>
                      <div className="grid grid-cols-2 gap-4 text-white">
                        <div>
                          <p><span className="font-semibold text-purple-400">Company:</span> {analysisResult.summary.company}</p>
                          <p><span className="font-semibold text-purple-400">Industry:</span> {analysisResult.summary.industry}</p>
                        </div>
                        <div>
                          <p><span className="font-semibold text-purple-400">Market Region:</span> {userInputs.market_region}</p>
                          <p><span className="font-semibold text-purple-400">Generated:</span> {new Date().toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pb-6">
                      <h2 className="text-xl font-semibold text-purple-400 mb-3">Analyzed Competitors</h2>
                      <div className="flex flex-wrap gap-2">
                        {userInputs.competitors.map((competitor, index) => (
                          <span 
                            key={index}
                            className="px-3 py-1 bg-purple-900/50 text-white rounded-full text-sm"
                          >
                            {competitor}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="prose max-w-none">
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
                          [&>strong]:text-purple-400 [&>strong]:font-semibold
                          [&>em]:text-purple-300 [&>em]:italic
                          [&>blockquote]:border-l-4 [&>blockquote]:border-purple-400 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-white
                        "
                        dangerouslySetInnerHTML={{ __html: parsedReport }} 
                      />
                    </div>

                    <div className="border-t border-purple-800/50 pt-6 mt-8">
                      <p className="text-sm text-white text-center">
                        Generated by Competitor Analysis Tool • {new Date().toLocaleDateString()}
                      </p>
                    </div>
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
                  className="text-white"
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

        {showAgentDialog && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center sm:items-center z-50">
            <div className="bg-[#1D1D1F]/95 backdrop-blur-xl rounded-xl p-6 border border-purple-800/50 shadow-2xl w-full max-w-lg m-4 animate-slide-up">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Connecting to AI Agent</h3>
                  <p className="text-sm text-purple-400">Selecting the best agent for your competitor analysis...</p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {aiAgents.map((agent) => (
                  <div
                    key={agent}
                    className={`p-4 rounded-lg cursor-pointer transition-all duration-300 ${
                      selectedAgent === agent 
                        ? 'bg-purple-600/20 border border-purple-500/50' 
                        : 'hover:bg-purple-600/10'
                    }`}
                    onClick={() => setSelectedAgent(agent)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        selectedAgent === agent ? 'bg-green-400' : 'bg-gray-600'
                      }`} />
                      <span className="text-white font-medium">{agent}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="h-1.5 bg-[#2D2D2F] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 w-0 animate-progress"></div>
              </div>
            </div>
          </div>
        )}

        {savedReports.length > 0 && (
          <div className="mb-8 bg-[#1D1D1F]/60 backdrop-blur-xl rounded-xl p-4 border border-gray-800/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-purple-400">Recent Reports</h3>
              <button
                onClick={clearReports}
                className="px-4 py-1.5 text-sm rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
              >
                Clear All Reports
              </button>
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
                    <p className="text-sm tex-white">
                      Competitors: {report.competitors.join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white">
                      {new Date(report.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}