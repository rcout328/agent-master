"use client";

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rzaukiglowabowqevpem.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6YXVraWdsb3dhYm93cWV2cGVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTgxODk3NDcsImV4cCI6MjAzMzc2NTc0N30.wSQnUlCio1DpXHj0xa5_6W6KjyUzXv4kKWyhpziUx_s'
);

export default function FeedbackForm() {
  const [formData, setFormData] = useState({
    user_email: '',
    rating: 5,
    category: 'Product',
    comments: '',
  });
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Error submitting feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white py-12">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Feedback Form</h1>
        
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
            Thank you for your feedback!
          </div>
        )}
      </div>
    </div>
  );
} 