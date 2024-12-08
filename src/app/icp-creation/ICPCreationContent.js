"use client";

import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Link from 'next/link';
import Icp from './Icp';
import FeedbackDisplay from '@/components/FeedbackDisplay';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

const DEFAULT_PLATFORMS = [
  { id: 'google', name: 'Google Reviews', enabled: true },
  { id: 'trustpilot', name: 'Trustpilot Reviews', enabled: false },
  { id: 'amazon', name: 'Amazon Reviews', enabled: false },
  { id: 'product', name: 'Product Reviews', enabled: false },
  { id: 'custom', name: 'Custom Query', enabled: false }
];

export default function ICPCreationContent() {
  const [viewMode, setViewMode] = useState('api'); // 'api' or 'web'
  const [storedSnapshots, setStoredSnapshots] = useState([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [processedData, setProcessedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackData, setFeedbackData] = useState(null);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [showFeedbackSection, setShowFeedbackSection] = useState(false);
  const [searchPlatforms, setSearchPlatforms] = useState(DEFAULT_PLATFORMS);
  const [customQuery, setCustomQuery] = useState('');

  useEffect(() => {
    loadAllSnapshots();
  }, []);

  const loadAllSnapshots = () => {
    const allKeys = Object.keys(localStorage);
    const snapshots = allKeys
      .filter(key => key.includes('snapshot_'))
      .map(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          return {
            id: key.split('snapshot_')[1],
            data: data,
            timestamp: new Date().toISOString()
          };
        } catch (e) {
          console.error(`Error parsing snapshot ${key}:`, e);
          return null;
        }
      })
      .filter(Boolean);

    setStoredSnapshots(snapshots);
  };

  const processSnapshotData = async (snapshotData) => {
    try {
      setIsProcessing(true);
      console.log('Processing snapshot data:', snapshotData.id);
      
      // Extract data array from the snapshot
      let raw_data = [];
      if (snapshotData && snapshotData.data) {
        if (Array.isArray(snapshotData.data)) {
          raw_data = snapshotData.data;
        } else if (snapshotData.data.data && Array.isArray(snapshotData.data.data)) {
          raw_data = snapshotData.data.data;
        } else if (snapshotData.data.results && Array.isArray(snapshotData.data.results)) {
          raw_data = snapshotData.data.results;
        }
      }

      if (!Array.isArray(raw_data) || raw_data.length === 0) {
        throw new Error('No valid data array found in snapshot');
      }

      // Process ICP data
      const processed = {
        demographics: analyzeCompanyDemographics(raw_data),
        industry_segments: analyzeIndustrySegments(raw_data),
        geographic_distribution: analyzeGeographicDistribution(raw_data),
        contact_patterns: analyzeContactPatterns(raw_data),
        company_sizes: analyzeCompanySizes(raw_data)
      };

      console.log('Processed ICP data:', processed);
      setProcessedData(processed);

    } catch (error) {
      console.error('Error processing data:', error);
      alert('Failed to process snapshot data: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper functions for ICP analysis
  const analyzeCompanyDemographics = (data) => {
    const demographics = {
      company_types: {},
      operating_status: {},
      founded_years: []
    };

    data.forEach(company => {
      if (company.company_type) {
        demographics.company_types[company.company_type] = 
          (demographics.company_types[company.company_type] || 0) + 1;
      }
      if (company.operating_status) {
        demographics.operating_status[company.operating_status] = 
          (demographics.operating_status[company.operating_status] || 0) + 1;
      }
      if (company.founded_date) {
        demographics.founded_years.push(parseInt(company.founded_date.slice(0, 4)));
      }
    });

    return demographics;
  };

  const analyzeIndustrySegments = (data) => {
    const industries = {};
    data.forEach(company => {
      (company.industries || []).forEach(industry => {
        if (industry.value) {
          industries[industry.value] = (industries[industry.value] || 0) + 1;
        }
      });
    });
    return Object.entries(industries)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
  };

  const analyzeGeographicDistribution = (data) => {
    const regions = {};
    data.forEach(company => {
      if (company.region) {
        regions[company.region] = (regions[company.region] || 0) + 1;
      }
      (company.location || []).forEach(loc => {
        if (loc.name) {
          regions[loc.name] = (regions[loc.name] || 0) + 1;
        }
      });
    });
    return Object.entries(regions)
      .sort(([, a], [, b]) => b - a);
  };

  const analyzeContactPatterns = (data) => {
    return data.map(company => ({
      name: company.name,
      email: company.contact_email,
      phone: company.contact_phone,
      social_media: company.social_media_links || []
    })).filter(contact => contact.email || contact.phone);
  };

  const analyzeCompanySizes = (data) => {
    const sizes = {};
    data.forEach(company => {
      if (company.num_employees) {
        sizes[company.num_employees] = (sizes[company.num_employees] || 0) + 1;
      }
    });
    return Object.entries(sizes)
      .sort(([a], [b]) => {
        const getNum = (str) => parseInt(str.split('-')[0].replace('+', ''));
        return getNum(a) - getNum(b);
      });
  };

  const generateICPAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      
      const prompt = `
        Analyze this Ideal Customer Profile (ICP) data and provide strategic insights:

        Demographics:
        ${JSON.stringify(processedData.demographics, null, 2)}

        Industry Segments:
        ${processedData.industry_segments.map(([industry, count]) => 
          `${industry}: ${count} companies`
        ).join('\n')}

        Geographic Distribution:
        ${processedData.geographic_distribution.map(([region, count]) => 
          `${region}: ${count} companies`
        ).join('\n')}

        Company Sizes:
        ${processedData.company_sizes.map(([size, count]) => 
          `${size}: ${count} companies`
        ).join('\n')}

        Please provide:
        1. Ideal Customer Profile Definition
        2. Key Market Segments
        3. Geographic Focus Areas
        4. Company Size Sweet Spot
        5. Targeting Recommendations
        6. Engagement Strategy

        Format the analysis in clear sections with bullet points.
      `;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const analysisText = response.text();

      setAnalysis({
        timestamp: new Date().toISOString(),
        snapshotId: selectedSnapshot.id,
        content: analysisText,
        processedData: processedData
      });

    } catch (error) {
      console.error('Error generating analysis:', error);
      if (error.message.includes('GoogleGenerativeAIFetchError')) {
        alert('An internal error occurred while generating analysis. Please try again later.');
      } else {
        alert('Failed to generate ICP analysis: ' + error.message);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const viewSnapshotData = (snapshot) => {
    setSelectedSnapshot(snapshot);
    processSnapshotData(snapshot);
  };

  const renderProcessedDataReview = () => {
    if (!processedData) return null;

    return (
      <div className="bg-black p-6 rounded-xl backdrop-blur-xl border border-purple-500/20 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-purple-400">
            ICP Analysis Results
          </h3>
          <div className="flex space-x-4">
            <button
              onClick={generateICPAnalysis}
              disabled={isAnalyzing}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isAnalyzing 
                  ? 'bg-purple-600/50 cursor-not-allowed' 
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {isAnalyzing ? 'Analyzing...' : 'Generate AI Analysis'}
            </button>
            <button
              onClick={() => setProcessedData(null)}
              className="text-gray-400 hover:text-gray-300"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Demographics */}
          <div className="bg-black p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Company Demographics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-md font-semibold text-purple-300 mb-2">Company Types</h5>
                {Object.entries(processedData.demographics.company_types).map(([type, count], index) => (
                  <div key={index} className="flex justify-between text-gray-300 text-sm">
                    <span>{type}</span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
              <div>
                <h5 className="text-md font-semibold text-purple-300 mb-2">Operating Status</h5>
                {Object.entries(processedData.demographics.operating_status).map(([status, count], index) => (
                  <div key={index} className="flex justify-between text-gray-300 text-sm">
                    <span>{status}</span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Industry Segments */}
          <div className="bg-black p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Industry Segments</h4>
            <div className="grid grid-cols-1 gap-2">
              {processedData.industry_segments.map(([industry, count], index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-gray-300">{industry}</span>
                  <div className="flex items-center space-x-3">
                    <div className="h-2 bg-purple-500/20 rounded-full" style={{
                      width: `${(count / processedData.industry_segments[0][1]) * 100}%`
                    }}></div>
                    <span className="text-gray-400 text-sm">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Geographic Distribution */}
          <div className="bg-black p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Geographic Distribution</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedData.geographic_distribution.map(([region, count], index) => (
                <div key={index} className="p-3 bg-black rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">{region}</span>
                    <span className="text-purple-400 text-sm">{count} companies</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Company Sizes */}
          <div className="bg-black p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Company Size Distribution</h4>
            <div className="space-y-2">
              {processedData.company_sizes.map(([size, count], index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-gray-300">{size}</span>
                  <div className="flex items-center space-x-3">
                    <div className="h-2 bg-purple-500/20 rounded-full" style={{
                      width: `${(count / processedData.company_sizes[0][1]) * 100}%`
                    }}></div>
                    <span className="text-gray-400 text-sm">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Patterns */}
          <div className="bg-black p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Contact Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedData.contact_patterns.slice(0, 6).map((contact, index) => (
                <div key={index} className="p-3 bg-black rounded-lg">
                  <h5 className="font-semibold text-purple-300">{contact.name}</h5>
                  <div className="mt-2 space-y-1 text-sm">
                    {contact.email && <p className="text-gray-300">Email: {contact.email}</p>}
                    {contact.phone && <p className="text-gray-300">Phone: {contact.phone}</p>}
                    {contact.social_media.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {contact.social_media.map((link, i) => (
                          <a 
                            key={i}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300"
                          >
                            {link.includes('linkedin') ? 'LinkedIn' : 
                             link.includes('facebook') ? 'Facebook' : 
                             link.includes('twitter') ? 'Twitter' : 'Social'}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Analysis Results */}
          {analysis && (
            <div className="bg-black p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-purple-400 mb-3">AI Analysis</h4>
              <div className="prose prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-300">
                  {analysis.content}
                </pre>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Generated on: {new Date(analysis.timestamp).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handlePlatformToggle = (platformId) => {
    setSearchPlatforms(platforms => 
      platforms.map(p => 
        p.id === platformId ? { ...p, enabled: !p.enabled } : p
      )
    );
  };

  const handleFeedbackAnalysis = async (company = null) => {
    const queryCompany = company || selectedSnapshot?.data?.name || companyName;
    
    if (!queryCompany) {
      alert('Please select a snapshot or enter a company name');
      return;
    }
    
    setIsLoadingFeedback(true);
    try {
      const enabledPlatforms = searchPlatforms
        .filter(p => p.enabled)
        .map(p => p.id === 'custom' ? customQuery : `${p.name.toLowerCase()}`);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/feedback-validation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: queryCompany,
          platforms: enabledPlatforms
        })
      });

      if (!response.ok) throw new Error('Failed to fetch feedback');
      const data = await response.json();
      setFeedbackData(data);
      
      // Scroll to feedback section
      document.getElementById('feedback-section')?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to fetch feedback: ' + error.message);
    } finally {
      setIsLoadingFeedback(false);
    }
  };

  const handleViewFeedback = () => {
    setShowFeedbackSection(true);
    document.getElementById('feedback-section')?.scrollIntoView({ behavior: 'smooth' });
    if (selectedSnapshot?.data?.name) {
      handleFeedbackAnalysis(selectedSnapshot.data.name);
    }
  };

  const handleCloseFeedback = () => {
    setShowFeedbackSection(false);
    setFeedbackData(null);
    setCompanyName('');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* View Toggle */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between mb-8">
          <div className="bg-[#1D1D1F] p-1 rounded-xl inline-flex">
            <button 
              className="px-4 py-2 rounded-lg bg-purple-600 text-white"
            >
              ICP Creation
            </button>
            <Link
              href="/journey-mapping"
              className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-purple-600/50 transition-all duration-200"
            >
              Journey Mapping
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setViewMode('api')}
              className={`px-6 py-2 rounded-xl font-medium transition-colors ${
                viewMode === 'api'
                  ? 'bg-purple-600 text-white'
                  : 'bg-[#2D2D2F] text-gray-400 hover:text-white'
              }`}
            >
              API View
            </button>
            <button
              onClick={() => setViewMode('web')}
              className={`px-6 py-2 rounded-xl font-medium transition-colors ${
                viewMode === 'web'
                  ? 'bg-purple-600 text-white'
                  : 'bg-[#2D2D2F] text-gray-400 hover:text-white'
              }`}
            >
              Web View
            </button>
          </div>
        </div>

        {/* Add Feedback Link */}
        <div className="mb-4">
          <button
            onClick={handleViewFeedback}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <span className="mr-2">📝</span>
            View Customer Feedback
          </button>
        </div>

        {/* Single Feedback Analysis Section */}
        {showFeedbackSection && (
          <div id="feedback-section" className="mt-8">
            <div className="bg-[#1D1D1F] p-6 rounded-xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-purple-400">
                  Customer Feedback Analysis
                </h2>
                <button
                  onClick={() => {
                    setShowFeedbackSection(false);
                    setFeedbackData(null);
                    setCompanyName('');
                  }}
                  className="text-gray-400 hover:text-gray-300 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Company Input */}
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter company name..."
                    className="flex-1 px-4 py-2 bg-[#2D2D2F] rounded-lg border border-gray-700 focus:border-purple-500 outline-none text-white"
                  />
                </div>

                {/* Platform Selection */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-400">Search Platforms</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {searchPlatforms.map(platform => (
                      <button
                        key={platform.id}
                        onClick={() => handlePlatformToggle(platform.id)}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                          platform.enabled
                            ? 'bg-purple-600 text-white'
                            : 'bg-[#2D2D2F] text-gray-400 hover:text-white'
                        }`}
                      >
                        {platform.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Query Input */}
                {searchPlatforms.find(p => p.id === 'custom')?.enabled && (
                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={customQuery}
                      onChange={(e) => setCustomQuery(e.target.value)}
                      placeholder="Enter custom search query..."
                      className="flex-1 px-4 py-2 bg-[#2D2D2F] rounded-lg border border-gray-700 focus:border-purple-500 outline-none text-white"
                    />
                  </div>
                )}

                {/* Search Button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => handleFeedbackAnalysis()}
                    disabled={isLoadingFeedback || (!selectedSnapshot && !companyName) || !searchPlatforms.some(p => p.enabled)}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      isLoadingFeedback || (!selectedSnapshot && !companyName) || !searchPlatforms.some(p => p.enabled)
                        ? 'bg-purple-600/50 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                  >
                    {isLoadingFeedback ? 'Analyzing...' : 'Analyze Feedback'}
                  </button>
                </div>
              </div>

              {/* Results */}
              {feedbackData && <FeedbackDisplay feedbackData={feedbackData} />}

              {/* Empty State */}
              {!feedbackData && !isLoadingFeedback && (
                <div className="text-center text-gray-400 py-12">
                  {selectedSnapshot 
                    ? `Click "Analyze Feedback" to analyze feedback for ${selectedSnapshot.data.name}`
                    : 'Enter a company name and select platforms to analyze feedback'
                  }
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content based on view mode */}
        {viewMode === 'web' ? (
          <Icp />
        ) : (
          <div className="max-w-7xl mx-auto">
            {/* Only show snapshots when feedback section is hidden */}
            {!showFeedbackSection && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-6">Stored Snapshots</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {storedSnapshots.map((snapshot) => (
                    <div 
                      key={snapshot.id}
                      className="bg-[#1D1D1F]/90 p-6 rounded-xl backdrop-blur-xl border border-purple-500/20 hover:border-purple-500/40 transition-all cursor-pointer"
                      onClick={() => viewSnapshotData(snapshot)}
                    >
                      <div className="flex flex-col space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-200 font-mono text-sm">{snapshot.id}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(snapshot.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        
                        {/* Preview of data */}
                        <div className="mt-2 text-sm text-gray-400">
                          {snapshot.data && typeof snapshot.data === 'object' && (
                            <div className="space-y-1">
                              {Object.keys(snapshot.data).slice(0, 3).map(key => (
                                <div key={key} className="truncate">
                                  {key}: {typeof snapshot.data[key] === 'object' ? '...' : snapshot.data[key]}
                                </div>
                              ))}
                              {Object.keys(snapshot.data).length > 3 && (
                                <div className="text-purple-400">+ more data...</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Selected Snapshot */}
                {selectedSnapshot && (
                  <div className="mt-8 space-y-6">
                    <div className="bg-[#1D1D1F]/90 p-6 rounded-xl backdrop-blur-xl border border-purple-500/20">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-purple-400">
                          Snapshot Details: {selectedSnapshot.id}
                        </h3>
                        <div className="flex space-x-4">
                          <button 
                            onClick={() => processSnapshotData(selectedSnapshot)}
                            disabled={isProcessing}
                            className={`px-4 py-2 rounded-lg transition-colors ${
                              isProcessing 
                                ? 'bg-purple-600/50 cursor-not-allowed' 
                                : 'bg-purple-600 hover:bg-purple-700'
                            }`}
                          >
                            {isProcessing ? 'Processing...' : 'Process Data'}
                          </button>

                          <button 
                            onClick={() => handleFeedbackAnalysis(selectedSnapshot.data.name)}
                            disabled={isLoadingFeedback}
                            className={`px-4 py-2 rounded-lg transition-colors ${
                              isLoadingFeedback
                                ? 'bg-blue-600/50 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                          >
                            {isLoadingFeedback ? 'Analyzing...' : 'Analyze Feedback'}
                          </button>

                          <button 
                            onClick={() => setSelectedSnapshot(null)}
                            className="text-gray-400 hover:text-gray-300"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                      <pre className="bg-black p-4 rounded-lg overflow-auto max-h-96 text-sm text-gray-300">
                        {JSON.stringify(selectedSnapshot.data, null, 2)}
                      </pre>
                    </div>

                    {/* Processed Data Review */}
                    {renderProcessedDataReview()}

                    {/* Feedback Results Section */}
                    {feedbackData && (
                      <div className="mt-6 bg-[#1D1D1F] p-6 rounded-xl">
                        <h3 className="text-xl font-semibold text-purple-400 mb-4">
                          Customer Feedback Analysis
                        </h3>
                        
                        {/* Sentiment Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div className="bg-[#2D2D2F] p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-400 mb-2">Overall Sentiment</h4>
                            <p className="text-2xl font-semibold text-purple-300">
                              {feedbackData.sentiment_score}%
                            </p>
                          </div>
                          
                          <div className="bg-[#2D2D2F] p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-400 mb-2">Total Reviews</h4>
                            <p className="text-2xl font-semibold text-purple-300">
                              {feedbackData.total_reviews}
                            </p>
                          </div>
                          
                          <div className="bg-[#2D2D2F] p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-400 mb-2">Sources</h4>
                            <p className="text-2xl font-semibold text-purple-300">
                              {feedbackData.sources?.length || 0}
                            </p>
                          </div>
                        </div>

                        {/* Key Themes */}
                        <div className="mb-6">
                          <h4 className="text-lg font-medium text-purple-400 mb-3">Key Themes</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {feedbackData.key_themes?.map((theme, index) => (
                              <div key={index} className="bg-[#2D2D2F] p-4 rounded-lg">
                                <h5 className="font-medium text-gray-300">{theme.name}</h5>
                                <p className="text-sm text-gray-400 mt-1">{theme.mentions} mentions</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Recent Reviews */}
                        <div>
                          <h4 className="text-lg font-medium text-purple-400 mb-3">Recent Reviews</h4>
                          <div className="space-y-4">
                            {feedbackData.recent_reviews?.map((review, index) => (
                              <div key={index} className="bg-[#2D2D2F] p-4 rounded-lg">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="text-gray-300">{review.source}</div>
                                  <div className="text-sm text-gray-400">{review.date}</div>
                                </div>
                                <p className="text-gray-300">{review.content}</p>
                                <div className="mt-2 text-sm">
                                  <span className={`px-2 py-1 rounded ${
                                    review.sentiment > 0 ? 'bg-green-500/20 text-green-400' :
                                    review.sentiment < 0 ? 'bg-red-500/20 text-red-400' :
                                    'bg-gray-500/20 text-gray-400'
                                  }`}>
                                    {review.sentiment > 0 ? 'Positive' : 
                                     review.sentiment < 0 ? 'Negative' : 'Neutral'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 