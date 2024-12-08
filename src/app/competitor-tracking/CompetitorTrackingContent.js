"use client";

import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Link from 'next/link';
import Competitor from './Competitor';
import Comp from './Comp';
import ErrorBoundary from '@/components/ErrorBoundary';

// Initialize Gemini
const genAI = new GoogleGenerativeAI("AIzaSyAE2SKBA38bOktQBdXS6mTK5Y1a-nKB3Mo");

// Add API base URL constant at the top
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001';

export default function CompetitorTrackingContent() {
  const [viewMode, setViewMode] = useState('api'); // 'api' or 'web'
  const [storedSnapshots, setStoredSnapshots] = useState([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [processedData, setProcessedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showComp, setShowComp] = useState(false);
  const [showSentimentAnalysis, setShowSentimentAnalysis] = useState(false);
  const [sentimentData, setSentimentData] = useState(null);
  const [isAnalyzingSentiment, setIsAnalyzingSentiment] = useState(false);
  const [competitorInput, setCompetitorInput] = useState('');
  const [apiStatus, setApiStatus] = useState('unknown');
  const [competitors, setCompetitors] = useState([]);
  const [selectedCompetitor, setSelectedCompetitor] = useState(null);
  const [isSearchingCompetitors, setIsSearchingCompetitors] = useState(false);
  const [showPerformanceTracking, setShowPerformanceTracking] = useState(false);
  const [performanceData, setPerformanceData] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Add loading state

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true); // Set loading state to true before fetching
        loadAllSnapshots();
      } catch (error) {
        console.error("Error fetching data:", error);
        // Handle error appropriately (e.g., display an error message)
      } finally {
        setIsLoading(false); // Set loading state to false after fetching (success or failure)
      }
    };

    fetchData();
  }, []); // Empty dependency array ensures this runs only once on mount

  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5001/api/health', {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          },
          mode: 'cors'
        });

        if (response.ok) {
          const data = await response.json();
          console.log('API Status:', data);
          setApiStatus('connected');
        } else {
          console.error('API Error:', response.status);
          setApiStatus('error');
        }
      } catch (error) {
        console.error('API Connection Error:', error);
        setApiStatus('error');
      }
    };

    checkApiStatus();
    const interval = setInterval(checkApiStatus, 10000);
    return () => clearInterval(interval);
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

      // Process competitor data
      const processed = {
        target_company: raw_data[0], // Assuming first company is target
        competitors: raw_data.slice(1, 6), // Take next 5 companies as competitors
        metrics: {
          market_presence: calculateMarketPresence(raw_data),
          technology_stack: analyzeTechnologyStack(raw_data),
          funding_comparison: compareFunding(raw_data),
          growth_metrics: calculateGrowthMetrics(raw_data)
        }
      };

      console.log('Processed competitor data:', processed);
      setProcessedData(processed);

    } catch (error) {
      console.error('Error processing data:', error);
      alert('Failed to process snapshot data: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper functions for competitor analysis
  const calculateMarketPresence = (data) => {
    return data.map(company => ({
      name: company.name,
      monthly_visits: company.monthly_visits || 0,
      social_presence: (company.social_media_links || []).length,
      regions: company.region || 'Unknown'
    }));
  };

  const analyzeTechnologyStack = (data) => {
    return data.map(company => ({
      name: company.name,
      tech_count: company.active_tech_count || 0,
      key_technologies: (company.builtwith_tech || [])
        .slice(0, 5)
        .map(tech => tech.name)
    }));
  };

  const compareFunding = (data) => {
    return data.map(company => ({
      name: company.name,
      funding_rounds: company.funding_rounds?.num_funding_rounds || 0,
      total_funding: company.funding_rounds?.value?.value_usd || 0,
      investors: company.num_investors || 0
    }));
  };

  const calculateGrowthMetrics = (data) => {
    return data.map(company => ({
      name: company.name,
      employee_growth: company.num_employees || 'Unknown',
      monthly_growth: company.monthly_visits_growth || 0,
      news_mentions: company.num_news || 0
    }));
  };

  const generateCompetitorAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      
      const prompt = `
        Analyze this competitor data and provide strategic insights:

        Target Company: ${processedData.target_company.name}
        ${processedData.target_company.about}

        Key Competitors:
        ${processedData.competitors.map(c => `- ${c.name}: ${c.about}`).join('\n')}

        Market Presence:
        ${JSON.stringify(processedData.metrics.market_presence, null, 2)}

        Technology Stack:
        ${JSON.stringify(processedData.metrics.technology_stack, null, 2)}

        Funding Comparison:
        ${JSON.stringify(processedData.metrics.funding_comparison, null, 2)}

        Growth Metrics:
        ${JSON.stringify(processedData.metrics.growth_metrics, null, 2)}

        Please provide:
        1. Competitive Position Analysis
        2. Strengths and Weaknesses vs Competitors
        3. Market Share Analysis
        4. Technology Stack Comparison
        5. Growth Strategy Recommendations

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
        alert('Failed to generate competitor analysis: ' + error.message);
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
      <div className="bg-[#1D1D1F]/90 p-6 rounded-xl backdrop-blur-xl border border-purple-500/20 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-purple-400">
            Competitor Analysis Results
          </h3>
          <div className="flex space-x-4">
            <button
              onClick={generateCompetitorAnalysis}
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
          {/* Target Company */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Target Company</h4>
            <div className="space-y-2">
              <p className="text-gray-300">Name: {processedData.target_company.name}</p>
              <p className="text-gray-300">About: {processedData.target_company.about}</p>
              <p className="text-gray-300">Region: {processedData.target_company.region}</p>
            </div>
          </div>

          {/* Key Competitors */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Key Competitors</h4>
            <div className="space-y-4">
              {processedData.competitors.map((competitor, index) => (
                <div key={index} className="p-3 bg-[#1D1D1F] rounded-lg">
                  <h5 className="font-semibold text-purple-300">{competitor.name}</h5>
                  <p className="text-gray-400 text-sm mt-1">{competitor.about}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Market Presence */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Market Presence</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedData.metrics.market_presence.map((company, index) => (
                <div key={index} className="p-3 bg-[#1D1D1F] rounded-lg">
                  <h5 className="font-semibold text-purple-300">{company.name}</h5>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-gray-300">Monthly Visits: {company.monthly_visits.toLocaleString()}</p>
                    <p className="text-gray-300">Social Presence: {company.social_presence}</p>
                    <p className="text-gray-300">Regions: {company.regions}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Technology Stack */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Technology Stack</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedData.metrics.technology_stack.map((company, index) => (
                <div key={index} className="p-3 bg-[#1D1D1F] rounded-lg">
                  <h5 className="font-semibold text-purple-300">{company.name}</h5>
                  <p className="text-gray-400 mt-1">Technologies: {company.tech_count}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {company.key_technologies.map((tech, i) => (
                      <span key={i} className="px-2 py-1 bg-purple-500/20 rounded-full text-xs text-purple-300">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Analysis Results */}
          {analysis && (
            <div className="bg-[#2D2D2F] p-4 rounded-lg">
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

  const searchCompetitors = async () => {
    if (!competitorInput.trim()) {
      alert('Please enter a company name');
      return;
    }

    setIsSearchingCompetitors(true);
    try {
      const response = await fetch('http://127.0.0.1:5001/api/search-competitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify({ query: competitorInput })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Competitor search results:', data);
      
      if (data.competitors && Array.isArray(data.competitors)) {
        setCompetitors(data);
        console.log(`Found ${data.competitors.length} competitors for ${competitorInput}`);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error searching competitors:', error);
      alert('Error searching competitors: ' + error.message);
    } finally {
      setIsSearchingCompetitors(false);
    }
  };

  const analyzeSentiment = async (competitorName) => {
    if (!competitorName) {
      alert('No competitor selected');
      return;
    }

    setIsAnalyzingSentiment(true);
    try {
      const response = await fetch('http://127.0.0.1:5001/api/competitor-sentiment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify({ query: competitorName })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch sentiment data');
      }
      
      const data = await response.json();
      console.log('Sentiment data:', data);
      setSentimentData(data);
      setShowSentimentAnalysis(true);
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      alert(error.message || 'Error analyzing sentiment');
    } finally {
      setIsAnalyzingSentiment(false);
    }
  };

  const SentimentAnalysisPanel = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-[#1D1D1F] rounded-xl shadow-xl">
          {/* Header */}
          <div className="p-6 border-b border-gray-800 flex justify-between items-center">
            <h3 className="text-xl font-semibold text-purple-400">
              Competitor News & Sentiment Analysis
            </h3>
            <button 
              onClick={() => {
                setShowSentimentAnalysis(false);
                setCompetitors([]);
                setSelectedCompetitor(null);
                setCompetitorInput('');
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search Section */}
          <div className="p-6 border-b border-gray-800">
            <div className="flex gap-4">
              <input
                type="text"
                value={competitorInput}
                onChange={(e) => setCompetitorInput(e.target.value)}
                placeholder="Enter your company name to find competitors..."
                className="flex-1 px-4 py-2 bg-[#2D2D2F] rounded-lg text-white placeholder-gray-400 border border-gray-700 focus:border-purple-500 outline-none"
              />
              <button
                onClick={searchCompetitors}
                disabled={isSearchingCompetitors}
                className={`px-6 py-2 rounded-lg transition-colors ${
                  isSearchingCompetitors 
                    ? 'bg-purple-600/50 cursor-not-allowed' 
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {isSearchingCompetitors ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Searching...</span>
                  </div>
                ) : (
                  'Find Competitors'
                )}
              </button>
            </div>
          </div>

          {isSearchingCompetitors && (
            <div className="p-6 text-center text-gray-400">
              <div className="animate-pulse">Analyzing competitors...</div>
            </div>
          )}

          {/* Competitors List */}
          {competitors?.competitors?.length > 0 && (
            <div className="p-6 border-b border-gray-800">
              <h4 className="text-lg font-medium text-purple-400 mb-4">
                Found Competitors for {competitorInput}
              </h4>
              
              {/* Analysis Summary */}
              {competitors.analysis_summary && (
                <div className="mb-6 bg-[#2D2D2F] p-4 rounded-lg">
                  <h5 className="text-sm font-medium text-purple-300 mb-2">Market Overview</h5>
                  <p className="text-gray-400 text-sm">{competitors.analysis_summary}</p>
                </div>
              )}

              {/* Competitors Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {competitors.competitors.map((competitor, index) => (
                  <div 
                    key={index}
                    className={`bg-[#2D2D2F] p-6 rounded-lg cursor-pointer transition-all ${
                      selectedCompetitor?.name === competitor.name
                        ? 'border-2 border-purple-500'
                        : 'border border-gray-700 hover:border-purple-500/50'
                    }`}
                    onClick={() => setSelectedCompetitor(competitor)}
                  >
                    {/* Company Name and Description */}
                    <div className="mb-4">
                      <h5 className="text-lg font-medium text-purple-400 mb-2">
                        {competitor.name}
                      </h5>
                      <p className="text-gray-300 text-sm">
                        {competitor.description}
                      </p>
                    </div>

                    {/* Market Position */}
                    <div className="mb-4">
                      <h6 className="text-sm font-medium text-purple-300 mb-1">
                        Market Position
                      </h6>
                      <p className="text-gray-400 text-sm">
                        {competitor.market_position}
                      </p>
                    </div>

                    {/* Target Market */}
                    <div className="mb-4">
                      <h6 className="text-sm font-medium text-purple-300 mb-1">
                        Target Market
                      </h6>
                      <p className="text-gray-400 text-sm">
                        {competitor.target_market}
                      </p>
                    </div>

                    {/* Strengths */}
                    <div className="mb-4">
                      <h6 className="text-sm font-medium text-purple-300 mb-2">
                        Key Strengths
                      </h6>
                      <div className="flex flex-wrap gap-2">
                        {competitor.strengths.map((strength, i) => (
                          <span 
                            key={i}
                            className="px-2 py-1 bg-purple-500/10 rounded text-purple-300 text-xs"
                          >
                            {strength}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Unique Features */}
                    <div>
                      <h6 className="text-sm font-medium text-purple-300 mb-2">
                        Unique Features
                      </h6>
                      <div className="flex flex-wrap gap-2">
                        {competitor.unique_features.map((feature, i) => (
                          <span 
                            key={i}
                            className="px-2 py-1 bg-green-500/10 rounded text-green-300 text-xs"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Competitor Analysis Button */}
          {selectedCompetitor && (
            <div className="p-6 border-b border-gray-800">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-lg font-medium text-purple-400">
                    Analyze {selectedCompetitor.name}
                  </h4>
                  <p className="text-sm text-gray-400 mt-1">
                    Get latest news and sentiment analysis
                  </p>
                </div>
                <button
                  onClick={() => analyzeSentiment(selectedCompetitor.name)}
                  disabled={isAnalyzingSentiment}
                  className={`px-6 py-2 rounded-lg transition-colors ${
                    isAnalyzingSentiment 
                      ? 'bg-purple-600/50 cursor-not-allowed' 
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {isAnalyzingSentiment ? (
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Analyzing...</span>
                    </div>
                  ) : (
                    'Get Latest News'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Results Section */}
          {sentimentData && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sentimentData.sentiment_analysis.map((company, index) => (
                  <div key={index} className="bg-[#2D2D2F] p-4 rounded-lg">
                    <h4 className="text-lg font-medium text-purple-400 mb-3">
                      {company.company}
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-400">Overall Sentiment</p>
                        <p className={`text-lg font-medium ${
                          company.sentiment_score > 0 ? 'text-green-400' :
                          company.sentiment_score < 0 ? 'text-red-400' :
                          'text-gray-400'
                        }`}>
                          {company.overall_sentiment}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-400">Key Themes</p>
                        <ul className="list-disc list-inside text-gray-300">
                          {company.key_themes.map((theme, i) => (
                            <li key={i}>{theme}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-sm text-gray-400">Notable Developments</p>
                        <ul className="list-disc list-inside text-gray-300">
                          {company.notable_developments.map((dev, i) => (
                            <li key={i}>{dev}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-sm text-gray-400">News Sources</p>
                        <ul className="space-y-2">
                          {company.news_sources.map((source, i) => (
                            <li key={i}>
                              <a 
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-400 hover:text-purple-300 text-sm"
                              >
                                {new URL(source.url).hostname} ({source.date})
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const ApiStatusIndicator = () => {
    if (apiStatus === 'error') {
      return (
        <div className="bg-red-500/10 text-red-400 px-4 py-2 rounded-lg mb-4 flex items-center justify-between">
          <div>
            <span className="font-medium">API Connection Error: </span>
            <span>Please check if the server is running at http://127.0.0.1:5001</span>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }
    return null;
  };

  const CompetitorCard = ({ competitor, onClick, isSelected }) => {
    const [showNews, setShowNews] = useState(false);
    const [newsItems, setNewsItems] = useState([]);
    const [isLoadingNews, setIsLoadingNews] = useState(false);

    const fetchCompetitorNews = async () => {
      setIsLoadingNews(true);
      try {
        const response = await fetch('http://127.0.0.1:5001/api/competitor-sentiment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          mode: 'cors',
          body: JSON.stringify({ query: competitor.name })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch news');
        }

        const data = await response.json();
        if (data.sentiment_analysis && data.sentiment_analysis[0].news_sources) {
          setNewsItems(data.sentiment_analysis[0].news_sources);
        }
        setShowNews(true);
      } catch (error) {
        console.error('Error fetching news:', error);
        alert('Error fetching news');
      } finally {
        setIsLoadingNews(false);
      }
    };

    return (
      <div className="bg-[#2D2D2F] p-6 rounded-lg">
        <div className={`transition-all ${
          isSelected ? 'border-2 border-purple-500' : 'border border-gray-700'
        }`}>
          {/* Competitor Info */}
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-purple-400 mb-2">{competitor.name}</h3>
            <p className="text-gray-300">{competitor.description}</p>
          </div>

          {/* Strengths */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-purple-300 mb-2">Key Strengths</h4>
            <div className="flex flex-wrap gap-2">
              {competitor.strengths.map((strength, i) => (
                <span key={i} className="px-2 py-1 bg-purple-500/10 rounded text-purple-300 text-xs">
                  {strength}
                </span>
              ))}
            </div>
          </div>

          {/* Market Position & Target Market */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-purple-300 mb-1">Market Position</h4>
            <p className="text-gray-400 text-sm mb-2">{competitor.market_position}</p>
            <h4 className="text-sm font-medium text-purple-300 mb-1">Target Market</h4>
            <p className="text-gray-400 text-sm">{competitor.target_market}</p>
          </div>

          {/* News Button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={fetchCompetitorNews}
              disabled={isLoadingNews}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isLoadingNews 
                  ? 'bg-purple-600/50 cursor-not-allowed' 
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {isLoadingNews ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Loading News...</span>
                </div>
              ) : (
                'View Latest News'
              )}
            </button>
          </div>

          {/* News Results */}
          {showNews && (
            <div className="mt-4">
              {newsItems.length > 0 ? (
                <div className="space-y-3">
                  {newsItems.map((item, i) => (
                    <a
                      key={i}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 bg-[#1D1D1F] rounded-lg hover:bg-[#2D2D2F] transition-colors"
                    >
                      <div className="text-xs text-gray-400">
                        {item.source} • {new Date(item.date).toLocaleDateString()}
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-3">
                  No news found for {competitor.name}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const PerformanceTrackingPanel = () => {
    const [currentSnapshotData, setCurrentSnapshotData] = useState(null);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState('');

    // Function to get all companies from snapshot data
    const getCompaniesFromSnapshot = (snapshot) => {
      console.log('Getting companies from snapshot:', snapshot);
      
      try {
        // Check if snapshot exists and has data
        if (!snapshot || !snapshot.data) {
          console.warn('Invalid snapshot:', snapshot);
          return [];
        }

        // Convert data to array if it's not already
        const dataArray = Array.isArray(snapshot.data) ? snapshot.data : [snapshot.data];
        
        // Filter out invalid entries
        const validCompanies = dataArray.filter(company => 
          company && 
          company.name && 
          company.id && 
          !company.warning
        );

        console.log('Valid companies found:', validCompanies.length);
        
        return validCompanies.map(company => ({
          name: company.name,
          id: company.id,
          data: company
        }));

      } catch (error) {
        console.error('Error processing companies:', error);
        return [];
      }
    };

    // Function to process snapshot data for selected company
    const processSnapshot = async (snapshot, companyId) => {
      console.log('Processing snapshot for company:', companyId);
      setIsLoadingData(true);
      
      try {
        // Ensure snapshot and data exist
        if (!snapshot || !snapshot.data) {
          throw new Error('Invalid snapshot data');
        }

        // Convert data to array if needed
        const dataArray = Array.isArray(snapshot.data) ? snapshot.data : [snapshot.data];
        
        // Find the company
        const company = dataArray.find(c => c && c.id === companyId);
        if (!company) {
          throw new Error('Company not found in snapshot');
        }

        // Create processed data with default empty objects
        const processedData = {
          generalInfo: {},
          financialMetrics: {},
          techMetrics: {},
          teamMetrics: {}
        };

        // Safely add data if it exists
        if (company) {
          processedData.generalInfo = {
            name: company.name || 'N/A',
            legal_name: company.legal_name || 'N/A',
            cb_rank: company.cb_rank || 'N/A',
            region: company.region || 'N/A',
            about: company.about || 'N/A',
            industries: Array.isArray(company.industries) 
              ? company.industries.map(i => i.value).join(', ') 
              : 'N/A',
            operating_status: company.operating_status || 'N/A',
            company_type: company.company_type || 'N/A',
            founded_date: company.founded_date || 'N/A',
            num_employees: company.num_employees || 'N/A',
            country_code: company.country_code || 'N/A',
            website: company.website || 'N/A'
          };

          processedData.financialMetrics = {
            ipo_status: company.ipo_status || 'N/A',
            monthly_visits: company.monthly_visits || 'N/A',
            semrush_visits_latest_month: company.semrush_visits_latest_month || 'N/A',
            monthly_visits_growth: company.monthly_visits_growth || 'N/A',
            semrush_visits_mom_pct: company.semrush_visits_mom_pct || 'N/A'
          };

          processedData.techMetrics = {
            active_tech_count: company.active_tech_count || 'N/A',
            builtwith_num_technologies_used: company.builtwith_num_technologies_used || 'N/A',
            builtwith_tech: Array.isArray(company.builtwith_tech) 
              ? company.builtwith_tech.length 
              : 'N/A',
            total_active_products: company.total_active_products || 'N/A'
          };

          processedData.teamMetrics = {
            num_contacts: company.num_contacts || 'N/A',
            num_contacts_linkedin: company.num_contacts_linkedin || 'N/A',
            num_employee_profiles: company.num_employee_profiles || 'N/A',
            current_employees: Array.isArray(company.current_employees) 
              ? company.current_employees.length 
              : 'N/A',
            num_alumni: company.num_alumni || 'N/A'
          };
        }

        console.log('Processed data:', processedData);
        setCurrentSnapshotData(processedData);

      } catch (error) {
        console.error('Error processing snapshot:', error);
        alert('Error processing snapshot data: ' + error.message);
      } finally {
        setIsLoadingData(false);
      }
    };

    // Add logging for render
    console.log('Rendering PerformanceTrackingPanel with:', {
      selectedSnapshot,
      selectedCompany,
      currentSnapshotData,
      isLoadingData
    });

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-[#1D1D1F] rounded-xl shadow-xl">
            {/* Header */}
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold text-purple-400">
                  Company Performance Metrics
                </h3>
                {selectedSnapshot && (
                  <p className="text-sm text-gray-400 mt-1">
                    Snapshot ID: {selectedSnapshot.id}
                  </p>
                )}
              </div>
              <button onClick={() => setShowPerformanceTracking(false)} className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Snapshot and Company Selection */}
            <div className="p-6 border-b border-gray-800">
              <div className="flex flex-col gap-4">
                {/* Snapshot Selection */}
                <div className="flex items-center gap-4">
                  <select
                    value={selectedSnapshot?.id || ''}
                    onChange={(e) => {
                      const snapshot = storedSnapshots?.find(s => s?.id === e.target.value);
                      setSelectedSnapshot(snapshot || null);
                      setSelectedCompany('');
                      setCurrentSnapshotData(null);
                    }}
                    className="flex-1 bg-[#1D1D1F] text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-purple-500 outline-none"
                  >
                    <option value="">Select a snapshot</option>
                    {(storedSnapshots || []).map((snapshot) => (
                      snapshot && snapshot.id ? (
                        <option key={snapshot.id} value={snapshot.id}>
                          {snapshot.id} - {new Date(snapshot.timestamp).toLocaleDateString()}
                        </option>
                      ) : null
                    ))}
                  </select>
                </div>

                {/* Company Selection */}
                {selectedSnapshot && (
                  <div className="flex items-center gap-4">
                    <select
                      value={selectedCompany || ''}
                      onChange={(e) => setSelectedCompany(e.target.value)}
                      className="flex-1 bg-[#1D1D1F] text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-purple-500 outline-none"
                    >
                      <option value="">Select a company</option>
                      {getCompaniesFromSnapshot(selectedSnapshot).map((company) => (
                        company && company.id ? (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ) : null
                      ))}
                    </select>
                    
                    <button
                      onClick={() => {
                        console.log('View Metrics clicked:', {
                          selectedSnapshot,
                          selectedCompany,
                          isLoadingData
                        });
                        if (selectedSnapshot && selectedCompany) {
                          processSnapshot(selectedSnapshot, selectedCompany);
                        }
                      }}
                      disabled={!selectedSnapshot || !selectedCompany || isLoadingData}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        !selectedSnapshot || !selectedCompany || isLoadingData
                          ? 'bg-purple-600/50 cursor-not-allowed'
                          : 'bg-purple-600 hover:bg-purple-700'
                      }`}
                    >
                      {isLoadingData ? (
                        <div className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Processing...</span>
                        </div>
                      ) : (
                        'View Metrics'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Display Metrics */}
            <div className="p-6">
              {currentSnapshotData ? (
                <div className="space-y-6">
                  {/* Financial Performance */}
                  {currentSnapshotData.financialMetrics && (
                    <div className="bg-[#2D2D2F] p-4 rounded-lg">
                      <h4 className="text-lg font-medium text-purple-400 mb-4">
                        Financial Performance
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(currentSnapshotData.financialMetrics || {}).map(([key, value]) => (
                          <MetricCard 
                            key={key}
                            title={key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            value={value}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Technology & Products */}
                  {currentSnapshotData.techMetrics && (
                    <div className="bg-[#2D2D2F] p-4 rounded-lg">
                      <h4 className="text-lg font-medium text-purple-400 mb-4">
                        Technology & Products
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(currentSnapshotData.techMetrics || {}).map(([key, value]) => (
                          <MetricCard 
                            key={key}
                            title={key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            value={value}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contact & Employee Data */}
                  {currentSnapshotData.teamMetrics && (
                    <div className="bg-[#2D2D2F] p-4 rounded-lg">
                      <h4 className="text-lg font-medium text-purple-400 mb-4">
                        Team & People
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(currentSnapshotData.teamMetrics || {}).map(([key, value]) => (
                          <MetricCard 
                            key={key}
                            title={key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            value={value}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* General Information */}
                  {currentSnapshotData.generalInfo && (
                    <div className="bg-[#2D2D2F] p-4 rounded-lg">
                      <h4 className="text-lg font-medium text-purple-400 mb-4">
                        General Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(currentSnapshotData.generalInfo || {}).map(([key, value]) => (
                          <MetricCard 
                            key={key}
                            title={key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            value={value}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-12">
                  Select a snapshot and company, then click "View Metrics" to see the data
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Helper component for metric cards
  const MetricCard = ({ title, value, subValue }) => (
    <div className="bg-[#1D1D1F] p-4 rounded-lg">
      <h5 className="text-sm font-medium text-purple-300 mb-1">{title}</h5>
      <p className="text-lg font-bold text-white">
        {value || 'N/A'}
      </p>
      {subValue && (
        <p className="text-xs text-gray-400 mt-1">
          {subValue}
        </p>
      )}
    </div>
  );

  // Main return for CompetitorTrackingContent
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#131314] text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <ApiStatusIndicator />
          
          {/* View Toggle */}
          <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Navigation Tabs */}
            <div className="flex items-center justify-between mb-8">
              <div className="bg-[#1D1D1F] p-1 rounded-xl inline-flex">
                <Link 
                  href="/market-trends"
                  className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-purple-600/50 transition-all duration-200"
                >
                  Market Trends
                </Link>
                <button 
                  className="px-4 py-2 rounded-lg bg-purple-600 text-white"
                >
                  Competitor Analysis
                </button>
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
                <button
                  onClick={() => setShowComp(true)}
                  className="px-6 py-2 rounded-xl font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  Show Comp
                </button>
                <button
                  onClick={() => setShowPerformanceTracking(true)}
                  className="px-4 py-2 bg-[#1D1D1F] rounded-lg text-white hover:bg-purple-600/20 transition-colors"
                >
                  Performance Tracking
                </button>
                <button
                  onClick={() => setShowSentimentAnalysis(true)}
                  className="px-4 py-2 bg-[#1D1D1F] rounded-lg text-white hover:bg-purple-600/20 transition-colors"
                >
                  Sentiment Analysis
                </button>
              </div>
            </div>

            {/* Content based on view mode */}
            {showComp ? (
              <Comp onClose={() => setShowComp(false)} />
            ) : viewMode === 'web' ? (
              <Competitor />
            ) : (
              <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-white mb-6">Stored Snapshots</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {storedSnapshots.map((snapshot) => (
                      <div 
                        key={snapshot.id}
                        className="bg-[#1D1D1F]/90 p-6 rounded-xl backdrop-blur-xl border border-purple-500/20 hover:border-purple-500/40 transition-all cursor-pointer"
                        onClick={() => setSelectedSnapshot(snapshot)}
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
                              onClick={() => setShowPerformanceTracking(true)}
                              className="px-4 py-2 bg-purple-600 rounded-lg text-white hover:bg-purple-700 transition-colors"
                            >
                              View Performance
                            </button>
                            <button 
                              onClick={() => setSelectedSnapshot(null)}
                              className="text-gray-400 hover:text-gray-300"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                        <pre className="bg-[#2D2D2F] p-4 rounded-lg overflow-auto max-h-96 text-sm text-gray-300">
                          {JSON.stringify(selectedSnapshot.data, null, 2)}
                        </pre>
                      </div>

                      {/* Processed Data Review */}
                      {renderProcessedDataReview()}
                    </div>
                  )}

                  {storedSnapshots.length === 0 && (
                    <div className="text-center text-gray-400 py-12">
                      No stored snapshots found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        {showSentimentAnalysis && <SentimentAnalysisPanel />}
        {showPerformanceTracking && <PerformanceTrackingPanel />}
      </div>
    </ErrorBoundary>
  );
}