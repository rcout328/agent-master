"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AgentChatInterface from '@/components/AgentChatInterface';

// Create a wrapper component that uses useSearchParams
function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showTransition, setShowTransition] = useState(true);
  const [showNotification, setShowNotification] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('');

  // Define agent selection logic based on prompt content
  const selectAppropriateAgent = (prompt) => {
    if (prompt.includes('market trends')) {
      return 'Market Analysis Agent';
    } else if (prompt.includes('competitor')) {
      return 'Competitor Analysis Agent';
    } else if (prompt.includes('sentiment')) {
      return 'Sentiment Analysis Agent';
    } else if (prompt.includes('impact assessment')) {
      return 'Impact Analysis Agent';
    } else if (prompt.includes('gap analysis')) {
      return 'Gap Analysis Agent';
    } else if (prompt.includes('ICP')) {
      return 'ICP Analysis Agent';
    }
    return 'CEO Agent'; // Default agent
  };

  useEffect(() => {
    const prompt = searchParams.get('prompt');
    if (!prompt) {
      router.push('/market-trends');
      return;
    }

    // Select appropriate agent based on prompt
    const agent = selectAppropriateAgent(prompt.toLowerCase());
    setSelectedAgent(agent);
    setShowNotification(true);

    // Hide notification after 25 seconds
    setTimeout(() => {
      setShowNotification(false);
    }, 25000);

    // Show transition screen for 2 seconds
    setTimeout(() => {
      setShowTransition(false);
    }, 2000);
  }, []);

  if (!showTransition) {
    return (
      <>
        {showNotification && (
          <div className="fixed top-4 right-4 z-50 animate-slide-left">
            <div className="bg-[#1D1D1F]/95 backdrop-blur-xl rounded-xl p-6 border border-purple-800/50 shadow-2xl max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Solo Task Assignment</h3>
                  <p className="text-sm text-purple-400">Specialized agent selected for your task</p>
                </div>
              </div>

              <div className="mb-4 p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span className="text-green-400 text-sm font-medium">Assigned Specialist</span>
                </div>
                <p className="text-white font-medium text-lg mb-2">{selectedAgent}</p>
                <p className="text-sm text-purple-400">
                  {selectedAgent === 'Market Analysis Agent' && 'Specialized in comprehensive market trends analysis and industry insights. Focused on delivering detailed market intelligence.'}
                  {selectedAgent === 'Competitor Analysis Agent' && 'Expert in analyzing competitive landscapes and market positioning. Focused on strategic competitor evaluation.'}
                  {selectedAgent === 'Sentiment Analysis Agent' && 'Dedicated to processing and analyzing feedback data with advanced sentiment analysis capabilities.'}
                  {selectedAgent === 'Impact Analysis Agent' && 'Specialized in measuring and evaluating business impact metrics with detailed assessment methodology.'}
                  {selectedAgent === 'Gap Analysis Agent' && 'Expert in identifying market gaps and opportunities with precise analytical approach.'}
                  {selectedAgent === 'ICP Analysis Agent' && 'Focused on creating detailed ideal customer profiles with demographic and behavioral analysis.'}
                  {selectedAgent === 'CEO Agent' && 'Strategic oversight and high-level business analysis with comprehensive approach.'}
                </p>
              </div>

              <div className="mb-3 flex items-center gap-2 text-sm text-purple-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Initiating specialized analysis process</span>
              </div>

              <div className="h-1.5 bg-[#2D2D2F] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 w-0 animate-progress"></div>
              </div>
            </div>
          </div>
        )}
        <AgentChatInterface />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="bg-[#1D1D1F]/95 backdrop-blur-xl rounded-xl p-8 border border-purple-800/50 shadow-2xl max-w-lg w-full mx-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-white">Initializing AI Agent</h2>
            <p className="text-purple-400">Preparing your personalized analysis environment...</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="h-2 bg-[#2D2D2F] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 w-2/3 animate-pulse"></div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-purple-400">Establishing secure connection...</span>
            <span className="text-green-400">67%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrap the content in Suspense in the main component
export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  );
}