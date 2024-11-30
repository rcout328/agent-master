"use client";

import { useBusinessContext } from '../context/BusinessContext';

export default function BusinessInput({ analysisType }) {
  const { userInput, setUserInput, isConnected, isLoading, handleSubmit } = useBusinessContext();

  const onSubmit = (e) => {
    handleSubmit(e, analysisType);
  };

  return (
    <div className="max-w-7xl mx-auto mb-8">
      <div className="text-sm text-gray-500 text-center mb-4">
        {isConnected ? 
          <span className="text-green-500">●</span> : 
          <span className="text-red-500">●</span>
        } {isConnected ? 'Connected' : 'Disconnected'}
      </div>

      <form onSubmit={onSubmit} className="max-w-3xl mx-auto">
        <div className="mb-4">
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Enter your startup/business details here..."
            className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 h-32 resize-none text-black"
            disabled={!isConnected || isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={!isConnected || isLoading}
          className={`w-full p-4 rounded-lg font-medium transition-colors ${
            isConnected && !isLoading
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isLoading ? 'Analyzing...' : 'Analyze'}
        </button>
      </form>
    </div>
  );
} 