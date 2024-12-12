"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import { marked } from 'marked';

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
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

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

  const exportToPdf = async () => {
    if (!analysisResult) return;
    
    try {
      setIsPdfGenerating(true);
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
        compress: true,
        precision: 2
      });

      // Set font and initial variables
      pdf.setFont("helvetica");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 40;
      const maxWidth = pageWidth - (2 * margin);
      
      // Title styling with gradient-like effect
      const addTitle = () => {
        // Add subtle gradient background
        const gradientHeight = 80;
        for (let i = 0; i < gradientHeight; i++) {
          const alpha = 0.1 * (1 - i / gradientHeight);
          pdf.setFillColor(128, 90, 213, alpha);
          pdf.rect(0, i, pageWidth, 1, 'F');
        }
        
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(28);
        pdf.setTextColor(88, 28, 135);
        pdf.text('Gap Analysis Report', margin, margin + 20);
        
        // Add decorative line
        pdf.setDrawColor(128, 90, 213);
        pdf.setLineWidth(0.5);
        pdf.line(margin, margin + 30, pageWidth - margin, margin + 30);
        
        return margin + 50;
      };

      // Enhanced metadata section with better organization
      const addMetadata = (startY) => {
        // Add section background
        pdf.setFillColor(245, 245, 250);
        pdf.rect(margin - 10, startY - 10, maxWidth + 20, 100, 'F');
        
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.setTextColor(88, 28, 135);
        pdf.text('Analysis Details', margin, startY + 5);
        
        const leftColumn = [
          { label: 'Company:', value: userInputs.company_name },
          { label: 'Industry:', value: userInputs.industry },
          { label: 'Analysis Depth:', value: userInputs.analysis_depth.replace('_', ' ').toUpperCase() }
        ];
        
        const rightColumn = [
          { label: 'Market Region:', value: userInputs.market_region.replace('_', ' ').toUpperCase() },
          { label: 'Timeframe:', value: userInputs.timeframe },
          { label: 'Generated:', value: new Date().toLocaleString() }
        ];

        let y = startY + 25;
        const columnWidth = maxWidth / 2;
        
        // Draw both columns
        [leftColumn, rightColumn].forEach((column, columnIndex) => {
          let columnY = y;
          column.forEach(item => {
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(11);
            pdf.setTextColor(88, 28, 135);
            pdf.text(item.label, margin + (columnWidth * columnIndex), columnY);
            
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(60, 60, 60);
            pdf.text(item.value, margin + 70 + (columnWidth * columnIndex), columnY);
            columnY += 20;
          });
        });

        return startY + 110;
      };

      // Enhanced focus areas section with better visual hierarchy
      const addFocusAreas = (startY) => {
        // Section header with background
        pdf.setFillColor(245, 245, 250);
        pdf.rect(margin - 10, startY - 10, maxWidth + 20, 30, 'F');
        
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.setTextColor(88, 28, 135);
        pdf.text('Focus Areas', margin, startY + 5);

        let y = startY + 35;
        
        // Create two columns for focus areas
        const itemsPerColumn = Math.ceil(userInputs.focus_areas.length / 2);
        const columnWidth = maxWidth / 2;
        
        userInputs.focus_areas.forEach((area, index) => {
          const columnIndex = Math.floor(index / itemsPerColumn);
          const itemY = y + (index % itemsPerColumn) * 20;
          
          // Add custom bullet points
          pdf.setDrawColor(128, 90, 213);
          pdf.circle(margin + 3 + (columnWidth * columnIndex), itemY - 2, 2, 'F');
          
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(11);
          pdf.setTextColor(60, 60, 60);
          pdf.text(area, margin + 15 + (columnWidth * columnIndex), itemY);
        });

        return y + (Math.ceil(userInputs.focus_areas.length / 2) * 20) + 20;
      };

      // Enhanced content section with better markdown processing
      const processContent = (startY) => {
        let y = startY;
        const lines = analysisResult.analysis_report.split('\n');
        let inList = false;
        let listIndent = 0;
        
        for (const line of lines) {
          // Check for page break
          if (y > pageHeight - margin * 2) {
            pdf.addPage();
            y = margin;
          }

          // Headers with enhanced styling
          if (line.startsWith('# ')) {
            y += 10;
            // Add subtle background for main headers
            pdf.setFillColor(245, 245, 250);
            pdf.rect(margin - 10, y - 15, maxWidth + 20, 35, 'F');
            
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(18);
            pdf.setTextColor(88, 28, 135);
            const text = line.replace('# ', '').trim();
            pdf.text(text, margin, y);
            y += 30;
          }
          else if (line.startsWith('## ')) {
            y += 5;
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(16);
            pdf.setTextColor(88, 28, 135);
            const text = line.replace('## ', '').trim();
            pdf.text(text, margin, y);
            
            // Add subtle underline
            pdf.setDrawColor(88, 28, 135, 0.5);
            pdf.setLineWidth(0.5);
            pdf.line(margin, y + 2, margin + pdf.getTextWidth(text), y + 2);
            
            y += 25;
          }
          else if (line.startsWith('### ')) {
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(14);
            pdf.setTextColor(88, 28, 135);
            const text = line.replace('### ', '').trim();
            pdf.text(text, margin, y);
            y += 20;
          }
          // Lists with better formatting
          else if (line.trim().startsWith('- ')) {
            if (!inList) {
              y += 5;
              inList = true;
            }
            
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(11);
            pdf.setTextColor(60, 60, 60);
            
            const text = line.trim().replace('- ', '').trim();
            const wrappedText = pdf.splitTextToSize(text, maxWidth - 25);
            
            // Custom bullet point
            pdf.setDrawColor(128, 90, 213);
            pdf.circle(margin + 3, y - 2, 2, 'F');
            
            wrappedText.forEach((textLine, index) => {
              pdf.text(textLine, margin + 15, y);
              y += 15;
            });
          }
          // Bold text processing
          else if (line.includes('**')) {
            pdf.setFontSize(11);
            pdf.setTextColor(60, 60, 60);
            const parts = line.split('**');
            let x = margin;
            
            parts.forEach((part, index) => {
              pdf.setFont("helvetica", index % 2 === 1 ? "bold" : "normal");
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
            inList = false;
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(11);
            pdf.setTextColor(60, 60, 60);
            
            const wrappedText = pdf.splitTextToSize(line.trim(), maxWidth);
            wrappedText.forEach(textLine => {
              pdf.text(textLine, margin, y);
              y += 15;
            });
            y += 5;
          }
          // Spacing between sections
          else {
            inList = false;
            y += 10;
          }
        }
        return y;
      };

      // Generate PDF content
      let currentY = addTitle();
      currentY = addMetadata(currentY);
      currentY = addFocusAreas(currentY);
      processContent(currentY);

      // Enhanced footer and page numbers
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        
        // Add gradient footer
        const footerHeight = 30;
        for (let j = 0; j < footerHeight; j++) {
          const alpha = 0.05 * (j / footerHeight);
          pdf.setFillColor(128, 90, 213, alpha);
          pdf.rect(0, pageHeight - footerHeight + j, pageWidth, 1, 'F');
        }
        
        // Add page numbers and timestamp
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(88, 28, 135);
        
        // Left side: timestamp
        const timestamp = new Date().toLocaleString();
        pdf.text(`Generated: ${timestamp}`, margin, pageHeight - 15);
        
        // Right side: page numbers
        pdf.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - margin,
          pageHeight - 15,
          { align: 'right' }
        );
      }

      // Save with optimized settings
      pdf.save(`${userInputs.company_name}_gap_analysis_${new Date().toISOString().split('T')[0]}.pdf`, {
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
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                  Analysis Results
                </h2>
                <button
                  onClick={exportToPdf}
                  disabled={isPdfGenerating}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
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
