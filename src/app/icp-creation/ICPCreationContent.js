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

        {currentReport && (
          <div className="mb-8">
            <div className="bg-[#1D1D1F]/80 backdrop-blur-xl rounded-xl shadow-xl p-6 border border-gray-800/50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-purple-400">Current Report</h3>
                <p className="text-sm text-gray-400">
                  Generated: {new Date(currentReport.timestamp).toLocaleString()}
                </p>
              </div>
              <div className="bg-[#2D2D2F]/50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-400">Company</p>
                    <p className="text-white font-medium">{currentReport.result.summary.company}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Industry</p>
                    <p className="text-white font-medium">{currentReport.result.summary.industry}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setAnalysisResult(currentReport.result);
                    setUserInputs(currentReport.inputs);
                    setParsedReport(marked(currentReport.result.analysis_report));
                  }}
                  className="w-full px-4 py-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-colors"
                >
                  Load Report
                </button>
              </div>
            </div>
          </div>
        )}

        {allReports.length > 0 && (
          <div className="mb-8">
            <div className="bg-[#1D1D1F]/80 backdrop-blur-xl rounded-xl shadow-xl p-6 border border-gray-800/50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-purple-400">Saved Reports</h3>
                <button
                  onClick={clearSavedReports}
                  className="px-4 py-2 text-sm rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  Clear Saved Reports
                </button>
              </div>
              <div className="space-y-2">
                {allReports.map(report => (
                  <div 
                    key={report.id}
                    className="flex justify-between items-center p-3 rounded-lg bg-[#2D2D2F]/50 hover:bg-[#2D2D2F]/70 transition-colors cursor-pointer"
                    onClick={() => viewReport(report)}
                  >
                    <div>
                      <p className="text-white font-medium">{report.company_name}</p>
                      <p className="text-sm text-gray-400">
                        {report.report_type} - {new Date(report.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-purple-400">
                        {report.id ? 'Saved Locally' : 'From API'}
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
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                    ICP Analysis Results
                  </h2>
                  <button
                    onClick={exportToPdf}
                    disabled={isPdfGenerating}
                    className="px-4 py-2 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 transition-colors flex items-center space-x-2"
                  >
                    {isPdfGenerating ? (
                      <>
                        <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Generating PDF...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Export PDF</span>
                      </>
                    )}
                  </button>
                </div>
                
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

      {showReportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#1D1D1F] rounded-xl w-full max-w-4xl max-h-[90vh] relative">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center sticky top-0 bg-[#1D1D1F] z-10">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {selectedReport.company_name} - {selectedReport.report_type}
                </h3>
                <p className="text-sm text-gray-400">
                  Generated: {new Date(selectedReport.timestamp).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              <div 
                className="prose prose-invert max-w-none
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
                  [&>code]:bg-gray-800 [&>code]:text-purple-300 [&>code]:px-2 [&>code]:py-1 [&>code]:rounded
                  [&>pre]:bg-gray-800 [&>pre]:p-4 [&>pre]:rounded-lg [&>pre]:overflow-x-auto
                  [&>table]:w-full [&>table]:border-collapse
                  [&>table>thead>tr>th]:text-purple-400 [&>table>thead>tr>th]:border-b [&>table>thead>tr>th]:border-gray-700 [&>table>thead>tr>th]:p-2
                  [&>table>tbody>tr>td]:border-b [&>table>tbody>tr>td]:border-gray-700 [&>table>tbody>tr>td]:p-2"
                dangerouslySetInnerHTML={{ __html: reportContent }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}