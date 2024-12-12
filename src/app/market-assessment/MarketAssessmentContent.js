"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaChartLine, FaHistory, FaImpact, FaArrowRight } from 'react-icons/fa';
import jsPDF from 'jspdf';
import { marked } from 'marked';

export default function MarketAssessmentContent() {
  const [viewMode, setViewMode] = useState('form');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [allReports, setAllReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [parsedReport, setParsedReport] = useState('');
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [savedReports, setSavedReports] = useState([]);

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

  const saveReportToLocalStorage = (report, content) => {
    try {
      const savedReport = {
        id: Date.now(),
        ...report,
        content: content,
        timestamp: new Date().toISOString()
      };

      const existingReports = JSON.parse(localStorage.getItem('marketAssessmentReports') || '[]');
      const updatedReports = [savedReport, ...existingReports].slice(0, 10); // Keep last 10 reports
      localStorage.setItem('marketAssessmentReports', JSON.stringify(updatedReports));
      setSavedReports(updatedReports);
    } catch (err) {
      console.error('Error saving report to localStorage:', err);
    }
  };

  const loadSavedReports = () => {
    try {
      const reports = JSON.parse(localStorage.getItem('marketAssessmentReports') || '[]');
      setSavedReports(reports);
    } catch (err) {
      console.error('Error loading saved reports:', err);
    }
  };

  const clearSavedReports = () => {
    localStorage.removeItem('marketAssessmentReports');
    localStorage.removeItem('currentMarketAssessment');
    setSavedReports([]);
    setAnalysisResult(null);
    setParsedReport('');
  };

  const startAnalysis = async () => {
    if (!marketInputs.company_name) {
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
          report_type: 'market_assessment',
          inputs: {
            ...marketInputs,
            analysis_type: 'market_assessment'
          }
        })
      });

      const data = await response.json();
      
      // Save to localStorage
      const newReport = {
        id: Date.now(),
        company_name: marketInputs.company_name,
        industry: marketInputs.industry,
        market_type: marketInputs.market_type,
        result: data,
        timestamp: new Date().toISOString()
      };

      // Save current analysis
      localStorage.setItem('currentMarketAssessment', JSON.stringify({
        result: data,
        inputs: marketInputs,
        timestamp: new Date().toISOString()
      }));

      saveReportToLocalStorage(newReport, data.analysis_report);
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
      const response = await fetch('https://varun324242-sj.hf.space/api/reports');
      const data = await response.json();
      const apiReports = data.reports.filter(report => 
        report.report_type.includes('market_assessment')
      );
      
      // Get localStorage reports
      const localReports = JSON.parse(localStorage.getItem('marketAssessmentReports') || '[]');
      
      // Merge and deduplicate reports
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
      // If API fails, show localStorage reports
      loadSavedReports();
    }
  };

  useEffect(() => {
    loadSavedReports();
    
    // Load current assessment if exists
    const currentAssessment = localStorage.getItem('currentMarketAssessment');
    if (currentAssessment) {
      const { result, inputs } = JSON.parse(currentAssessment);
      setAnalysisResult(result);
      setMarketInputs(inputs);
    }
    
    fetchAllReports();
  }, []);

  useEffect(() => {
    if (analysisResult?.analysis_report) {
      try {
        // If the report is a file path, fetch the content
        if (typeof analysisResult.analysis_report === 'string' && 
            analysisResult.analysis_report.endsWith('.md')) {
          fetch(`https://varun324242-sj.hf.space/api/report-content/${analysisResult.analysis_report}`)
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

  const exportToPdf = async () => {
    if (!analysisResult) return;
    
    try {
      setIsPdfGenerating(true);
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
        precision: 2
      });

      // Set font
      pdf.setFont("helvetica");
      
      // Add title section
      const addTitle = () => {
        pdf.setFillColor(37, 99, 235, 0.1); // Blue background
        pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 40, 'F');
        
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(28);
        pdf.setTextColor(37, 99, 235); // Blue color
        pdf.text('Market Assessment Report', 20, 28);
        
        // Add decorative line
        pdf.setDrawColor(37, 99, 235);
        pdf.setLineWidth(0.5);
        pdf.line(20, 32, pdf.internal.pageSize.getWidth() - 20, 32);
        
        return 50;
      };

      // Add metadata section
      const addMetadata = (startY) => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.setTextColor(37, 99, 235);
        pdf.text('Assessment Details', 20, startY);
        
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        pdf.setTextColor(60, 60, 60);
        
        const metadata = [
          { label: 'Company:', value: marketInputs.company_name },
          { label: 'Industry:', value: marketInputs.industry },
          { label: 'Assessment Type:', value: marketInputs.market_type },
          { label: 'Market Region:', value: marketInputs.market_region },
          { label: 'Generated:', value: new Date().toLocaleString() }
        ];

        let y = startY + 8;
        metadata.forEach(item => {
          pdf.setFont("helvetica", "bold");
          pdf.text(item.label, 20, y);
          pdf.setFont("helvetica", "normal");
          pdf.text(item.value, 60, y);
          y += 7;
        });

        return y + 5;
      };

      // Add focus areas section
      const addFocusAreas = (startY) => {
        pdf.setFillColor(37, 99, 235, 0.1);
        pdf.rect(15, startY - 6, pdf.internal.pageSize.getWidth() - 30, 10, 'F');
        
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.setTextColor(37, 99, 235);
        pdf.text('Focus Areas & Metrics', 20, startY);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        pdf.setTextColor(60, 60, 60);
        let y = startY + 8;
        
        // Focus Areas
        marketInputs.focus_areas.forEach(area => {
          pdf.setDrawColor(37, 99, 235);
          pdf.circle(23, y - 1.5, 1, 'F');
          pdf.text(area, 28, y);
          y += 7;
        });

        // Add spacing between sections
        y += 5;
        
        // Metrics
        if (marketInputs.metrics.length > 0) {
          pdf.setFont("helvetica", "bold");
          pdf.text('Key Metrics:', 20, y);
          y += 7;
          
          marketInputs.metrics.forEach(metric => {
            pdf.setFont("helvetica", "normal");
            pdf.setDrawColor(37, 99, 235);
            pdf.circle(23, y - 1.5, 1, 'F');
            pdf.text(metric, 28, y);
            y += 7;
          });
        }

        return y + 5;
      };

      // Modify the addContent function to better handle markdown structure
      const addContent = (startY) => {
        const processMarkdownText = (text) => {
          // Handle bold text
          return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/__(.*?)__/g, '$1');
        };

        let y = startY;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const maxWidth = pageWidth - 40;
        const lineHeight = 7;

        // Split content into sections by headers
        const sections = analysisResult.analysis_report.split(/(?=^#+ )/gm);

        sections.forEach(section => {
          if (y > pdf.internal.pageSize.getHeight() - 20) {
            pdf.addPage();
            y = 20;
          }

          const lines = section.split('\n');
          lines.forEach(line => {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('# ')) {
              // H1 Headers
              y += 10;
              pdf.setFillColor(37, 99, 235, 0.1);
              pdf.rect(15, y - 6, pageWidth - 30, 12, 'F');
              
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(20);
              pdf.setTextColor(37, 99, 235);
              const text = processMarkdownText(trimmedLine.replace(/^# /, ''));
              pdf.text(text, 20, y);
              y += lineHeight * 2;

            } else if (trimmedLine.startsWith('## ')) {
              // H2 Headers
              y += 8;
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(16);
              pdf.setTextColor(37, 99, 235);
              const text = processMarkdownText(trimmedLine.replace(/^## /, ''));
              pdf.text(text, 20, y);
              
              // Add subtle underline
              pdf.setDrawColor(37, 99, 235, 0.3);
              pdf.setLineWidth(0.2);
              pdf.line(20, y + 1, 20 + pdf.getTextWidth(text), y + 1);
              
              y += lineHeight * 2;

            } else if (trimmedLine.startsWith('### ')) {
              // H3 Headers
              y += 6;
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(14);
              pdf.setTextColor(37, 99, 235);
              const text = processMarkdownText(trimmedLine.replace(/^### /, ''));
              pdf.text(text, 20, y);
              y += lineHeight * 1.5;

            } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
              // List items
              pdf.setFont("helvetica", "normal");
              pdf.setFontSize(11);
              pdf.setTextColor(60, 60, 60);
              
              const text = processMarkdownText(trimmedLine.replace(/^[-*] /, ''));
              const wrappedText = pdf.splitTextToSize(text, maxWidth - 15);
              
              wrappedText.forEach((textLine, index) => {
                if (y > pdf.internal.pageSize.getHeight() - 20) {
                  pdf.addPage();
                  y = 20;
                }
                
                if (index === 0) {
                  // Custom bullet point
                  pdf.setDrawColor(37, 99, 235);
                  pdf.circle(23, y - 1.5, 1, 'F');
                }
                
                pdf.text(textLine, 28, y);
                y += lineHeight;
              });
              y += 2; // Add extra space after list items

            } else if (trimmedLine.startsWith('> ')) {
              // Blockquotes
              pdf.setFillColor(37, 99, 235, 0.05);
              const text = processMarkdownText(trimmedLine.replace(/^> /, ''));
              const wrappedText = pdf.splitTextToSize(text, maxWidth - 30);
              
              // Background for blockquote
              const blockHeight = wrappedText.length * lineHeight + 6;
              pdf.rect(25, y - 3, maxWidth - 35, blockHeight, 'F');
              
              // Left border for blockquote
              pdf.setDrawColor(37, 99, 235);
              pdf.setLineWidth(2);
              pdf.line(25, y - 3, 25, y + blockHeight - 3);
              
              pdf.setFont("helvetica", "italic");
              pdf.setFontSize(11);
              pdf.setTextColor(70, 70, 70);
              
              wrappedText.forEach(textLine => {
                if (y > pdf.internal.pageSize.getHeight() - 20) {
                  pdf.addPage();
                  y = 20;
                }
                pdf.text(textLine, 30, y);
                y += lineHeight;
              });
              y += 5;

            } else if (trimmedLine.match(/^[0-9]+\. /)) {
              // Numbered lists
              pdf.setFont("helvetica", "normal");
              pdf.setFontSize(11);
              pdf.setTextColor(60, 60, 60);
              
              const number = trimmedLine.match(/^[0-9]+/)[0];
              const text = processMarkdownText(trimmedLine.replace(/^[0-9]+\. /, ''));
              const wrappedText = pdf.splitTextToSize(text, maxWidth - 15);
              
              pdf.text(number + '.', 20, y);
              wrappedText.forEach((textLine, index) => {
                if (y > pdf.internal.pageSize.getHeight() - 20) {
                  pdf.addPage();
                  y = 20;
                }
                pdf.text(textLine, 28, y);
                y += lineHeight;
              });
              y += 2;

            } else if (trimmedLine.startsWith('```')) {
              // Code blocks
              y += 5;
              pdf.setFillColor(245, 245, 245);
              pdf.setFont("courier", "normal");
              pdf.setFontSize(10);
              pdf.setTextColor(80, 80, 80);
              
              // Skip the opening ```
              let codeContent = '';
              let i = 1;
              while (i < lines.length && !lines[i].startsWith('```')) {
                codeContent += lines[i] + '\n';
                i++;
              }
              
              const wrappedCode = pdf.splitTextToSize(codeContent, maxWidth - 10);
              const codeHeight = wrappedCode.length * lineHeight + 10;
              
              // Draw code block background
              pdf.rect(20, y - 5, maxWidth - 20, codeHeight, 'F');
              
              wrappedCode.forEach(codeLine => {
                if (y > pdf.internal.pageSize.getHeight() - 20) {
                  pdf.addPage();
                  y = 20;
                }
                pdf.text(codeLine, 25, y);
                y += lineHeight;
              });
              
              y += 10;
              // Skip the closing ```
              lines.splice(0, i + 1);

            } else if (trimmedLine) {
              // Regular paragraphs
              pdf.setFont("helvetica", "normal");
              pdf.setFontSize(11);
              pdf.setTextColor(60, 60, 60);
              
              const text = processMarkdownText(trimmedLine);
              const wrappedText = pdf.splitTextToSize(text, maxWidth);
              
              wrappedText.forEach(textLine => {
                if (y > pdf.internal.pageSize.getHeight() - 20) {
                  pdf.addPage();
                  y = 20;
                }
                pdf.text(textLine, 20, y);
                y += lineHeight;
              });
              y += 3; // Add space after paragraphs
            }
          });
        });
      };

      // Generate PDF content
      let currentY = addTitle();
      currentY = addMetadata(currentY);
      currentY = addFocusAreas(currentY);
      addContent(currentY);

      // Add page numbers and footer
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        
        // Add footer line
        pdf.setDrawColor(37, 99, 235, 0.3);
        pdf.setLineWidth(0.5);
        pdf.line(20, pdf.internal.pageSize.getHeight() - 15, 
                 pdf.internal.pageSize.getWidth() - 20, 
                 pdf.internal.pageSize.getHeight() - 15);
        
        // Add page numbers
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(128, 128, 128);
        pdf.text(
          `Page ${i} of ${pageCount}`,
          pdf.internal.pageSize.getWidth() / 2,
          pdf.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Save with optimized settings
      pdf.save(`${marketInputs.company_name}_market_assessment_${new Date().toISOString().split('T')[0]}.pdf`, {
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
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-gray-800">Assessment History</h2>
              <button
                onClick={clearSavedReports}
                className="px-4 py-2 text-sm rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-colors"
              >
                Clear Saved Reports
              </button>
            </div>
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
                    <p className="text-sm text-gray-600 mb-2">
                      {report.market_type}
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      Generated: {new Date(report.timestamp).toLocaleString()}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-600 text-sm">View Report</span>
                      <span className="text-sm text-gray-500">
                        {report.id ? 'Saved Locally' : 'From API'}
                      </span>
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
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-gray-800">Assessment Results</h2>
              <button
                onClick={exportToPdf}
                disabled={isPdfGenerating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
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
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.707.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Export PDF</span>
                  </>
                )}
              </button>
            </div>
            
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