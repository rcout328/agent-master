"use client";

import { useState, useEffect, useRef } from 'react';
import { useStoredInput } from '@/hooks/useStoredInput';
import { callGroqApi } from '@/utils/groqApi';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';

export default function FeaturePriorityContent() {
  const [userInput, setUserInput] = useStoredInput();
  const [featureAnalysis, setFeatureAnalysis] = useState('');
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
    const storedAnalysis = localStorage.getItem(`featureAnalysis_${userInput}`);
    
    if (storedAnalysis) {
      setFeatureAnalysis(storedAnalysis);
      setLastAnalyzedInput(userInput);
    } else {
      setFeatureAnalysis('');
      if (mounted && userInput && !isLoading && userInput !== lastAnalyzedInput) {
        handleSubmit(new Event('submit'));
        setLastAnalyzedInput(userInput);
      }
    }
  }, [userInput, mounted]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const storedAnalysis = localStorage.getItem(`featureAnalysis_${userInput}`);
    if (storedAnalysis && userInput === lastAnalyzedInput) {
      setFeatureAnalysis(storedAnalysis);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await callGroqApi([
        {
          role: "system",
          content: `You are a feature prioritization expert. Create a detailed impact assessment for the business: ${userInput}. 
          Please provide:
          Social Impact
          1. Community Benefits
          2. Employment Impact
          3. Social Value Creation
          4. Stakeholder Engagement
          
          Economic Impact
          1. Revenue Generation
          2. Job Creation
          3. Market Influence
          4. Economic Growth
          
          Environmental Impact
          1. Resource Usage
          2. Carbon Footprint
          3. Sustainability Measures
          4. Environmental Initiatives
          
          Long-term Impact
          1. Future Projections
          2. Sustainable Growth
          3. Legacy Potential
          4. Impact Scaling
          
          Format the response in a clear, structured manner with specific details for each component. Do not use any markdown formatting or asterisks.`
        }
      ]);

      setFeatureAnalysis(response);
      localStorage.setItem(`featureAnalysis_${userInput}`, response);
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
      pdf.text('Feature Priority Analysis Report', pageWidth / 2, currentY, { align: 'center' });
      currentY += 15;

      // Add business name
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      const businessName = userInput.substring(0, 50);
      pdf.text(`Business: ${businessName}${userInput.length > 50 ? '...' : ''}`, margin, currentY);
      currentY += 20;

      // Add feature analysis content
      pdf.setFontSize(11);
      const analysisLines = pdf.splitTextToSize(featureAnalysis, pageWidth - (2 * margin));
      for (const line of analysisLines) {
        if (currentY + 10 > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
        }
        pdf.text(line, margin, currentY);
        currentY += 10;
      }

      // Add footer to all pages
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        pdf.text('Confidential - Feature Priority Analysis', pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      pdf.save('feature-priority-analysis.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF. Please try again.');
    }
  };

  // Add navigation handler
  const handleFeedbackCollection = () => {
    router.push('/feedback-collection');
  };

  if (!mounted) return null;
  return (
    <div className="min-h-screen bg-[#131314] text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Feature Priority Analysis
            </h1>
            <p className="text-gray-400 mt-2">Analyze and prioritize product features</p>
          </div>
          <div className="flex items-center space-x-4">
            {featureAnalysis && (
              <button
                onClick={exportToPDF}
                className="bg-[#1D1D1F] hover:bg-[#2D2D2F] text-white px-3 sm:px-4 py-2 rounded-xl flex items-center space-x-2 transition-all text-sm sm:text-base"
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
            Feature Priority
          </button>
          <button 
            onClick={handleFeedbackCollection}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-purple-600/50 transition-all duration-200 text-sm sm:text-base whitespace-nowrap"
          >
            Feedback Collection
          </button>
        </div>

        {/* Main Content */}
        <div className="bg-[#1D1D1F] rounded-xl sm:rounded-2xl border border-purple-500/10 p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
            Feature Analysis
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Enter your business details for feature prioritization..."
                className="w-full h-24 sm:h-32 px-3 sm:px-4 py-2 sm:py-3 bg-[#131314] text-gray-200 rounded-xl border border-purple-500/20 
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
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                  <span>Analyzing...</span>
                </div>
              ) : (
                'Analyze Features'
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
            ) : featureAnalysis ? (
              <div className="prose text-gray-300 max-w-none text-sm sm:text-base">
                <div className="whitespace-pre-wrap">{featureAnalysis}</div>
              </div>
            ) : (
              <div className="text-gray-500 italic text-sm sm:text-base">
                Feature priority analysis results will appear here...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 