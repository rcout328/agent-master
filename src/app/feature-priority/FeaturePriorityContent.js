"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function FeaturePriorityContent() {
  const [features, setFeatures] = useState([]);
  const [newFeature, setNewFeature] = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('pending');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCompleted, setShowCompleted] = useState(true);

  const priorities = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500'
  };

  const addFeature = (e) => {
    e.preventDefault();
    if (!newFeature.trim()) return;

    const feature = {
      id: Date.now(),
      title: newFeature,
      priority,
      status: 'pending',
      createdAt: new Date().toISOString(),
      completedAt: null,
      progress: 0
    };

    setFeatures(prev => [feature, ...prev]);
    setNewFeature('');
  };

  const updateStatus = (id, newStatus) => {
    setFeatures(prev => prev.map(feature => {
      if (feature.id === id) {
        return {
          ...feature,
          status: newStatus,
          completedAt: newStatus === 'completed' ? new Date().toISOString() : null,
          progress: newStatus === 'completed' ? 100 : feature.progress
        };
      }
      return feature;
    }));
  };

  const updateProgress = (id, progress) => {
    setFeatures(prev => prev.map(feature => {
      if (feature.id === id) {
        return {
          ...feature,
          progress: Math.min(100, Math.max(0, progress)),
          status: progress >= 100 ? 'completed' : 'in-progress'
        };
      }
      return feature;
    }));
  };

  const deleteFeature = (id) => {
    setFeatures(prev => prev.filter(feature => feature.id !== id));
  };

  const filteredFeatures = features.filter(feature => {
    if (!showCompleted && feature.status === 'completed') return false;
    if (filterStatus === 'all') return true;
    return feature.status === filterStatus;
  });

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Feature Priority
          </h1>
        </div>

        <div className="mb-10 flex justify-center">
          <div className="bg-[#1D1D1F]/60 backdrop-blur-xl p-1.5 rounded-xl inline-flex shadow-xl">
            <button className="px-8 py-2.5 rounded-lg transition-all duration-300 bg-purple-600/90 text-white">
              Feature Priority
            </button>
            <Link 
              href="/feedback-collection"
              className="px-8 py-2.5 rounded-lg text-white hover:text-white hover:bg-white/5"
            >
              Feedback Collection
            </Link>
          </div>
        </div>

        {/* Add Feature Form */}
        <div className="space-y-8">
          <div className="bg-[#1D1D1F]/80 backdrop-blur-xl rounded-xl shadow-xl p-8 border border-purple-800/50">
            <form onSubmit={addFeature} className="grid grid-cols-2 gap-8">
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium text-purple-400">Feature Title</label>
                <input
                  type="text"
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  placeholder="Add new feature..."
                  className="w-full p-2.5 bg-[#2D2D2F]/50 text-white rounded-lg border border-purple-700/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-400">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full p-2.5 bg-[#2D2D2F]/50 text-white rounded-lg border border-purple-700/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10"
                >
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-400">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full p-2.5 bg-[#2D2D2F]/50 text-white rounded-lg border border-purple-700/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10"
                >
                  <option value="all">All Features</option>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="col-span-2">
                <button
                  type="submit"
                  className="w-full px-6 py-2.5 rounded-lg font-medium bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
                >
                  Add Feature
                </button>
              </div>
            </form>
          </div>

          {/* Features List */}
          <div className="bg-[#1D1D1F]/80 backdrop-blur-xl rounded-xl shadow-xl border border-purple-800/50">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                  Feature List
                </h2>
                <label className="flex items-center gap-2 text-white">
                  <input
                    type="checkbox"
                    checked={showCompleted}
                    onChange={(e) => setShowCompleted(e.target.checked)}
                    className="form-checkbox bg-[#2D2D2F] border-purple-700 rounded text-purple-600"
                  />
                  Show Completed
                </label>
              </div>

              <AnimatePresence>
                {filteredFeatures.map(feature => (
                  <motion.div
                    key={feature.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="mb-4 bg-[#2D2D2F]/50 rounded-xl overflow-hidden border border-purple-800/50"
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className={`w-3 h-3 rounded-full ${priorities[feature.priority]}`} />
                          <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <select
                            value={feature.status}
                            onChange={(e) => updateStatus(feature.id, e.target.value)}
                            className="bg-[#1D1D1F] text-white px-3 py-1 rounded-lg border border-purple-700/50 text-sm"
                          >
                            <option value="pending">Pending</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                          <button
                            onClick={() => deleteFeature(feature.id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="relative pt-1">
                        <div className="flex mb-2 items-center justify-between">
                          <div>
                            <span className="text-xs font-semibold inline-block text-purple-400">
                              Progress
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-semibold inline-block text-purple-400">
                              {feature.progress}%
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="flex-1 mr-4">
                            <div className="h-2 rounded-full bg-[#1D1D1F]">
                              <motion.div
                                className="h-2 rounded-full bg-purple-600"
                                initial={{ width: 0 }}
                                animate={{ width: `${feature.progress}%` }}
                                transition={{ duration: 0.5 }}
                              />
                            </div>
                          </div>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={feature.progress}
                            onChange={(e) => updateProgress(feature.id, parseInt(e.target.value))}
                            className="w-16 bg-[#1D1D1F] text-white px-2 py-1 rounded-lg border border-purple-700/50 text-sm"
                          />
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="mt-4 text-xs text-purple-400">
                        Created: {new Date(feature.createdAt).toLocaleString()}
                        {feature.completedAt && (
                          <span className="ml-4">
                            Completed: {new Date(feature.completedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {filteredFeatures.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 text-purple-400"
                >
                  No features found
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}