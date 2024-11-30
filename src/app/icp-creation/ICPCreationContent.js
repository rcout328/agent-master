"use client";

import { useState, useEffect, useRef } from 'react';
import { useStoredInput } from '@/hooks/useStoredInput';
import { callGroqApi } from '@/utils/groqApi';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useRouter } from 'next/navigation';

export default function ICPCreationContent() {
  const [userInput, setUserInput] = useStoredInput();
  const [icpAnalysis, setIcpAnalysis] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [lastAnalyzedInput, setLastAnalyzedInput] = useState('');
  const router = useRouter();

  // Add ref for PDF content
  const analysisRef = useRef(null);

  // Load stored analysis on mount and when userInput changes
  useEffect(() => {
    setMounted(true);
    const storedAnalysis = localStorage.getItem(`icpAnalysis_${userInput}`);
    
    if (storedAnalysis) {
      setIcpAnalysis(storedAnalysis);
      setLastAnalyzedInput(userInput);
    } else {
      setIcpAnalysis('');
      // Auto-submit only if input is different from last analyzed
      if (mounted && userInput && !isLoading && userInput !== lastAnalyzedInput) {
        handleSubmit(new Event('submit'));
        setLastAnalyzedInput(userInput);
      }
    }
  }, [userInput, mounted]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    // Check if analysis already exists for this exact input
    const storedAnalysis = localStorage.getItem(`icpAnalysis_${userInput}`);
    if (storedAnalysis && userInput === lastAnalyzedInput) {
      setIcpAnalysis(storedAnalysis);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await callGroqApi([
        {
          role: "system",
          content: `You are an expert at creating Ideal Customer Profiles (ICP). Create a detailed ICP analysis that covers all key aspects of the target customer. Focus on providing specific, actionable insights. Format your response using clear headings and bullet points with dashes (-). Do not use any asterisks or other special characters for emphasis - use clear headings and proper formatting instead.`
        },
        {
          role: "user",
          content: `Create a detailed Ideal Customer Profile (ICP) for this business: ${userInput}. 
          Please analyze and provide:
          1. Demographics
             - Age range
             - Income level
             - Location
             - Education
          2. Psychographics
             - Values and beliefs
             - Lifestyle
             - Interests
             - Behaviors
          3. Professional Characteristics
             - Industry
             - Company size
             - Role/Position
             - Decision-making authority
          4. Pain Points & Needs
             - Key challenges
             - Motivations
             - Goals
             - Purchase triggers
          
          Format the response in a clear, structured manner with specific details and insights. Use headings and bullet points with dashes (-) for organization. Do not use any asterisks or special characters for emphasis.`
        }
      ]);

      setIcpAnalysis(response);
      localStorage.setItem(`icpAnalysis_${userInput}`, response);
      setLastAnalyzedInput(userInput);
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to get analysis. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Add export function
  const exportToPDF = async () => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let currentY = margin;

      // Add title
      pdf.setFontSize(20);
      pdf.setTextColor(0, 102, 204);
      pdf.text('Ideal Customer Profile (ICP) Report', pageWidth / 2, currentY, { align: 'center' });
      currentY += 15;

      // Add business name
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      const businessName = userInput.substring(0, 50);
      pdf.text(`Business: ${businessName}${userInput.length > 50 ? '...' : ''}`, margin, currentY);
      currentY += 20;

      // Add executive summary
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text('1. Executive Summary', margin, currentY);
      pdf.setFont(undefined, 'normal');
      currentY += 10;

      pdf.setFontSize(11);
      const summaryText = "This report provides a comprehensive analysis of your ideal customer profile, including demographics, psychographics, behaviors, and key characteristics.";
      const summaryLines = pdf.splitTextToSize(summaryText, pageWidth - (2 * margin));
      pdf.text(summaryLines, margin, currentY);
      currentY += (summaryLines.length * 7) + 10;

      // Add ICP Analysis
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text('2. Detailed ICP Analysis', margin, currentY);
      pdf.setFont(undefined, 'normal');
      currentY += 10;

      if (icpAnalysis) {
        pdf.setFontSize(10);
        const analysisLines = pdf.splitTextToSize(icpAnalysis, pageWidth - (2 * margin));
        
        for (const line of analysisLines) {
          if (currentY + 10 > pageHeight - margin) {
            pdf.addPage();
            currentY = margin;
          }
          pdf.text(line, margin, currentY);
          currentY += 10;
        }
      }

      // Add footer to all pages
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        pdf.text('Confidential - ICP Analysis Report', pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      // Save the PDF
      pdf.save('icp-analysis-report.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF. Please try again.');
    }
  };

  // Add navigation handlers
  const handleJourneyMapping = () => {
    router.push('/journey-mapping');
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#131314] text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Ideal Customer Profile Creation
            </h1>
            <p className="text-gray-400 mt-2">Define and analyze your ideal customer</p>
          </div>
          <div className="flex items-center space-x-4">
            {icpAnalysis && (
              <button
                onClick={exportToPDF}
                className="bg-[#1D1D1F] hover:bg-[#2D2D2F] text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-all text-sm sm:text-base"
              >
                <span>📥</span>
                <span>Export PDF</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-[#1D1D1F] p-1 rounded-xl mb-6 sm:mb-8 inline-flex w-full sm:w-auto overflow-x-auto">
          <button 
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-purple-600 text-white text-sm sm:text-base whitespace-nowrap"
          >
            ICP Creation
          </button>
          <button 
            onClick={handleJourneyMapping}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-purple-600/50 transition-all duration-200 text-sm sm:text-base whitespace-nowrap"
          >
            Journey Mapping
          </button>
        </div>

        {/* Main Content */}
        <div className="bg-[#1D1D1F] rounded-2xl border border-purple-500/10 p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
            ICP Analysis
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Enter your business details for ICP creation..."
                className="w-full h-32 sm:h-40 px-3 sm:px-4 py-2 sm:py-3 bg-[#131314] text-gray-200 rounded-xl border border-purple-500/20 
                         placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none text-sm sm:text-base"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !userInput.trim()}
              className={`w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-medium transition-all duration-200 text-sm sm:text-base
                        ${!isLoading && userInput.trim()
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/25'
                  : 'bg-gray-600 text-gray-300 cursor-not-allowed'}`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 sm:w-5 h-4 sm:h-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                  <span>Analyzing...</span>
                </div>
              ) : (
                'Create ICP'
              )}
            </button>
          </form>

          {/* Analysis Results */}
          <div ref={analysisRef} className="mt-4 sm:mt-6">
            {error ? (
              <div className="text-red-500 text-sm sm:text-base">
                {error}
                <p className="text-xs sm:text-sm mt-2">Please try refreshing the page or contact support if the problem persists.</p>
              </div>
            ) : isLoading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-gray-900"></div>
              </div>
            ) : icpAnalysis ? (
              <div className="prose text-gray-300 max-w-none text-sm sm:text-base">
                <div className="whitespace-pre-wrap">{icpAnalysis}</div>
              </div>
            ) : (
              <div className="text-gray-500 italic text-sm sm:text-base">
                ICP analysis results will appear here...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 