"use client";

import { useState, useEffect } from 'react';
import { useStoredInput } from '@/hooks/useStoredInput';
import { callGroqApi } from '@/utils/groqApi';
import ChatDialog from '@/components/ChatDialog';
import jsPDF from 'jspdf';

export default function ComplianceCheckContent() {
  const [userInput, setUserInput] = useStoredInput();
  const [complianceAnalysis, setComplianceAnalysis] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [lastAnalyzedInput, setLastAnalyzedInput] = useState('');

  useEffect(() => {
    setMounted(true);
    const storedAnalysis = localStorage.getItem(`complianceAnalysis_${userInput}`);
    
    if (storedAnalysis) {
      setComplianceAnalysis(storedAnalysis);
      setLastAnalyzedInput(userInput);
    } else {
      setComplianceAnalysis('');
      if (mounted && userInput && !isLoading) {
        handleSubmit(new Event('submit'));
        setLastAnalyzedInput(userInput);
      }
    }
  }, [userInput, mounted]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const storedAnalysis = localStorage.getItem(`complianceAnalysis_${userInput}`);
    if (storedAnalysis && userInput === lastAnalyzedInput) {
      setComplianceAnalysis(storedAnalysis);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await callGroqApi([
        {
          role: "system",
          content: `You are a compliance analysis expert. Create a detailed compliance analysis that covers all key regulatory and operational requirements. Focus on providing specific, actionable insights about compliance needs and risk management. Format your response without using any markdown formatting like bold (**) or italics (*).`
        },
        {
          role: "user",
          content: `Analyze compliance requirements for this business: ${userInput}. 
          Please provide:
          1. Regulatory Framework
             - Industry regulations
             - Legal requirements
             - Licensing needs
             - Reporting obligations
          2. Data Protection & Privacy
             - Privacy requirements
             - Data handling standards
             - Security protocols
             - User rights management
          3. Operational Compliance
             - Standard operating procedures
             - Quality control measures
             - Documentation requirements
             - Audit protocols
          4. Risk Management
             - Compliance risks
             - Mitigation strategies
             - Monitoring systems
             - Incident response plans
          
          Format the response in a clear, structured manner with specific details for each component. Do not use any markdown formatting like bold (**) or italics (*).`
        }
      ]);

      setComplianceAnalysis(response);
      localStorage.setItem(`complianceAnalysis_${userInput}`, response);
      setLastAnalyzedInput(userInput);
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to get analysis. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDF = async () => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let currentY = margin;

      pdf.setFontSize(20);
      pdf.setTextColor(0, 102, 204);
      pdf.text('Compliance Check Report', pageWidth / 2, currentY, { align: 'center' });
      currentY += 15;

      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      const businessName = userInput.substring(0, 50);
      pdf.text(`Business: ${businessName}${userInput.length > 50 ? '...' : ''}`, margin, currentY);
      currentY += 20;

      pdf.setFontSize(11);
      const analysisLines = pdf.splitTextToSize(complianceAnalysis, pageWidth - (2 * margin));
      for (const line of analysisLines) {
        if (currentY + 10 > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
        }
        pdf.text(line, margin, currentY);
        currentY += 10;
      }

      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        pdf.text('Confidential - Compliance Check Report', pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      pdf.save('compliance_check_report.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF. Please try again.');
    }
  };

  useEffect(() => {
    const storedAnalysis = localStorage.getItem(`complianceAnalysis_${userInput}`);
    if (storedAnalysis) {
      setComplianceAnalysis(storedAnalysis);
    }
  }, [userInput]);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-3 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-6 sm:mb-8 relative">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
            Compliance Check Analysis
          </h1>
          <div className="flex justify-center sm:absolute sm:right-0 sm:top-0 space-x-2 mt-4 sm:mt-0">
            {complianceAnalysis && (
              <button
                onClick={generatePDF}
                className="bg-green-500 hover:bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center space-x-2 text-sm sm:text-base"
              >
                <span>📥</span>
                <span>Export PDF</span>
              </button>
            )}
            <ChatDialog currentPage="complianceCheck" />
          </div>
        </header>

        <div className="mb-6 sm:mb-8">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-2 sm:px-4">
            <div className="mb-3 sm:mb-4">
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Enter your business details for compliance analysis..."
                className="w-full p-3 sm:p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 h-24 sm:h-32 resize-none text-black text-sm sm:text-base"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !userInput.trim()}
              className={`w-full py-3 sm:py-4 px-4 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                !isLoading && userInput.trim()
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Analyzing...' : 'Analyze Compliance'}
            </button>
          </form>
        </div>

        <div className="grid gap-4 sm:gap-6">
          <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 text-gray-700 flex items-center">
              <span className="mr-2">📋</span> Compliance Analysis
            </h2>
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 min-h-[250px] sm:min-h-[300px]">
              {error ? (
                <div className="text-red-500 text-sm sm:text-base">
                  {error}
                  <p className="text-xs sm:text-sm mt-2">Please try refreshing the page or contact support if the problem persists.</p>
                </div>
              ) : isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-gray-900"></div>
                </div>
              ) : complianceAnalysis ? (
                <div className="prose text-black whitespace-pre-wrap text-sm sm:text-base max-w-none">
                  {complianceAnalysis}
                </div>
              ) : (
                <div className="text-gray-500 italic text-sm sm:text-base">
                  Compliance analysis results will appear here...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}