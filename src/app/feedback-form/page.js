"use client";

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rzaukiglowabowqevpem.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6YXVraWdsb3dhYm93cWV2cGVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTgxODk3NDcsImV4cCI6MjAzMzc2NTc0N30.wSQnUlCio1DpXHj0xa5_6W6KjyUzXv4kKWyhpziUx_s'
);

export default function FeedbackForm() {
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    user_email: '',
    rating: 5,
    category: 'Product',
    comments: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
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
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Error submitting feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Share Your Feedback
          </h1>
          <p className="mt-2 text-purple-400">
            We value your input to improve our products and services
          </p>
        </div>

        <div className="bg-[#1D1D1F]/80 backdrop-blur-xl rounded-xl shadow-xl p-8 border border-purple-800/50">
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
      </div>
    </div>
  );
} 