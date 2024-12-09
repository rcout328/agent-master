"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// Initialize Supabase client
const supabase = createClient(
  'https://rzaukiglowabowqevpem.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6YXVraWdsb3dhYm93cWV2cGVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTgxODk3NDcsImV4cCI6MjAzMzc2NTc0N30.wSQnUlCio1DpXHj0xa5_6W6KjyUzXv4kKWyhpziUx_s'
);

export default function FeedbackCollectionContent() {
  const [viewMode, setViewMode] = useState('form'); // 'form' or 'responses'
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

  const handleResponse = async (feedbackId) => {
    if (!responseText[feedbackId]?.trim()) return;
    
    setIsResponding(prev => ({ ...prev, [feedbackId]: true }));
    try {
      const { error } = await supabase
        .from('feedback_form')
        .update({ 
          response: responseText[feedbackId],
          resolved: true 
        })
        .eq('feedback_id', feedbackId);

      if (error) throw error;
      
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
    <div className="min-h-screen bg-[#000000] text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <div className="bg-[#1D1D1F] p-1 rounded-xl inline-flex">
            <button 
              onClick={() => setViewMode('form')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'form' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Feedback Form
            </button>
            <button 
              onClick={() => setViewMode('responses')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'responses' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Responses
            </button>
            <Link 
              href="/feature-priority"
              className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-purple-600/50 transition-all duration-200"
            >
              Feature Priority
            </Link>
          </div>

          <button
            onClick={generateShareableLink}
            className="px-6 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors"
          >
            Generate Shareable Link
          </button>
        </div>

        {/* Shareable Link Section */}
        {shareableLink && (
          <div className="mb-8 p-4 bg-[#1D1D1F] rounded-xl">
            <div className="flex items-center justify-between">
              <input
                type="text"
                value={shareableLink}
                readOnly
                className="flex-1 bg-[#2D2D2F] text-gray-300 px-4 py-2 rounded-lg mr-4"
              />
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Copy Link
              </button>
            </div>
          </div>
        )}

        {viewMode === 'form' ? (
          // Feedback Form
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={formData.user_email}
                  onChange={(e) => setFormData({...formData, user_email: e.target.value})}
                  className="w-full px-4 py-2 bg-[#1D1D1F] rounded-lg border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Rating (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={formData.rating}
                  onChange={(e) => setFormData({...formData, rating: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 bg-[#1D1D1F] rounded-lg border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-4 py-2 bg-[#1D1D1F] rounded-lg border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                >
                  <option value="Product">Product</option>
                  <option value="Service">Service</option>
                  <option value="Bug Report">Bug Report</option>
                  <option value="Feature Request">Feature Request</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Comments
                </label>
                <textarea
                  required
                  value={formData.comments}
                  onChange={(e) => setFormData({...formData, comments: e.target.value})}
                  rows="4"
                  className="w-full px-4 py-2 bg-[#1D1D1F] rounded-lg border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full px-6 py-3 rounded-xl font-medium transition-colors ${
                  loading 
                    ? 'bg-purple-600/50 cursor-not-allowed' 
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {loading ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </form>

            {showSuccess && (
              <div className="mt-4 p-4 bg-green-500/20 border border-green-500 rounded-lg text-green-400">
                Feedback submitted successfully!
              </div>
            )}
          </div>
        ) : (
          // Feedback Responses
          <div className="grid gap-6">
            {feedbackResponses.map((feedback) => (
              <div 
                key={feedback.feedback_id}
                className="bg-[#1D1D1F] p-6 rounded-xl border border-gray-800"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-gray-300">{feedback.user_email}</p>
                    <p className="text-sm text-gray-500">
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
                    <span className="text-sm text-gray-400">Rating:</span>
                    <span className="text-purple-400 font-medium">{feedback.rating}/10</span>
                  </div>
                  <p className="text-gray-300">{feedback.comments}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-800">
                  {feedback.response ? (
                    <div>
                      <p className="text-sm text-gray-400">Response:</p>
                      <p className="text-gray-300 mt-2">{feedback.response}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <textarea
                        value={responseText[feedback.feedback_id] || ''}
                        onChange={(e) => setResponseText(prev => ({
                          ...prev,
                          [feedback.feedback_id]: e.target.value
                        }))}
                        placeholder="Type your response..."
                        rows="3"
                        className="w-full px-4 py-2 bg-[#2D2D2F] rounded-lg border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-300"
                      />
                      <button
                        onClick={() => handleResponse(feedback.feedback_id)}
                        disabled={isResponding[feedback.feedback_id] || !responseText[feedback.feedback_id]?.trim()}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          isResponding[feedback.feedback_id] || !responseText[feedback.feedback_id]?.trim()
                            ? 'bg-purple-600/50 cursor-not-allowed'
                            : 'bg-purple-600 hover:bg-purple-700'
                        } text-white`}
                      >
                        {isResponding[feedback.feedback_id] ? 'Sending...' : 'Send Response'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {feedbackResponses.length === 0 && (
              <div className="text-center text-gray-400 py-12">
                No feedback responses yet
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}