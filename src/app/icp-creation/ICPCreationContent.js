"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SimpleMarkdown from 'simple-markdown';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { marked } from 'marked';

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
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [savedReports, setSavedReports] = useState([]);
  const [currentReport, setCurrentReport] = useState(null);
  const [generationSteps, setGenerationSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [showAgentDialog, setShowAgentDialog] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('ICP Analysis Agent');

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

  const AI_GENERATION_STEPS = [
    {
      message: "AI Agent analyzing target market data...",
      duration: 2000
    },
    {
      message: "AI Agent identifying ideal customer characteristics...",
      duration: 2000
    },
    {
      message: "AI Agent evaluating market segments...",
      duration: 2000
    },
    {
      message: "AI Agent profiling customer behaviors...",
      duration: 2000
    },
    {
      message: "AI Agent creating ideal customer profile...",
      duration: 2000
    }
  ];

  const aiAgents = [
    'ICP Analysis Agent',
    'Customer Profiling Agent',
    'Market Segmentation Agent',
    'Target Audience Agent',
    'Persona Development Agent'
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
      setAnalysisResult(null);
      setParsedReport('');
      localStorage.removeItem('currentICPReport');
      
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
      setGenerationSteps([]);
      setCurrentStep(0);
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
      const apiReports = data.reports.filter(report => report.report_type.includes('icp'));
      
      // Get localStorage reports
      const localReports = JSON.parse(localStorage.getItem('icpReports') || '[]');
      
      // Merge and deduplicate reports based on id
      const mergedReports = [...localReports, ...apiReports].reduce((acc, current) => {
        const x = acc.find(item => item.id === current.id);
        if (!x) {
          return acc.concat([current]);
        } else {
          return acc;
        }
      }, []);

      setAllReports(mergedReports);
    } catch (err) {
      console.error('Error fetching reports:', err);
      // If API fails, at least show localStorage reports
      loadSavedReports();
    }
  };

  const loadCurrentReport = () => {
    try {
      const current = localStorage.getItem('currentICPReport');
      if (current) {
        const parsedReport = JSON.parse(current);
        setCurrentReport(parsedReport);
        setAnalysisResult(parsedReport.result);
        setUserInputs(parsedReport.inputs);
        
        if (parsedReport.result?.analysis_report) {
          const htmlContent = marked(parsedReport.result.analysis_report, {
            gfm: true,
            breaks: true,
            smartLists: true
          });
          setParsedReport(htmlContent);
        }
      }
    } catch (err) {
      console.error('Error loading current report:', err);
    }
  };

  const viewReport = async (report) => {
    try {
      const savedReports = JSON.parse(localStorage.getItem('icpReports') || '[]');
      const savedReport = savedReports.find(r => r.id === report.id);

      if (savedReport && savedReport.content) {
        setSelectedReport(savedReport);
        const htmlContent = marked(savedReport.content, {
          gfm: true,
          breaks: true,
          smartLists: true
        });
        setReportContent(htmlContent);
        setShowReportModal(true);
        
        // Save as current report
        const currentReport = {
          result: {
            analysis_report: savedReport.content,
            summary: {
              company: savedReport.company_name,
              industry: savedReport.industry
            }
          },
          inputs: savedReport.inputs || userInputs,
          timestamp: savedReport.timestamp
        };
        localStorage.setItem('currentICPReport', JSON.stringify(currentReport));
        setCurrentReport(currentReport);
        setAnalysisResult(currentReport.result);
        setParsedReport(htmlContent);
      } else {
        // Rest of the existing API fetch code...
        const response = await fetch(`https://varun324242-sj.hf.space/api/report-content/${report.filename}`);
        const data = await response.json();
        
        if (data.status === 'success') {
          setSelectedReport(report);
          const htmlContent = marked(data.content, {
            gfm: true,
            breaks: true,
            smartLists: true
          });
          setReportContent(htmlContent);
          setShowReportModal(true);
          
          // Save to localStorage and set as current
          saveReportToLocalStorage(report, data.content);
          const currentReport = {
            result: {
              analysis_report: data.content,
              summary: {
                company: report.company_name,
                industry: report.industry
              }
            },
            inputs: report.inputs || userInputs,
            timestamp: new Date().toISOString()
          };
          localStorage.setItem('currentICPReport', JSON.stringify(currentReport));
          setCurrentReport(currentReport);
          setAnalysisResult(currentReport.result);
          setParsedReport(htmlContent);
        }
      }
    } catch (err) {
      console.error('Error fetching report content:', err);
    }
  };

  useEffect(() => {
    loadSavedReports();
    fetchAllReports();
    loadCurrentReport();
  }, []);

  // Add this function for PDF export
  const exportToPdf = async () => {
    if (!analysisResult) return;
    
    try {
      setIsPdfGenerating(true);
      
      // Create PDF document with better settings
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
        compress: true
      });

      // Set initial variables
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 40;
      const maxWidth = pageWidth - (2 * margin);
      
      // Set fonts and initial styling
      pdf.setFont("helvetica");
      
      // Add header with styling
      pdf.setFontSize(24);
      pdf.setTextColor(88, 28, 135); // Deep purple
      pdf.text('ICP Analysis Report', margin, margin);

      // Add metadata section
      const addMetadata = (startY) => {
        pdf.setFontSize(12);
        pdf.setTextColor(60, 60, 60);
        
        const metadata = [
          `Company: ${analysisResult.summary?.company}`,
          `Industry: ${analysisResult.summary?.industry}`,
          `Business Model: ${userInputs.business_model.toUpperCase()}`,
          `Target Market: ${userInputs.target_market.replace('_', ' ').toUpperCase()}`,
          `Company Size: ${userInputs.company_size.replace('_', ' ').toUpperCase()}`,
          `Revenue Range: ${userInputs.annual_revenue.replace('_', ' ').toUpperCase()}`
        ];

        let y = startY;
        metadata.forEach(text => {
          pdf.text(text, margin, y);
          y += 20;
        });

        return y + 15;
      };

      // Function to process markdown content with better formatting
      const processMarkdownContent = (content, startY) => {
        let y = startY;
        const lines = content.split('\n');
        let inList = false;
        let listIndent = 0;
        
        for (const line of lines) {
          // Check for page break
          if (y > pageHeight - margin) {
            pdf.addPage();
            y = margin;
          }

          // Headers with proper styling
          if (line.startsWith('# ')) {
            pdf.setFontSize(20);
            pdf.setTextColor(88, 28, 135);
            pdf.setFont("helvetica", "bold");
            const text = line.replace('# ', '').trim();
            pdf.text(text, margin, y);
            y += 30;
          }
          else if (line.startsWith('## ')) {
            pdf.setFontSize(16);
            pdf.setTextColor(88, 28, 135);
            pdf.setFont("helvetica", "bold");
            const text = line.replace('## ', '').trim();
            pdf.text(text, margin, y);
            y += 25;
          }
          else if (line.startsWith('### ')) {
            pdf.setFontSize(14);
            pdf.setTextColor(88, 28, 135);
            pdf.setFont("helvetica", "bold");
            const text = line.replace('### ', '').trim();
            pdf.text(text, margin, y);
            y += 20;
          }
          // Lists with proper indentation and bullets
          else if (line.trim().startsWith('- ')) {
            if (!inList) {
              y += 5;
              inList = true;
            }
            pdf.setFontSize(11);
            pdf.setTextColor(60, 60, 60);
            pdf.setFont("helvetica", "normal");
            const text = line.trim().replace('- ', '').trim();
            const wrappedText = pdf.splitTextToSize(text, maxWidth - 20);
            wrappedText.forEach((textLine, index) => {
              if (index === 0) {
                pdf.text('•', margin + listIndent, y);
              }
              pdf.text(textLine, margin + listIndent + 15, y);
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
          // Regular paragraphs with proper spacing
          else if (line.trim()) {
            inList = false;
            pdf.setFontSize(11);
            pdf.setTextColor(60, 60, 60);
            pdf.setFont("helvetica", "normal");
            const wrappedText = pdf.splitTextToSize(line.trim(), maxWidth);
            wrappedText.forEach(textLine => {
              pdf.text(textLine, margin, y);
              y += 15;
            });
            y += 5;
          }
          // Empty lines for better spacing
          else {
            inList = false;
            y += 10;
          }
        }
        return y;
      };

      // Add content sections
      let currentY = margin + 20;
      currentY = addMetadata(currentY);
      
      // Add divider line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 20;

      // Process main content
      currentY = processMarkdownContent(analysisResult.analysis_report, currentY);

      // Add page numbers and footer
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        
        // Add footer with timestamp
        pdf.setFontSize(9);
        pdf.setTextColor(128, 128, 128);
        pdf.setFont("helvetica", "normal");
        const timestamp = new Date().toLocaleString();
        pdf.text(`Generated on ${timestamp}`, margin, pageHeight - 20);
        
        // Add page numbers
        pdf.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - margin,
          pageHeight - 20,
          { align: 'right' }
        );
      }

      // Save with optimized settings
      pdf.save(`ICP_Analysis_${analysisResult.summary?.company.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`, {
        compress: true,
        precision: 2,
        userUnit: 1.0
      });
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF. Please try again.');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const saveReportToLocalStorage = (report, content) => {
    try {
      const savedReport = {
        id: Date.now(),
        ...report,
        content: content,
        timestamp: new Date().toISOString()
      };

      const existingReports = JSON.parse(localStorage.getItem('icpReports') || '[]');
      const updatedReports = [savedReport, ...existingReports].slice(0, 10); // Keep last 10 reports
      localStorage.setItem('icpReports', JSON.stringify(updatedReports));
      setSavedReports(updatedReports);
    } catch (err) {
      console.error('Error saving report to localStorage:', err);
    }
  };

  const loadSavedReports = () => {
    try {
      const reports = JSON.parse(localStorage.getItem('icpReports') || '[]');
      setSavedReports(reports);
    } catch (err) {
      console.error('Error loading saved reports:', err);
    }
  };

  const clearSavedReports = () => {
    localStorage.removeItem('icpReports');
    localStorage.removeItem('currentICPReport');
    setSavedReports([]);
    setCurrentReport(null);
    setAnalysisResult(null);
    setParsedReport('');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            ICP Creation
          </h1>
        </div>

        <div className="mb-10 flex justify-between items-center">
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

          <button
            onClick={() => {
              setShowAgentDialog(true);
              setTimeout(() => {
                const prompt = `Create an Ideal Customer Profile (ICP) analysis for:
Company: ${userInputs.company_name}
Industry: ${userInputs.industry}
Target Market: ${userInputs.target_market}
Business Model: ${userInputs.business_model}
Company Size: ${userInputs.company_size}
Annual Revenue: ${userInputs.annual_revenue}
Pain Points: ${userInputs.pain_points.join(', ')}
Key Requirements: ${userInputs.key_requirements.join(', ')}
Decision Makers: ${userInputs.decision_makers.join(', ')}

Please provide a detailed ICP analysis covering:
1. Customer Profile Overview
2. Key Characteristics & Behaviors
3. Pain Points & Needs Analysis
4. Decision Making Process
5. Value Proposition Alignment`;

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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" 
              />
            </svg>
            <span>Talk to {selectedAgent}</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-xs text-green-400">Online</span>
            </div>
          </button>
        </div>

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
                  {isAnalyzing ? 'Creating ICP...' : 'Generate ICP Analysis'}
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
                    ICP Analysis Results
                  </h2>
                  <button
                    onClick={exportToPdf}
                    disabled={isPdfGenerating}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                  >
                    {isPdfGenerating ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Generating PDF...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.707.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Export PDF</span>
                      </>
                    )}
                  </button>
                </div>

                <div id="report-content" className="bg-black text-white rounded-lg">
                  <div className="p-6 space-y-6">
                    <div className="border-b border-purple-800/50 pb-6">
                      <h1 className="text-3xl font-bold text-purple-400 mb-4">
                        Ideal Customer Profile Analysis
                      </h1>
                      <div className="grid grid-cols-2 gap-4 text-white">
                        <div>
                          <p><span className="font-semibold text-purple-400">Company:</span> {analysisResult.summary.company}</p>
                          <p><span className="font-semibold text-purple-400">Industry:</span> {analysisResult.summary.industry}</p>
                          <p><span className="font-semibold text-purple-400">Business Model:</span> {userInputs.business_model.toUpperCase()}</p>
                        </div>
                        <div>
                          <p><span className="font-semibold text-purple-400">Target Market:</span> {userInputs.target_market.replace('_', ' ').toUpperCase()}</p>
                          <p><span className="font-semibold text-purple-400">Company Size:</span> {userInputs.company_size.replace('_', ' ').toUpperCase()}</p>
                          <p><span className="font-semibold text-purple-400">Generated:</span> {new Date().toLocaleString()}</p>
                        </div>
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
                        Generated by ICP Creation Tool • {new Date().toLocaleDateString()}
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
      </div>

      {showAgentDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center sm:items-center z-50">
          <div className="bg-[#1D1D1F]/95 backdrop-blur-xl rounded-xl p-6 border border-purple-800/50 shadow-2xl w-full max-w-lg m-4 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Connecting to AI Agent</h3>
                <p className="text-sm text-purple-400">Selecting the best agent for your ICP analysis...</p>
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
    </div>
  );
}