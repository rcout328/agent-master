"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStoredInput } from '@/hooks/useStoredInput';
import StartupChatbot from '@/components/StartupChatbot';
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from 'axios';

// Initialize Gemini
const genAI = new GoogleGenerativeAI("AIzaSyAE2SKBA38bOktQBdXS6mTK5Y1a-nKB3Mo");

// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:5002',
  headers: {
    'Content-Type': 'application/json'
  }
});

export default function Home() {
  const [userInput, setUserInput] = useStoredInput();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [keywords, setKeywords] = useState([]);
  const [editingKeywords, setEditingKeywords] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [snapshotId, setSnapshotId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    
    // Add storage event listener
    const handleStorageChange = () => {
      const storedInput = localStorage.getItem('businessInput');
      if (storedInput) {
        setUserInput(storedInput);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Check for stored input on mount
  useEffect(() => {
    const storedInput = localStorage.getItem('businessInput');
    if (storedInput) {
      setUserInput(storedInput);
    }
  }, []);

  const analyzeWithGemini = async (description) => {
    try {
      setIsSubmitting(true);
      
      // Generate content with Gemini
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const prompt = `
        Task: Convert the user's startup description into a list of relevant keywords.

        Example 1:
        User Input: "An AI-powered e-commerce platform for personalized clothing recommendations."
        Keywords: ["AI", "e-commerce", "personalized clothing", "fashion", "recommendation system", "online shopping"]

        Example 2:
        User Input: "A blockchain-based FinTech company revolutionizing cross-border payments."
        Keywords: ["blockchain", "FinTech", "cross-border payments", "digital currency", "financial technology"]

        Now your task:
        Convert the following startup description into relevant keywords:

        User Input: ${description}
        Keywords:
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse keywords from response
      let keywords;
      try {
        // Try to parse as JSON array first
        keywords = JSON.parse(text.replace(/^Keywords:\s*/, ''));
      } catch {
        // If not JSON, split by commas and clean up
        keywords = text
          .replace(/^Keywords:\s*/, '')
          .replace(/[\[\]"]/g, '')
          .split(',')
          .map(k => k.trim())
          .filter(k => k);
      }

      console.log('Gemini Keywords:', keywords);
      setKeywords(keywords);
      setEditingKeywords(true); // Enable editing mode after getting keywords
      
    } catch (error) {
      console.error('Error analyzing keywords:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeKeyword = (indexToRemove) => {
    setKeywords(keywords.filter((_, index) => index !== indexToRemove));
  };

  const addKeyword = (e) => {
    e.preventDefault();
    if (newKeyword.trim()) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const regenerateKeywords = () => {
    analyzeWithGemini(userInput);
  };

  const processKeywords = async () => {
    try {
      setIsProcessing(true);
      
      const response = await api.post('/api/process-keywords', {
        keywords: keywords
      });

      const { data } = response;
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to process keywords');
      }

      console.log('API Response:', data);
      setSnapshotId(data.snapshot_id);
      setEditingKeywords(false);

      // Save successful result
      localStorage.setItem('lastSnapshotId', data.snapshot_id);
      localStorage.setItem('lastKeywords', JSON.stringify(keywords));

    } catch (error) {
      console.error('Error processing keywords:', error);
      alert(error.response?.data?.detail || error.message || 'Failed to process keywords');
    } finally {
      setIsProcessing(false);
    }
  };

  // Render keyword editing interface
  const renderKeywordEditor = () => {
    if (!editingKeywords) return null;

    return (
      <div className="mt-6 p-4 bg-[#2D2D2F] rounded-xl">
        <h3 className="text-lg font-semibold text-purple-400 mb-3">
          Edit Keywords
        </h3>
        
        {/* Current Keywords */}
        <div className="flex flex-wrap gap-2 mb-4">
          {keywords.map((keyword, index) => (
            <div
              key={index}
              className="flex items-center px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm"
            >
              <span>{keyword}</span>
              <button
                onClick={() => removeKeyword(index)}
                className="ml-2 text-purple-400 hover:text-purple-200"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Add New Keyword Form */}
        <form onSubmit={addKeyword} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="Add new keyword..."
            className="flex-1 px-3 py-1 bg-[#1D1D1F] text-white rounded-lg border border-purple-500/20"
          />
          <button
            type="submit"
            className="px-4 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Add
          </button>
        </form>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={regenerateKeywords}
            className="px-4 py-2 bg-purple-600/50 text-white rounded-lg hover:bg-purple-600"
          >
            Regenerate with AI
          </button>
          <button
            onClick={processKeywords}
            disabled={isProcessing}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-600"
          >
            {isProcessing ? 'Processing...' : 'Confirm Keywords'}
          </button>
        </div>
      </div>
    );
  };

  // Render snapshot ID if available
  const renderSnapshotId = () => {
    if (!snapshotId) return null;

    return (
      <div className="mt-6 p-4 bg-[#2D2D2F] rounded-xl">
        <h3 className="text-lg font-semibold text-purple-400 mb-3">
          Snapshot ID Generated
        </h3>
        <div className="space-y-2">
          <p className="text-gray-300 font-mono break-all">
            {snapshotId}
          </p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(snapshotId);
              alert('Snapshot ID copied to clipboard!');
            }}
            className="text-sm text-purple-400 hover:text-purple-300"
          >
            Copy to Clipboard
          </button>
        </div>
      </div>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || isSubmitting) return;

    try {
      localStorage.setItem('businessInput', userInput);
      await analyzeWithGemini(userInput);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCloseChatbot = () => {
    setShowChatbot(false);
    // Trigger storage event to update input
    window.dispatchEvent(new Event('storage'));
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#131314] text-white px-4 py-6 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="mb-8 sm:mb-12 text-center">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold mb-3 sm:mb-6 bg-gradient-to-r from-purple-400 via-purple-600 to-indigo-600 bg-clip-text text-transparent px-2">
            Market Insight Analysis
          </h1>
          <p className="text-gray-400 text-base sm:text-xl max-w-2xl mx-auto leading-relaxed px-2">
            Unlock powerful market insights with our AI-driven analysis platform
          </p>
        </div>

        {/* Main Content */}
        <div className="flex justify-center items-center">
          {showChatbot ? (
            <div className="w-full max-w-2xl px-2">
              <StartupChatbot 
                onClose={handleCloseChatbot} 
                setUserInput={setUserInput}
              />
            </div>
          ) : (
            /* Input Form with Glass Effect */
            <div className="w-full max-w-2xl mx-2 bg-gradient-to-b from-purple-500/10 to-transparent p-[1px] rounded-2xl backdrop-blur-xl">
              <div className="bg-[#1D1D1F]/90 p-4 sm:p-6 lg:p-8 rounded-2xl backdrop-blur-xl">
                <h2 className="text-lg sm:text-2xl font-semibold mb-4 sm:mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
                  Begin Your Analysis Journey
                </h2>
                <div className="flex flex-col space-y-4">
                  <button
                    onClick={() => setShowChatbot(true)}
                    className="w-full py-3 sm:py-4 px-3 sm:px-6 rounded-xl font-medium transition-all duration-200 
                             bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 
                             hover:to-indigo-700 text-white shadow-lg shadow-purple-500/25 
                             flex items-center justify-center space-x-2 text-sm sm:text-base"
                  >
                    <span>🤖</span>
                    <span>Chat with AI Assistant</span>
                  </button>
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-xl blur"></div>
                    <div className="relative">
                      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-6">
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                            Or describe your business manually
                          </label>
                          <textarea
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Describe your business, products/services, target market, and business model..."
                            className="w-full h-28 sm:h-40 px-3 sm:px-4 py-2 sm:py-3 bg-[#131314] text-gray-200 rounded-xl border border-purple-500/20 
                                     placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none text-sm sm:text-base"
                            disabled={isSubmitting}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isSubmitting || !userInput.trim()}
                          className={`w-full py-3 sm:py-4 px-3 sm:px-6 rounded-xl font-medium transition-all duration-200 text-sm sm:text-base
                                    ${!isSubmitting && userInput.trim()
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/25'
                              : 'bg-gray-600 text-gray-300 cursor-not-allowed'}`}
                        >
                          {isSubmitting ? (
                            <div className="flex items-center justify-center space-x-2">
                              <div className="w-4 sm:w-5 h-4 sm:h-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                              <span>Processing...</span>
                            </div>
                          ) : (
                            'Start Analysis'
                          )}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>

                {/* Keywords Display Section */}
                {keywords && (
                  <div className="mt-6 p-4 bg-[#2D2D2F] rounded-xl">
                    <h3 className="text-lg font-semibold text-purple-400 mb-3">
                      Relevant Keywords
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Tips */}
                <div className="mt-5 sm:mt-8 pt-4 sm:pt-6 border-t border-purple-500/10">
                  <p className="text-xs sm:text-sm text-purple-400 mb-2">Pro Tips:</p>
                  <ul className="text-xs sm:text-sm text-gray-400 space-y-1 sm:space-y-2">
                    <li className="flex items-center space-x-2">
                      <span className="text-purple-500">•</span>
                      <span>Chat with AI for guided analysis</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-purple-500">•</span>
                      <span>Be specific about your target market</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="text-purple-500">•</span>
                      <span>Describe your business model clearly</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Add new sections to the results area */}
      {renderKeywordEditor()}
      {renderSnapshotId()}
    </div>
  );
}