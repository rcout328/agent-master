"use client";

import { useState, useRef } from 'react';
import { useStoredInput } from '@/hooks/useStoredInput';
import jsPDF from 'jspdf';
import Link from 'next/link';

export default function FeedbackCollectionContent() {
  const [userInput, setUserInput] = useStoredInput();
  const [feedbackAnalysis, setFeedbackAnalysis] = useState({
    satisfaction_metrics: [],
    product_feedback: [],
    service_feedback: [],
    recommendations: [],
    sources: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(0);
  const analysisRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setCurrentPhase(1);

    try {
      const response = await fetch('http://127.0.0.1:5007/api/feedback-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: userInput }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const data = await response.json();
      console.log('Feedback API Response:', data);
      
      // Update data progressively
      if (data.satisfaction_metrics?.length) {
        setCurrentPhase(2);
        setFeedbackAnalysis(prev => ({ ...prev, satisfaction_metrics: data.satisfaction_metrics }));
      }
      if (data.product_feedback?.length) {
        setCurrentPhase(3);
        setFeedbackAnalysis(prev => ({ ...prev, product_feedback: data.product_feedback }));
      }
      if (data.service_feedback?.length) {
        setCurrentPhase(4);
        setFeedbackAnalysis(prev => ({ ...prev, service_feedback: data.service_feedback }));
      }
      if (data.recommendations?.length) {
        setCurrentPhase(5);
        setFeedbackAnalysis(prev => ({ ...prev, recommendations: data.recommendations }));
      }
      
      localStorage.setItem(`feedbackAnalysis_${userInput}`, JSON.stringify(data));

    } catch (error) {
      console.error('Error:', error);
      setError('Failed to get feedback analysis. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderFeedbackSection = (title, data) => {
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-purple-400 mb-2">{title}</h3>
        <div className="bg-[#2D2D2F] p-4 rounded-xl">
          {data.length > 0 ? (
            <ul className="space-y-2">
              {data.map((item, index) => (
                <li key={index} className="text-gray-300">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">No {title.toLowerCase()} data available.</p>
          )}
        </div>
      </div>
    );
  };

  const renderPhaseStatus = () => {
    const phases = [
      'Starting Analysis',
      'Satisfaction Metrics',
      'Product Feedback',
      'Service Feedback',
      'Recommendations'
    ];

    return (
      <div className="mb-6">
        <div className="flex items-center space-x-2">
          {phases.map((phase, index) => (
            <div key={index} className="flex items-center">
              <div className={`h-2 w-2 rounded-full ${
                currentPhase > index ? 'bg-purple-500' : 'bg-gray-600'
              }`} />
              <span className={`text-sm ml-1 ${
                currentPhase > index ? 'text-purple-400' : 'text-gray-500'
              }`}>
                {phase}
              </span>
              {index < phases.length - 1 && (
                <div className={`h-0.5 w-4 mx-2 ${
                  currentPhase > index ? 'bg-purple-500' : 'bg-gray-600'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#131314] text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Feedback Collection & Analysis
            </h1>
            <p className="text-gray-400 mt-2">Analyze and understand customer feedback</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-[#1D1D1F] p-1 rounded-xl mb-6 sm:mb-8 inline-flex w-full sm:w-auto overflow-x-auto">
          <Link 
            href="/feature-priority"
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-purple-600/50 transition-all duration-200 text-sm sm:text-base whitespace-nowrap"
          >
            Feature Priority
          </Link>
          <button 
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-purple-600 text-white text-sm sm:text-base whitespace-nowrap"
          >
            Feedback Collection
          </button>
        </div>

        {/* Add phase status indicator */}
        {isLoading && renderPhaseStatus()}

        {/* Main Content */}
        <div className="bg-[#1D1D1F] rounded-2xl border border-purple-500/10 p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Enter your business details for feedback analysis..."
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
                'Analyze Feedback'
              )}
            </button>
          </form>

          {/* Analysis Results */}
          <div ref={analysisRef} className="mt-6">
            {error ? (
              <div className="text-red-500">{error}</div>
            ) : (
              <div className="space-y-6">
                {renderFeedbackSection("Satisfaction Metrics", feedbackAnalysis.satisfaction_metrics)}
                {renderFeedbackSection("Product Feedback", feedbackAnalysis.product_feedback)}
                {renderFeedbackSection("Service Feedback", feedbackAnalysis.service_feedback)}
                {renderFeedbackSection("Recommendations", feedbackAnalysis.recommendations)}
                
                {/* Sources */}
                {feedbackAnalysis.sources.length > 0 && (
                  <div className="mt-4 text-sm text-gray-400">
                    <h4 className="font-semibold mb-2">Sources:</h4>
                    <ul className="space-y-1">
                      {feedbackAnalysis.sources.map((source, index) => (
                        <li key={index}>{source.url}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}