"use client";

import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Link from 'next/link';
import MarketTrand from './MarketTrand';
import Mark from './Mark';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

  const [generationSteps, setGenerationSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);

  const focusAreaOptions = [
    "Market Size and Growth",
    "Competitor Analysis", 
    "Customer Demographics",
    "Technology Trends",
    "Financial Analysis",
    "Geographic Expansion",
    "Product Development"
  ];

  const AI_GENERATION_STEPS = [
    {
      message: "AI Agent collecting market data and trends...",
      duration: 2000
    },
    {
      message: "AI Agent analyzing market patterns...",
      duration: 2000
    },
    {
      message: "AI Agent identifying key opportunities...",
      duration: 2000
    },
    {
      message: "AI Agent generating insights...",
      duration: 2000
    },
    {
      message: "AI Agent compiling final report...",
      duration: 2000
    }
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
      setAnalysisResult(null);
      setParsedReport('');
      localStorage.removeItem('currentMarketAnalysis');
      
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

      // Save new report
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
      setGenerationSteps([]);
      setCurrentStep(0);
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

  const exportToPDF = async () => {
    if (!analysisResult) return;

    try {
      const pdf = new jsPDF('p', 'pt', 'a4');
      
      // Set better font and initial settings
      pdf.setFont("helvetica");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 40;
      const maxWidth = pageWidth - (2 * margin);
      
      // Add Header with styling
      pdf.setFontSize(24);
      pdf.setTextColor(88, 28, 135); // Purple color
      pdf.text('Market Trends Analysis', margin, margin);

      // Add company info section
      const addCompanyInfo = (startY) => {
        pdf.setFontSize(12);
        pdf.setTextColor(60, 60, 60);
        
        const metadata = [
          `Company: ${analysisResult.summary.company}`,
          `Industry: ${analysisResult.summary.industry}`,
          `Time Period: ${analysisResult.summary.time_period}`,
          `Generated: ${new Date().toLocaleString()}`
        ];

        let y = startY;
        metadata.forEach(text => {
          pdf.text(text, margin, y);
          y += 20;
        });

        return y + 10;
      };

      // Add focus areas section
      const addFocusAreas = (startY) => {
        pdf.setFontSize(14);
        pdf.setTextColor(88, 28, 135);
        pdf.text('Focus Areas:', margin, startY);

        pdf.setFontSize(11);
        pdf.setTextColor(60, 60, 60);
        let y = startY + 20;
        
        analysisResult.summary.focus_areas.forEach(area => {
          pdf.text(`• ${area}`, margin + 10, y);
          y += 15;
        });

        return y + 15;
      };

      // Function to process markdown content
      const processMarkdownContent = (content, startY) => {
        let y = startY;
        const lines = content.split('\n');
        
        for (const line of lines) {
          // Check for page break
          if (y > pdf.internal.pageSize.getHeight() - margin) {
            pdf.addPage();
            y = margin;
          }

          // Headers
          if (line.startsWith('# ')) {
            pdf.setFontSize(20);
            pdf.setTextColor(88, 28, 135);
            const text = line.replace('# ', '').trim();
            pdf.text(text, margin, y);
            y += 25;
          }
          else if (line.startsWith('## ')) {
            pdf.setFontSize(16);
            pdf.setTextColor(88, 28, 135);
            const text = line.replace('## ', '').trim();
            pdf.text(text, margin, y);
            y += 20;
          }
          else if (line.startsWith('### ')) {
            pdf.setFontSize(14);
            pdf.setTextColor(88, 28, 135);
            const text = line.replace('### ', '').trim();
            pdf.text(text, margin, y);
            y += 20;
          }
          // Lists
          else if (line.trim().startsWith('- ')) {
            pdf.setFontSize(11);
            pdf.setTextColor(60, 60, 60);
            const text = line.trim().replace('- ', '').trim();
            const wrappedText = pdf.splitTextToSize(text, maxWidth - 20);
            wrappedText.forEach((textLine, index) => {
              pdf.text('•', margin, y);
              pdf.text(textLine, margin + 15, y);
              y += 15;
            });
          }
          // Bold text
          else if (line.includes('**')) {
            pdf.setFontSize(11);
            pdf.setTextColor(60, 60, 60);
            const parts = line.split('**');
            let x = margin;
            parts.forEach((part, index) => {
              if (index % 2 === 1) {
                pdf.setFont("helvetica", "bold");
              } else {
                pdf.setFont("helvetica", "normal");
              }
              const wrappedText = pdf.splitTextToSize(part, maxWidth);
              wrappedText.forEach(textLine => {
                pdf.text(textLine, x, y);
                x += pdf.getTextWidth(textLine);
              });
            });
            y += 15;
          }
          // Regular paragraphs
          else if (line.trim()) {
            pdf.setFontSize(11);
            pdf.setTextColor(60, 60, 60);
            pdf.setFont("helvetica", "normal");
            const wrappedText = pdf.splitTextToSize(line.trim(), maxWidth);
            wrappedText.forEach(textLine => {
              pdf.text(textLine, margin, y);
              y += 15;
            });
          }
          // Empty lines for spacing
          else {
            y += 10;
          }
        }
        return y;
      };

      // Add content sections
      let currentY = margin + 20;
      currentY = addCompanyInfo(currentY);
      currentY = addFocusAreas(currentY);
      currentY = processMarkdownContent(analysisResult.analysis_report, currentY + 20);

      // Add page numbers
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setTextColor(128, 128, 128);
        pdf.text(
          `Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pdf.internal.pageSize.getHeight() - 20,
          { align: 'center' }
        );
      }

      // Save with optimized settings
      pdf.save(`${analysisResult.summary.company}_market_trends_${new Date().toISOString().split('T')[0]}.pdf`, {
        compress: true,
        precision: 2,
        userUnit: 1.0
      });

    } catch (error) {
      console.error('Error generating PDF:', error);
    }
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
                  <p className="text-white text-lg">
                    {AI_GENERATION_STEPS[currentStep]?.message || "Processing..."}
                  </p>
                </div>
              </div>
            ) : analysisResult ? (
              <div className="bg-[#1D1D1F]/80 backdrop-blur-xl rounded-xl shadow-xl border border-gray-800/50">
                <div className="p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                      Analysis Results
                    </h2>
                    <button
                      onClick={exportToPDF}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <svg 
                        className="w-5 h-5" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.707.707V19a2 2 0 01-2 2z" 
                        />
                      </svg>
                      Export PDF
                    </button>
                  </div>
                  
                  <div id="report-content" className="bg-black text-white rounded-lg">
                    <div className="p-6 space-y-6">
                      <div className="border-b border-gray-800 pb-6">
                        <h1 className="text-3xl font-bold text-purple-400 mb-4">
                          Market Trends Analysis Report
                        </h1>
                        <div className="grid grid-cols-2 gap-4 text-gray-300">
                          <div>
                            <p><span className="font-semibold">Company:</span> {analysisResult.summary.company}</p>
                            <p><span className="font-semibold">Industry:</span> {analysisResult.summary.industry}</p>
                          </div>
                          <div>
                            <p><span className="font-semibold">Time Period:</span> {analysisResult.summary.time_period}</p>
                            <p><span className="font-semibold">Generated:</span> {new Date().toLocaleString()}</p>
                          </div>
                        </div>
                      </div>

                      <div className="pb-6">
                        <h2 className="text-xl font-semibold text-purple-400 mb-3">Focus Areas</h2>
                        <div className="flex flex-wrap gap-2">
                          {analysisResult.summary.focus_areas.map((area, index) => (
                            <span 
                              key={index}
                              className="px-3 py-1 bg-purple-900/50 text-purple-300 rounded-full text-sm"
                            >
                              {area}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="prose max-w-none">
                        <div 
                          className="
                            text-gray-300
                            leading-relaxed 
                            [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:text-purple-400 [&>h1]:mb-6
                            [&>h2]:text-2xl [&>h2]:font-semibold [&>h2]:text-purple-400 [&>h2]:mt-8 [&>h2]:mb-4
                            [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-purple-400 [&>h3]:mt-6 [&>h3]:mb-3
                            [&>p]:text-gray-300 [&>p]:mb-4 [&>p]:text-base [&>p]:leading-relaxed
                            [&>ul]:mb-6 [&>ul]:list-disc [&>ul]:pl-6 
                            [&>ul>li]:text-gray-300 [&>ul>li]:mb-2
                            [&>ol]:mb-6 [&>ol]:list-decimal [&>ol]:pl-6
                            [&>ol>li]:text-gray-300 [&>ol>li]:mb-2
                            [&>strong]:text-purple-400 [&>strong]:font-semibold
                            [&>em]:text-purple-300 [&>em]:italic
                            [&>blockquote]:border-l-4 [&>blockquote]:border-purple-400 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-gray-300
                          "
                          dangerouslySetInnerHTML={{ __html: parsedReport }} 
                        />
                      </div>

                      <div className="border-t border-gray-800 pt-6 mt-8">
                        <p className="text-sm text-gray-400 text-center">
                          Generated by Market Analysis Tool • {new Date().toLocaleDateString()}
                        </p>
                      </div>
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
      </div>
    </div>
  );
}