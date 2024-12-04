"use client";

import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStoredInput } from '@/hooks/useStoredInput';
import StartupChatbot from '@/components/StartupChatbot';
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from 'axios';
import { FiBook, FiShield, FiCheckCircle, FiFileText, FiCpu, FiLayers } from 'react-icons/fi';

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
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-800/50 backdrop-blur-md bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-2">
              <FiShield className="w-8 h-8 text-purple-500" />
              <span className="font-bold text-xl">ComplianceAI</span>
            </div>
            <div className="flex space-x-4">
              <button className="px-4 py-2 rounded-lg text-slate-300 hover:text-white transition-colors">
                Documentation
              </button>
              <button className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              AI-Powered Compliance Assistant
            </h1>
            <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto mb-8">
              Streamline your legal documentation and project procurement compliance with advanced AI analysis
            </p>
            
            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
              <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-purple-600/20 rounded-lg">
                    <FiBook className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold">Legal Documentation</h3>
                </div>
                <p className="text-slate-400">
                  Ensure compliance with legal requirements and regulations through AI-powered document analysis
                </p>
              </div>
              
              <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-purple-600/20 rounded-lg">
                    <FiLayers className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold">Procurement Compliance</h3>
                </div>
                <p className="text-slate-400">
                  Optimize project procurement documentation with intelligent compliance checking
                </p>
              </div>
            </div>
          </div>

          {/* Main Input Section */}
          <div className="max-w-3xl mx-auto">
            <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl border border-purple-500/20">
              <h2 className="text-2xl font-semibold mb-6 text-center">
                Start Your Compliance Analysis
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Describe your documentation needs
                  </label>
                  <textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Describe your legal documentation or procurement requirements..."
                    className="w-full h-32 px-4 py-3 bg-slate-900/50 text-white rounded-xl border border-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none placeholder-slate-500"
                    disabled={isSubmitting}
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isSubmitting || !userInput.trim()}
                  className={`w-full py-4 rounded-xl font-medium transition-all
                    ${!isSubmitting && userInput.trim()
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/25'
                      : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin" />
                      <span>Analyzing...</span>
                    </div>
                  ) : (
                    'Analyze Documentation'
                  )}
                </button>
              </form>

              {/* Results Sections */}
              {renderKeywordEditor()}
              {renderSnapshotId()}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-slate-900/50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={FiCpu}
              title="AI-Powered Analysis"
              description="Advanced machine learning algorithms analyze your documentation for compliance issues"
            />
            <FeatureCard
              icon={FiCheckCircle}
              title="Compliance Checking"
              description="Automated verification against legal and procurement requirements"
            />
            <FeatureCard
              icon={FiFileText}
              title="Document Processing"
              description="Efficient processing of multiple document types and formats"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Updated Feature Card Component
function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all">
      <div className="flex items-center space-x-4 mb-4">
        <div className="p-3 bg-purple-600/20 rounded-lg">
          <Icon className="w-6 h-6 text-purple-400" />
        </div>
        <h3 className="text-xl font-semibold">{title}</h3>
      </div>
      <p className="text-slate-400">{description}</p>
    </div>
  );
}