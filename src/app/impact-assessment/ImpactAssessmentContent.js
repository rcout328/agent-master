"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import { marked } from 'marked';

export default function ImpactAssessmentContent() {
  const [viewMode, setViewMode] = useState('form');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [allReports, setAllReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [parsedReport, setParsedReport] = useState('');
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [generationSteps, setGenerationSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [showAgentDialog, setShowAgentDialog] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('Impact Analysis Agent');

  const [impactInputs, setImpactInputs] = useState({
    company_name: '',
    industry: '',
    impact_areas: [],
    timeframe: '2024',
    market_region: 'global',
    impact_type: 'comprehensive',
    stakeholders: [],
    metrics: []
  });

  // Predefined options
  const impactAreas = [
    "Social Impact",
    "Economic Impact",
    "Environmental Impact",
    "Community Impact",
    "Stakeholder Impact",
    "Innovation Impact",
    "Market Impact"
  ];

  const stakeholders = [
    "Employees",
    "Customers",
    "Suppliers",
    "Community",
    "Investors",
    "Environment",
    "Government"
  ];

  const metrics = [
    "Job Creation",
    "Revenue Growth",
    "Environmental Footprint",
    "Community Investment",
    "Innovation Metrics",
    "Market Share Impact",
    "Stakeholder Satisfaction"
  ];

  const regions = [
    { value: 'global', label: 'Global' },
    { value: 'north_america', label: 'North America' },
    { value: 'europe', label: 'Europe' },
    { value: 'asia_pacific', label: 'Asia Pacific' }
  ];

  const AI_GENERATION_STEPS = [
    {
      message: "AI Agent analyzing impact areas...",
      duration: 2000
    },
    {
      message: "AI Agent evaluating stakeholder impacts...",
      duration: 2000
    },
    {
      message: "AI Agent measuring social impact...",
      duration: 2000
    },
    {
      message: "AI Agent assessing environmental effects...",
      duration: 2000
    },
    {
      message: "AI Agent compiling impact assessment report...",
      duration: 2000
    }
  ];

  const aiAgents = [
    'Impact Analysis Agent',
    'Social Impact Agent',
    'Sustainability Agent',
    'Impact Measurement Agent',
    'ESG Analysis Agent'
  ];

  useEffect(() => {
    fetchAllReports();
  }, []);

  useEffect(() => {
    if (analysisResult?.analysis_report) {
      try {
        // If the report is a file path, fetch the content
        if (analysisResult.analysis_report.endsWith('.md')) {
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'impact_areas' || name === 'stakeholders' || name === 'metrics') {
      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
      setImpactInputs(prev => ({
        ...prev,
        [name]: selectedOptions
      }));
    } else {
      setImpactInputs(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const fetchAllReports = async () => {
    try {
      const response = await fetch('https://varun324242-sj.hf.space/api/reports');
      const data = await response.json();
      setAllReports(data.reports.filter(report => 
        report.report_type.includes('impact_assessment')
      ));
    } catch (err) {
      console.error('Error fetching reports:', err);
    }
  };

  const startAnalysis = async () => {
    if (!impactInputs.company_name) {
      setError('Company name is required');
      return;
    }

    try {
      setAnalysisResult(null);
      setParsedReport('');
      localStorage.removeItem('currentImpactAssessment');
      
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
          report_type: 'impact_assessment',
          inputs: {
            ...impactInputs,
            analysis_type: 'impact'
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate report');
      }

      const data = await response.json();
      setAnalysisResult(data);
      fetchAllReports();
      setViewMode('results');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
      setGenerationSteps([]);
      setCurrentStep(0);
    }
  };

  // Add a helper function to format markdown content
  const formatMarkdownContent = (content) => {
    return content
      // Headers
      .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mt-8 mb-4 text-white">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mt-6 mb-3 text-white">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-xl font-semibold mt-4 mb-2 text-white">$1</h3>')
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
      // Lists
      .replace(/^\- (.*$)/gm, '<li class="ml-4 mb-2 text-white">• $1</li>')
      // Tables
      .replace(/\|(.+)\|/g, '<div class="overflow-x-auto"><table class="min-w-full divide-y divide-purple-800">$1</table></div>')
      .replace(/\|---(.+)---\|/g, '<thead class="bg-purple-900/50"><tr>$1</tr></thead>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline">$1</a>')
      // Paragraphs
      .replace(/^(?!<[hl]|<li|<table)(.*$)/gm, '<p class="mb-4 text-white leading-relaxed">$1</p>')
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
      
      // Add title section with gradient-like effect
      const addTitle = () => {
        // Create gradient-like effect
        for (let i = 0; i < 20; i++) {
          const alpha = 0.1 - (i * 0.005);
          pdf.setFillColor(147, 51, 234, alpha); // Purple color
          pdf.rect(0, i * 0.5, pdf.internal.pageSize.getWidth(), 1, 'F');
        }
        
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(28);
        pdf.setTextColor(147, 51, 234);
        pdf.text('Impact Assessment Report', 20, 28);
        
        // Add decorative line
        pdf.setDrawColor(147, 51, 234);
        pdf.setLineWidth(0.5);
        pdf.line(20, 32, pdf.internal.pageSize.getWidth() - 20, 32);
        
        return 50;
      };

      // Add metadata section
      const addMetadata = (startY) => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.setTextColor(147, 51, 234);
        pdf.text('Assessment Details', 20, startY);
        
        const metadata = [
          { label: 'Company:', value: impactInputs.company_name },
          { label: 'Industry:', value: impactInputs.industry },
          { label: 'Impact Type:', value: impactInputs.impact_type },
          { label: 'Market Region:', value: impactInputs.market_region },
          { label: 'Generated:', value: new Date().toLocaleString() }
        ];

        let y = startY + 8;
        metadata.forEach(item => {
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(255, 255, 255);
          pdf.text(item.label, 20, y);
          pdf.setFont("helvetica", "normal");
          pdf.text(item.value, 60, y);
          y += 7;
        });

        return y + 5;
      };

      // Add impact areas section
      const addImpactAreas = (startY) => {
        // Section header with background
        pdf.setFillColor(147, 51, 234, 0.1);
        pdf.rect(15, startY - 6, pdf.internal.pageSize.getWidth() - 30, 10, 'F');
        
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.setTextColor(147, 51, 234);
        pdf.text('Impact Areas & Stakeholders', 20, startY);

        let y = startY + 8;
        
        // Impact Areas
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(255, 255, 255);
        pdf.text('Impact Areas:', 20, y);
        y += 7;

        pdf.setFont("helvetica", "normal");
        impactInputs.impact_areas.forEach(area => {
          pdf.setDrawColor(147, 51, 234);
          pdf.circle(23, y - 1.5, 1, 'F');
          pdf.text(area, 28, y);
          y += 7;
        });

        y += 5;
        
        // Stakeholders
        if (impactInputs.stakeholders.length > 0) {
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(255, 255, 255);
          pdf.text('Key Stakeholders:', 20, y);
          y += 7;
          
          pdf.setFont("helvetica", "normal");
          impactInputs.stakeholders.forEach(stakeholder => {
            pdf.setDrawColor(147, 51, 234);
            pdf.circle(23, y - 1.5, 1, 'F');
            pdf.text(stakeholder, 28, y);
            y += 7;
          });
        }

        return y + 5;
      };

      // Add main content with markdown formatting
      const addContent = (startY) => {
        const processMarkdownText = (text) => {
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
              pdf.setFillColor(147, 51, 234, 0.1);
              pdf.rect(15, y - 6, pageWidth - 30, 12, 'F');
              
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(20);
              pdf.setTextColor(147, 51, 234);
              const text = processMarkdownText(trimmedLine.replace(/^# /, ''));
              pdf.text(text, 20, y);
              y += lineHeight * 2;

            } else if (trimmedLine.startsWith('## ')) {
              // H2 Headers
              y += 8;
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(16);
              pdf.setTextColor(147, 51, 234);
              const text = processMarkdownText(trimmedLine.replace(/^## /, ''));
              pdf.text(text, 20, y);
              
              // Add subtle underline
              pdf.setDrawColor(147, 51, 234, 0.3);
              pdf.setLineWidth(0.2);
              pdf.line(20, y + 1, 20 + pdf.getTextWidth(text), y + 1);
              
              y += lineHeight * 2;

            } else if (trimmedLine.startsWith('### ')) {
              // H3 Headers
              y += 6;
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(14);
              pdf.setTextColor(147, 51, 234);
              const text = processMarkdownText(trimmedLine.replace(/^### /, ''));
              pdf.text(text, 20, y);
              y += lineHeight * 1.5;

            } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
              // List items
              pdf.setFont("helvetica", "normal");
              pdf.setFontSize(11);
              pdf.setTextColor(255, 255, 255);
              
              const text = processMarkdownText(trimmedLine.replace(/^[-*] /, ''));
              const wrappedText = pdf.splitTextToSize(text, maxWidth - 15);
              
              wrappedText.forEach((textLine, index) => {
                if (y > pdf.internal.pageSize.getHeight() - 20) {
                  pdf.addPage();
                  y = 20;
                }
                
                if (index === 0) {
                  pdf.setDrawColor(147, 51, 234);
                  pdf.circle(23, y - 1.5, 1, 'F');
                }
                
                pdf.text(textLine, 28, y);
                y += lineHeight;
              });
              y += 2;

            } else if (trimmedLine.startsWith('> ')) {
              // Blockquotes
              pdf.setFillColor(147, 51, 234, 0.05);
              const text = processMarkdownText(trimmedLine.replace(/^> /, ''));
              const wrappedText = pdf.splitTextToSize(text, maxWidth - 30);
              
              const blockHeight = wrappedText.length * lineHeight + 6;
              pdf.rect(25, y - 3, maxWidth - 35, blockHeight, 'F');
              
              pdf.setDrawColor(147, 51, 234);
              pdf.setLineWidth(2);
              pdf.line(25, y - 3, 25, y + blockHeight - 3);
              
              pdf.setFont("helvetica", "italic");
              pdf.setFontSize(11);
              pdf.setTextColor(255, 255, 255);
              
              wrappedText.forEach(textLine => {
                if (y > pdf.internal.pageSize.getHeight() - 20) {
                  pdf.addPage();
                  y = 20;
                }
                pdf.text(textLine, 30, y);
                y += lineHeight;
              });
              y += 5;

            } else if (trimmedLine) {
              // Regular paragraphs
              pdf.setFont("helvetica", "normal");
              pdf.setFontSize(11);
              pdf.setTextColor(255, 255, 255);
              
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
              y += 3;
            }
          });
        });
      };

      // Generate PDF content
      let currentY = addTitle();
      currentY = addMetadata(currentY);
      currentY = addImpactAreas(currentY);
      addContent(currentY);

      // Add page numbers and footer
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        
        // Add footer line
        pdf.setDrawColor(147, 51, 234, 0.3);
        pdf.setLineWidth(0.5);
        pdf.line(20, pdf.internal.pageSize.getHeight() - 15, 
                 pdf.internal.pageSize.getWidth() - 20, 
                 pdf.internal.pageSize.getHeight() - 15);
        
        // Add page numbers
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(255, 255, 255);
        pdf.text(
          `Page ${i} of ${pageCount}`,
          pdf.internal.pageSize.getWidth() / 2,
          pdf.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Save with optimized settings
      pdf.save(`${impactInputs.company_name}_impact_assessment_${new Date().toISOString().split('T')[0]}.pdf`, {
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
            Impact Assessment
          </h1>
        </div>

        <div className="mb-10 flex justify-between items-center">
          <div className="bg-[#1D1D1F]/60 backdrop-blur-xl p-1.5 rounded-xl inline-flex shadow-xl">
            <Link 
              href="/market-assessment"
              className="px-8 py-2.5 rounded-lg text-white hover:text-white hover:bg-white/5"
            >
              Market Assessment
            </Link>
            <button className="px-8 py-2.5 rounded-lg transition-all duration-300 bg-purple-600/90 text-white">
              Impact Assessment
            </button>
          </div>

          <button
            onClick={() => {
              setShowAgentDialog(true);
              setTimeout(() => {
                const prompt = `Analyze impact assessment for:
Company: ${impactInputs.company_name}
Industry: ${impactInputs.industry}
Impact Areas: ${impactInputs.impact_areas.join(', ')}
Stakeholders: ${impactInputs.stakeholders.join(', ')}
Market Region: ${impactInputs.market_region}
Impact Type: ${impactInputs.impact_type}
Timeframe: ${impactInputs.timeframe}

Please provide a detailed impact analysis covering:
1. Impact Overview & Scope
2. Stakeholder Analysis
3. Impact Measurement & KPIs
4. Social & Environmental Impact
5. Strategic Recommendations`;

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
                d="M13 10V3L4 14h7v7l9-11h-7z" 
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
          <div className="bg-[#1D1D1F]/80 backdrop-blur-xl rounded-xl shadow-xl p-8 border border-purple-800/50">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-400">Company Name</label>
                <input
                  name="company_name"
                  value={impactInputs.company_name}
                  onChange={handleInputChange}
                  className="w-full p-2.5 bg-[#2D2D2F]/50 text-white rounded-lg border border-purple-700/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10"
                  placeholder="Enter company name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-400">Industry</label>
                <input
                  name="industry"
                  value={impactInputs.industry}
                  onChange={handleInputChange}
                  className="w-full p-2.5 bg-[#2D2D2F]/50 text-white rounded-lg border border-purple-700/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10"
                  placeholder="Enter industry"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium text-purple-400">Impact Areas</label>
                <div className="grid grid-cols-3 gap-2 bg-[#2D2D2F]/50 p-3 rounded-lg border border-purple-700/50">
                  {impactAreas.map(area => (
                    <label 
                      key={area} 
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-purple-600/10 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        name="impact_areas"
                        value={area}
                        checked={impactInputs.impact_areas.includes(area)}
                        onChange={(e) => {
                          const value = e.target.value;
                          setImpactInputs(prev => ({
                            ...prev,
                            impact_areas: e.target.checked 
                              ? [...prev.impact_areas, value]
                              : prev.impact_areas.filter(item => item !== value)
                          }));
                        }}
                        className="w-4 h-4 rounded border-purple-600 text-purple-600 focus:ring-purple-500/20"
                      />
                      <span className="text-sm text-white group-hover:text-white">
                        {area}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium text-purple-400">Stakeholders</label>
                <div className="grid grid-cols-3 gap-2 bg-[#2D2D2F]/50 p-3 rounded-lg border border-purple-700/50">
                  {stakeholders.map(stakeholder => (
                    <label 
                      key={stakeholder} 
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-purple-600/10 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        name="stakeholders"
                        value={stakeholder}
                        checked={impactInputs.stakeholders.includes(stakeholder)}
                        onChange={(e) => {
                          const value = e.target.value;
                          setImpactInputs(prev => ({
                            ...prev,
                            stakeholders: e.target.checked 
                              ? [...prev.stakeholders, value]
                              : prev.stakeholders.filter(item => item !== value)
                          }));
                        }}
                        className="w-4 h-4 rounded border-purple-600 text-purple-600 focus:ring-purple-500/20"
                      />
                      <span className="text-sm text-white group-hover:text-white">
                        {stakeholder}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-400">Market Region</label>
                <select
                  name="market_region"
                  value={impactInputs.market_region}
                  onChange={handleInputChange}
                  className="w-full p-2.5 bg-[#2D2D2F]/50 text-white rounded-lg border border-purple-700/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10"
                >
                  {regions.map(region => (
                    <option key={region.value} value={region.value}>{region.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-400">Timeframe</label>
                <input
                  name="timeframe"
                  value={impactInputs.timeframe}
                  onChange={handleInputChange}
                  className="w-full p-2.5 bg-[#2D2D2F]/50 text-white rounded-lg border border-purple-700/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10"
                  placeholder="Enter timeframe (e.g., 2024)"
                />
              </div>

              <div className="col-span-2">
                <button
                  onClick={startAnalysis}
                  disabled={isAnalyzing}
                  className="w-full px-6 py-2.5 rounded-lg font-medium bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? 'Analyzing Impact...' : 'Generate Impact Assessment'}
                </button>
              </div>
            </div>
          </div>

          {/* Analysis Results Section */}
          <div className="bg-[#1D1D1F]/80 backdrop-blur-xl rounded-xl shadow-xl border border-purple-800/50">
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
                    Impact Assessment Results
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
                        Impact Assessment Report
                      </h1>
                      <div className="grid grid-cols-2 gap-4 text-white">
                        <div>
                          <p><span className="font-semibold text-purple-400">Company:</span> {analysisResult.summary.company}</p>
                          <p><span className="font-semibold text-purple-400">Industry:</span> {analysisResult.summary.industry}</p>
                          <p><span className="font-semibold text-purple-400">Market Region:</span> {impactInputs.market_region.replace('_', ' ').toUpperCase()}</p>
                        </div>
                        <div>
                          <p><span className="font-semibold text-purple-400">Timeframe:</span> {impactInputs.timeframe}</p>
                          <p><span className="font-semibold text-purple-400">Generated:</span> {new Date().toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pb-6">
                      <h2 className="text-xl font-semibold text-purple-400 mb-3">Impact Areas</h2>
                      <div className="flex flex-wrap gap-2">
                        {impactInputs.impact_areas.map((area, index) => (
                          <span 
                            key={index}
                            className="px-3 py-1 bg-purple-900/50 text-white rounded-full text-sm"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pb-6">
                      <h2 className="text-xl font-semibold text-purple-400 mb-3">Key Stakeholders</h2>
                      <div className="flex flex-wrap gap-2">
                        {impactInputs.stakeholders.map((stakeholder, index) => (
                          <span 
                            key={index}
                            className="px-3 py-1 bg-purple-900/50 text-white rounded-full text-sm"
                          >
                            {stakeholder}
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
                        Generated by Impact Assessment Tool • {new Date().toLocaleDateString()}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Connecting to AI Agent</h3>
                <p className="text-sm text-purple-400">Selecting the best agent for your impact analysis...</p>
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