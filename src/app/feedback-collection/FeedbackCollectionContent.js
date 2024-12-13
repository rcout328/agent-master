"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// Initialize Supabase client
const supabase = createClient(
  'https://rzaukiglowabowqevpem.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6YXVraWdsb3dhYm93cWV2cGVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTgxODk3NDcsImV4cCI6MjAzMzc2NTc0N30.wSQnUlCio1DpXHj0xa5_6W6KjyUzXv4kKWyhpziUx_s'
);

// Define AI agents array outside component
const aiAgentsList = [
  'Feedback Analysis Agent',
  'Sentiment Analysis Agent',
  'Customer Insights Agent',
  'Feedback Processing Agent',
  'User Response Agent'
];

export default function FeedbackCollectionContent() {
  // Move useState declarations inside component
  const [selectedAgent, setSelectedAgent] = useState('Sentiment Analysis Agent');
  const [showAgentDialog, setShowAgentDialog] = useState(false);
  const [viewMode, setViewMode] = useState('form');
  const [feedbackResponses, setFeedbackResponses] = useState([]);
  const [formData, setFormData] = useState({
    user_email: '',
    rating: 5,
    category: 'Product',
    comments: '',
  });
  const [loading, setLoading] = useState(false);
  const [shareableLink, setShareableLink] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [responseText, setResponseText] = useState({});
  const [isResponding, setIsResponding] = useState({});

  // Add AI agents array reference
  const aiAgents = aiAgentsList;

  useEffect(() => {
    fetchFeedbackResponses();
  }, []);

  const fetchFeedbackResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback_form')
        .select('*')
        .order('feedback_date', { ascending: false });

      if (error) throw error;
      setFeedbackResponses(data);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('feedback_form')
        .insert([
          {
            user_email: formData.user_email,
            rating: formData.rating,
            category: formData.category,
            comments: formData.comments,
            feedback_date: new Date().toISOString(),
            resolved: false
          }
        ]);

      if (error) throw error;

      setShowSuccess(true);
      setFormData({
        user_email: '',
        rating: 5,
        category: 'Product',
        comments: '',
      });
      
      setTimeout(() => setShowSuccess(false), 3000);
      fetchFeedbackResponses();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Error submitting feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateShareableLink = () => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/feedback-form`;
    setShareableLink(link);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareableLink);
    alert('Link copied to clipboard!');
  };

  const handleResponse = async (feedbackId, userEmail) => {
    if (!responseText[feedbackId]?.trim()) return;
    
    setIsResponding(prev => ({ ...prev, [feedbackId]: true }));
    try {
      // Save response to database
      const { error } = await supabase
        .from('feedback_form')
        .update({ 
          response: responseText[feedbackId],
          resolved: true 
        })
        .eq('feedback_id', feedbackId);

      if (error) throw error;
      
      // Create Gmail mailto link with response
      const subject = encodeURIComponent('Response to Your Feedback');
      const body = encodeURIComponent(responseText[feedbackId]);
      const mailtoLink = `mailto:${userEmail}?subject=${subject}&body=${body}`;
      
      // Open Gmail in new window
      window.open(mailtoLink, '_blank');
      
      // Clear response text and refresh feedback
      setResponseText(prev => ({ ...prev, [feedbackId]: '' }));
      fetchFeedbackResponses();
    } catch (error) {
      console.error('Error submitting response:', error);
      alert('Error submitting response. Please try again.');
    } finally {
      setIsResponding(prev => ({ ...prev, [feedbackId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Feedback Collection
          </h1>
        </div>

        <div className="mb-10 flex justify-between items-center">
          <div className="bg-[#1D1D1F]/60 backdrop-blur-xl p-1.5 rounded-xl inline-flex shadow-xl">
            <Link 
              href="/feature-priority"
              className="px-8 py-2.5 rounded-lg text-white hover:text-white hover:bg-white/5"
            >
              Feature Priority
            </Link>
            <button className="px-8 py-2.5 rounded-lg transition-all duration-300 bg-purple-600/90 text-white">
              Feedback Collection
            </button>
          </div>

          <button
            onClick={() => {
              setShowAgentDialog(true);
              setTimeout(() => {
                const prompt = `Analyze customer feedback sentiment for:
Company: ${formData.company_name}
Category: ${formData.category}
Rating: ${formData.rating}
Comments: ${formData.comments}
Feedback Date: ${new Date().toISOString()}

Please provide a detailed sentiment analysis covering:
1. Overall Sentiment Score
2. Key Emotional Patterns
3. Customer Satisfaction Level
4. Critical Pain Points
5. Improvement Recommendations`;

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
                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
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
          {/* Form/Responses Toggle and Share Link */}
          <div className="bg-[#1D1D1F]/80 backdrop-blur-xl rounded-xl shadow-xl p-8 border border-purple-800/50">
            <div className="flex justify-between items-center">
              <div className="flex gap-4">
                <button 
                  onClick={() => setViewMode('form')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'form' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-white hover:bg-purple-600/10'
                  }`}
                >
                  Feedback Form
                </button>
                <button 
                  onClick={() => setViewMode('responses')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'responses' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-white hover:bg-purple-600/10'
                  }`}
                >
                  Responses
                </button>
              </div>
              <button
                onClick={generateShareableLink}
                className="px-6 py-2 rounded-lg font-medium bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg transition-all duration-300"
              >
                Generate Shareable Link
              </button>
            </div>

            {shareableLink && (
              <div className="mt-6 flex items-center gap-4">
                <input
                  type="text"
                  value={shareableLink}
                  readOnly
                  className="flex-1 p-2.5 bg-[#2D2D2F]/50 text-white rounded-lg border border-purple-700/50"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Copy Link
                </button>
              </div>
            )}
          </div>

          {/* Feedback Form or Responses */}
          <div className="bg-[#1D1D1F]/80 backdrop-blur-xl rounded-xl shadow-xl border border-purple-800/50">
            <div className="p-8">
              {viewMode === 'form' ? (
                <div className="max-w-2xl mx-auto">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="col-span-2 space-y-2">
                        <label className="text-sm font-medium text-purple-400">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.user_email}
                          onChange={(e) => setFormData({...formData, user_email: e.target.value})}
                          className="w-full p-2.5 bg-[#2D2D2F]/50 text-white rounded-lg border border-purple-700/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10"
                          placeholder="Enter your email"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-purple-400">
                          Rating (1-10)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            max="10"
                            required
                            value={formData.rating}
                            onChange={(e) => setFormData({...formData, rating: parseInt(e.target.value)})}
                            className="w-full p-2.5 bg-[#2D2D2F]/50 text-white rounded-lg border border-purple-700/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400">
                            /10
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-purple-400">
                          Category
                        </label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData({...formData, category: e.target.value})}
                          className="w-full p-2.5 bg-[#2D2D2F]/50 text-white rounded-lg border border-purple-700/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10"
                        >
                          <option value="Product">Product</option>
                          <option value="Service">Service</option>
                          <option value="Bug Report">Bug Report</option>
                          <option value="Feature Request">Feature Request</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="col-span-2 space-y-2">
                        <label className="text-sm font-medium text-purple-400">
                          Comments
                        </label>
                        <textarea
                          required
                          value={formData.comments}
                          onChange={(e) => setFormData({...formData, comments: e.target.value})}
                          rows="4"
                          className="w-full p-2.5 bg-[#2D2D2F]/50 text-white rounded-lg border border-purple-700/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10"
                          placeholder="Share your feedback..."
                        ></textarea>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-full px-6 py-3 rounded-lg font-medium bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed ${
                        loading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          <span>Submitting...</span>
                        </div>
                      ) : (
                        'Submit Feedback'
                      )}
                    </button>

                    {showSuccess && (
                      <div className="mt-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
                        <div className="flex items-center gap-2 text-green-400">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Feedback submitted successfully!</span>
                        </div>
                      </div>
                    )}
                  </form>
                </div>
              ) : (
                <div className="grid gap-6">
                  {feedbackResponses.map((feedback) => (
                    <div 
                      key={feedback.feedback_id}
                      className="bg-[#2D2D2F]/50 p-6 rounded-xl border border-purple-800/50"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-white">{feedback.user_email}</p>
                          <p className="text-sm text-purple-400">
                            {new Date(feedback.feedback_date).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 rounded-full text-sm ${
                            feedback.resolved 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {feedback.resolved ? 'Resolved' : 'Pending'}
                          </span>
                          <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-sm">
                            {feedback.category}
                          </span>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm text-purple-400">Rating:</span>
                          <span className="text-purple-400 font-medium">{feedback.rating}/10</span>
                        </div>
                        <p className="text-white">{feedback.comments}</p>
                      </div>

                      {/* Response section */}
                      <div className="mt-4 pt-4 border-t border-purple-800/50">
                        {!feedback.response ? (
                          <div className="space-y-3">
                            <textarea
                              value={responseText[feedback.feedback_id] || ''}
                              onChange={(e) => setResponseText(prev => ({
                                ...prev,
                                [feedback.feedback_id]: e.target.value
                              }))}
                              placeholder="Type your response..."
                              rows="3"
                              className="w-full p-2.5 bg-[#2D2D2F]/50 text-white rounded-lg border border-purple-700/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10"
                            />
                            <button
                              onClick={() => handleResponse(feedback.feedback_id, feedback.user_email)}
                              disabled={isResponding[feedback.feedback_id] || !responseText[feedback.feedback_id]?.trim()}
                              className={`px-4 py-2 rounded-lg transition-colors ${
                                isResponding[feedback.feedback_id] || !responseText[feedback.feedback_id]?.trim()
                                  ? 'bg-purple-600/50 cursor-not-allowed'
                                  : 'bg-purple-600 hover:bg-purple-700'
                              } text-white`}
                            >
                              {isResponding[feedback.feedback_id] ? 'Sending...' : 'Send Response via Email'}
                            </button>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm text-purple-400">Response:</p>
                            <p className="text-white mt-2">{feedback.response}</p>
                            <button
                              onClick={() => {
                                const subject = encodeURIComponent('Follow-up to Your Feedback');
                                const body = encodeURIComponent(feedback.response);
                                window.open(`mailto:${feedback.user_email}?subject=${subject}&body=${body}`, '_blank');
                              }}
                              className="mt-2 text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1"
                            >
                              Send Follow-up Email
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {feedbackResponses.length === 0 && (
                    <div className="text-center text-purple-400 py-12">
                      No feedback responses yet
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}