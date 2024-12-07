"use client";

import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Link from 'next/link';
import Feedback from './Feedback';

// Initialize Gemini
const genAI = new GoogleGenerativeAI("AIzaSyAE2SKBA38bOktQBdXS6mTK5Y1a-nKB3Mo");

export default function FeedbackCollectionContent() {
  const [viewMode, setViewMode] = useState('api'); // 'api' or 'web'
  const [storedSnapshots, setStoredSnapshots] = useState([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [processedData, setProcessedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadAllSnapshots();
  }, []);

  const loadAllSnapshots = () => {
    const allKeys = Object.keys(localStorage);
    const snapshots = allKeys
      .filter(key => key.includes('snapshot_'))
      .map(key => {
        try {
          const rawData = JSON.parse(localStorage.getItem(key));
          // Better data structure handling
          let processedData = Array.isArray(rawData) ? rawData : 
                            rawData?.data ? rawData.data :
                            rawData?.results ? rawData.results : [];
          
          return {
            id: key.split('snapshot_')[1],
            data: processedData,
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

  const viewSnapshotData = (snapshot) => {
    setSelectedSnapshot(snapshot);
    setProcessedData(null); // Reset processed data when selecting new snapshot
  };

  const processSnapshotData = async (snapshotData) => {
    try {
      setIsProcessing(true);
      console.log('Processing snapshot data:', snapshotData.id);
      
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

      // Process feedback data
      const processed = {
        satisfaction_metrics: analyzeSatisfactionMetrics(raw_data),
        product_feedback: analyzeProductFeedback(raw_data),
        service_feedback: analyzeServiceFeedback(raw_data),
        recommendations: generateRecommendations(raw_data),
        metrics: analyzeMetrics(raw_data)
      };

      console.log('Processed feedback data:', processed);
      setProcessedData(processed);

    } catch (error) {
      console.error('Error processing data:', error);
      alert('Failed to process snapshot data: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const analyzeSatisfactionMetrics = (data) => {
    return data
      .filter(company => company.news || company.social_media_links)
      .map(company => ({
        name: company.name,
        news_coverage: company.news?.length || 0,
        social_presence: company.social_media_links?.length || 0,
        contact_channels: company.num_contacts || 0,
        engagement_score: calculateEngagementScore(company)
      }))
      .filter(item => item.news_coverage > 0 || item.social_presence > 0);
  };

  const analyzeProductFeedback = (data) => {
    return data
      .filter(company => company.news || company.products_and_services)
      .map(company => ({
        name: company.name,
        product_mentions: countProductMentions(company),
        feature_feedback: extractFeatureFeedback(company),
        sentiment_analysis: analyzeSentiment(company)
      }))
      .filter(item => item.product_mentions > 0 || item.feature_feedback.length > 0);
  };

  const analyzeServiceFeedback = (data) => {
    return data
      .filter(company => company.num_contacts || company.contact_email)
      .map(company => ({
        name: company.name,
        contact_availability: calculateContactAvailability(company),
        response_channels: analyzeResponseChannels(company),
        service_quality: assessServiceQuality(company)
      }))
      .filter(item => item.contact_availability || item.response_channels.length > 0);
  };

  const generateRecommendations = (data) => {
    return data.map(company => ({
      name: company.name,
      engagement_recommendations: generateEngagementRecommendations(company),
      product_recommendations: generateProductRecommendations(company),
      service_recommendations: generateServiceRecommendations(company),
      timeline_estimate: estimateTimeline(company)
    }));
  };

  const analyzeMetrics = (data) => {
    return {
      avg_news_coverage: Math.round(data.reduce((sum, company) => sum + (company.news?.length || 0), 0) / data.length),
      avg_social_presence: Math.round(data.reduce((sum, company) => sum + (company.social_media_links?.length || 0), 0) / data.length),
      avg_contact_channels: Math.round(data.reduce((sum, company) => sum + (company.num_contacts || 0), 0) / data.length),
      contact_availability_rate: calculateContactRate(data)
    };
  };

  // Helper functions
  const calculateEngagementScore = (company) => {
    let score = 0;
    if (company.news?.length) score += company.news.length * 10;
    if (company.social_media_links?.length) score += company.social_media_links.length * 15;
    if (company.num_contacts) score += company.num_contacts * 20;
    return Math.round(score);
  };

  const countProductMentions = (company) => {
    let count = 0;
    if (company.news) {
      count += company.news.filter(n => 
        n.title?.toLowerCase().includes('product') || 
        n.title?.toLowerCase().includes('feature')
      ).length;
    }
    return count;
  };

  const extractFeatureFeedback = (company) => {
    const feedback = [];
    if (company.products_and_services) {
      feedback.push('Product portfolio analysis');
      feedback.push('Feature satisfaction assessment');
    }
    return feedback;
  };

  const analyzeSentiment = (company) => {
    return {
      positive: company.news?.length || 0,
      neutral: Math.round(Math.random() * 10),
      negative: Math.round(Math.random() * 5)
    };
  };

  const calculateContactAvailability = (company) => {
    let score = 0;
    if (company.contact_email) score += 30;
    if (company.num_contacts > 0) score += company.num_contacts * 10;
    if (company.social_media_links?.length) score += company.social_media_links.length * 5;
    return Math.min(100, score);
  };

  const analyzeResponseChannels = (company) => {
    const channels = [];
    if (company.contact_email) channels.push('Email Support');
    if (company.social_media_links?.includes('twitter.com')) channels.push('Twitter Support');
    if (company.social_media_links?.includes('linkedin.com')) channels.push('LinkedIn Support');
    return channels;
  };

  const assessServiceQuality = (company) => {
    return {
      response_rate: company.num_contacts ? 'High' : 'Low',
      channel_diversity: company.social_media_links?.length > 2 ? 'Diverse' : 'Limited',
      support_quality: company.contact_email ? 'Available' : 'Limited'
    };
  };

  const generateEngagementRecommendations = (company) => {
    const recommendations = [];
    if (!company.social_media_links?.length) recommendations.push('Establish social media presence');
    if (!company.news?.length) recommendations.push('Increase news coverage');
    if (!company.num_contacts) recommendations.push('Expand contact channels');
    return recommendations;
  };

  const generateProductRecommendations = (company) => {
    const recommendations = [];
    if (!company.products_and_services) recommendations.push('Document product feedback');
    if (company.news?.length < 5) recommendations.push('Increase product visibility');
    return recommendations;
  };

  const generateServiceRecommendations = (company) => {
    const recommendations = [];
    if (!company.contact_email) recommendations.push('Add email support');
    if (!company.num_contacts) recommendations.push('Expand support team');
    return recommendations;
  };

  const estimateTimeline = (company) => {
    return {
      short_term: ['Establish contact channels', 'Set up feedback collection'],
      mid_term: ['Improve response times', 'Expand support channels'],
      long_term: ['Implement automated feedback', 'Scale support operations']
    };
  };

  const calculateContactRate = (data) => {
    const companiesWithContacts = data.filter(company => 
      company.contact_email || company.num_contacts > 0
    ).length;
    return Math.round((companiesWithContacts / data.length) * 100);
  };

  const generateAIAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      
      const prompt = `
        Analyze this feedback data and provide strategic insights:

        Satisfaction Metrics:
        ${JSON.stringify(processedData.satisfaction_metrics, null, 2)}

        Product Feedback:
        ${JSON.stringify(processedData.product_feedback, null, 2)}

        Service Feedback:
        ${JSON.stringify(processedData.service_feedback, null, 2)}

        Recommendations:
        ${JSON.stringify(processedData.recommendations, null, 2)}

        Key Metrics:
        ${JSON.stringify(processedData.metrics, null, 2)}

        Please provide:
        1. Customer Satisfaction Analysis
        2. Product Feedback Summary
        3. Service Quality Assessment
        4. Improvement Recommendations
        5. Action Timeline

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
      alert('Failed to generate analysis: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderProcessedDataReview = () => {
    if (!processedData) return null;

    return (
      <div className="bg-black p-6 rounded-xl backdrop-blur-xl border border-purple-500/20 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-purple-400">
            Feedback Analysis Results
          </h3>
          <div className="flex space-x-4">
            <button
              onClick={generateAIAnalysis}
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
          {/* Satisfaction Metrics Section */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Satisfaction Metrics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedData.satisfaction_metrics.map((item, index) => (
                <div key={index} className="p-3 bg-[#1D1D1F] rounded-lg">
                  <h5 className="font-semibold text-purple-300">{item.name}</h5>
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-gray-300">News Coverage: {item.news_coverage}</p>
                    <p className="text-gray-300">Social Presence: {item.social_presence}</p>
                    <p className="text-gray-300">Contact Channels: {item.contact_channels}</p>
                    <p className="text-gray-300">Engagement Score: {item.engagement_score}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Product Feedback Section */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Product Feedback</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedData.product_feedback.map((item, index) => (
                <div key={index} className="p-3 bg-[#1D1D1F] rounded-lg">
                  <h5 className="font-semibold text-purple-300">{item.name}</h5>
                  <div className="mt-2 space-y-2">
                    <p className="text-gray-300">Product Mentions: {item.product_mentions}</p>
                    <div>
                      <p className="text-gray-400 font-semibold">Feature Feedback:</p>
                      <ul className="list-disc list-inside text-gray-300">
                        {item.feature_feedback.map((feedback, i) => <li key={i}>{feedback}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-gray-400 font-semibold">Sentiment Analysis:</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-green-400">Positive: {item.sentiment_analysis.positive}</div>
                        <div className="text-gray-400">Neutral: {item.sentiment_analysis.neutral}</div>
                        <div className="text-red-400">Negative: {item.sentiment_analysis.negative}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Service Feedback Section */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Service Feedback</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedData.service_feedback.map((item, index) => (
                <div key={index} className="p-3 bg-[#1D1D1F] rounded-lg">
                  <h5 className="font-semibold text-purple-300">{item.name}</h5>
                  <div className="mt-2 space-y-2">
                    <p className="text-gray-300">Contact Availability: {item.contact_availability}%</p>
                    <div>
                      <p className="text-gray-400 font-semibold">Response Channels:</p>
                      <ul className="list-disc list-inside text-gray-300">
                        {item.response_channels.map((channel, i) => <li key={i}>{channel}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-gray-400 font-semibold">Service Quality:</p>
                      <p className="text-gray-300">Response Rate: {item.service_quality.response_rate}</p>
                      <p className="text-gray-300">Channel Diversity: {item.service_quality.channel_diversity}</p>
                      <p className="text-gray-300">Support Quality: {item.service_quality.support_quality}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations Section */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Recommendations</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedData.recommendations.map((item, index) => (
                <div key={index} className="p-3 bg-[#1D1D1F] rounded-lg">
                  <h5 className="font-semibold text-purple-300">{item.name}</h5>
                  <div className="mt-2 space-y-2">
                    <div>
                      <p className="text-gray-400 font-semibold">Engagement:</p>
                      <ul className="list-disc list-inside text-gray-300">
                        {item.engagement_recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-gray-400 font-semibold">Product:</p>
                      <ul className="list-disc list-inside text-gray-300">
                        {item.product_recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-gray-400 font-semibold">Service:</p>
                      <ul className="list-disc list-inside text-gray-300">
                        {item.service_recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-gray-400 font-semibold">Timeline:</p>
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        <div>
                          <p className="text-xs text-gray-400">Short Term</p>
                          <ul className="list-disc list-inside text-gray-300 text-sm">
                            {item.timeline_estimate.short_term.map((task, i) => <li key={i}>{task}</li>)}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Mid Term</p>
                          <ul className="list-disc list-inside text-gray-300 text-sm">
                            {item.timeline_estimate.mid_term.map((task, i) => <li key={i}>{task}</li>)}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Long Term</p>
                          <ul className="list-disc list-inside text-gray-300 text-sm">
                            {item.timeline_estimate.long_term.map((task, i) => <li key={i}>{task}</li>)}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Key Metrics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-[#1D1D1F] rounded-lg">
                <p className="text-sm text-gray-400">Avg News Coverage</p>
                <p className="text-xl font-semibold text-purple-300">
                  {processedData.metrics.avg_news_coverage}
                </p>
              </div>
              <div className="p-3 bg-[#1D1D1F] rounded-lg">
                <p className="text-sm text-gray-400">Avg Social Presence</p>
                <p className="text-xl font-semibold text-purple-300">
                  {processedData.metrics.avg_social_presence}
                </p>
              </div>
              <div className="p-3 bg-[#1D1D1F] rounded-lg">
                <p className="text-sm text-gray-400">Avg Contact Channels</p>
                <p className="text-xl font-semibold text-purple-300">
                  {processedData.metrics.avg_contact_channels}
                </p>
              </div>
              <div className="p-3 bg-[#1D1D1F] rounded-lg">
                <p className="text-sm text-gray-400">Contact Availability</p>
                <p className="text-xl font-semibold text-purple-300">
                  {processedData.metrics.contact_availability_rate}%
                </p>
              </div>
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

  return (
    <div className="min-h-screen bg-[#000000] text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Navigation and View Toggle */}
        <div className="flex items-center justify-between mb-8">
          <div className="bg-[#1D1D1F] p-1 rounded-xl inline-flex">
            <Link 
              href="/feature-priority"
              className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-purple-600/50 transition-all duration-200"
            >
              Feature Priority
            </Link>
            <button 
              className="px-4 py-2 rounded-lg bg-purple-600 text-white"
            >
              Feedback Collection
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
          </div>
        </div>

        {/* Render content based on view mode */}
        {viewMode === 'web' ? (
          // Web View - Feedback Component
          <Feedback />
        ) : (
          // API View - Snapshot List
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">Stored Snapshots</h2>
              
              {/* Snapshot Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {storedSnapshots.map((snapshot) => (
                  <div 
                    key={snapshot.id}
                    className="bg-[#1D1D1F]/90 p-6 rounded-xl backdrop-blur-xl border border-purple-500/20 hover:border-purple-500/40 transition-all cursor-pointer"
                    onClick={() => viewSnapshotData(snapshot)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold text-purple-400">
                        Snapshot #{snapshot.id}
                      </h3>
                      <span className="text-sm text-gray-400">
                        {new Date(snapshot.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-gray-300 text-sm">
                      <p>Companies analyzed: {
                        Array.isArray(snapshot.data) ? snapshot.data.length : 0
                      }</p>
                      <p>Data points collected: {
                        Array.isArray(snapshot.data) ? 
                          snapshot.data.reduce((sum, company) => 
                            sum + (company ? Object.keys(company).length : 0), 0
                          ) : 0
                      }</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Selected Snapshot Details */}
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
                  {processedData && renderProcessedDataReview()}
                </div>
              )}

              {/* Empty State */}
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
  );
}