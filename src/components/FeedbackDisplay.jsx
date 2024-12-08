import React from 'react';

export default function FeedbackDisplay({ feedbackData }) {
  if (!feedbackData || !feedbackData.analysis) return null;

  const { analysis } = feedbackData;
  const sentimentDistribution = analysis?.sentiment_analysis?.distribution || {};
  const totalSentiment = 100; // Always 100%

  return (
    <div className="space-y-6">
      {/* Sentiment Overview */}
      <div className="bg-[#1D1D1F] p-6 rounded-xl">
        <h2 className="text-xl font-semibold text-purple-400 mb-4">Sentiment Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Overall Sentiment</h3>
            <div className="flex items-center space-x-4">
              <div className="flex-1 bg-gray-700 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-full"
                  style={{ 
                    width: '100%',
                    background: `linear-gradient(to right, 
                      #ef4444 ${sentimentDistribution.negative}%, 
                      #eab308 ${sentimentDistribution.negative}% ${sentimentDistribution.negative + sentimentDistribution.neutral}%, 
                      #22c55e ${sentimentDistribution.negative + sentimentDistribution.neutral}%)`
                  }}
                />
              </div>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-red-400">{sentimentDistribution.negative}%</span>
              <span className="text-yellow-400">{sentimentDistribution.neutral}%</span>
              <span className="text-green-400">{sentimentDistribution.positive}%</span>
            </div>
          </div>

          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Total Reviews</h3>
            <p className="text-2xl font-semibold text-purple-300">
              {feedbackData.feedback_count || 0}
            </p>
          </div>

          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Sources</h3>
            <p className="text-2xl font-semibold text-purple-300">
              {feedbackData.feedback_data?.length || 0}
            </p>
          </div>
        </div>

        {/* Sentiment Distribution */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-green-400">Positive</span>
              <span className="text-xl font-semibold">
                {sentimentDistribution.positive}%
              </span>
            </div>
          </div>
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-yellow-400">Neutral</span>
              <span className="text-xl font-semibold">
                {sentimentDistribution.neutral}%
              </span>
            </div>
          </div>
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-red-400">Negative</span>
              <span className="text-xl font-semibold">
                {sentimentDistribution.negative}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Themes */}
      <div className="bg-[#1D1D1F] p-6 rounded-xl">
        <h2 className="text-xl font-semibold text-purple-400 mb-4">Key Themes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analysis?.key_themes?.map((theme, index) => (
            <div key={index} className="bg-[#2D2D2F] p-4 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-300">{theme.theme}</h3>
                <span className={`px-2 py-1 text-sm rounded ${
                  theme.sentiment === 'positive' ? 'bg-green-500/20 text-green-400' :
                  theme.sentiment === 'negative' ? 'bg-red-500/20 text-red-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {theme.mentions} mentions
                </span>
              </div>
              <p className="text-sm text-gray-400">{theme.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Key Drivers & Trends */}
      <div className="bg-[#1D1D1F] p-6 rounded-xl">
        <h2 className="text-xl font-semibold text-purple-400 mb-4">Key Insights</h2>
        <div className="space-y-4">
          {analysis?.sentiment_analysis?.key_drivers?.map((driver, index) => (
            <div key={index} className="bg-[#2D2D2F] p-4 rounded-lg">
              <h3 className="font-medium text-gray-300 mb-2">Key Driver {index + 1}</h3>
              <p className="text-gray-400">{driver}</p>
            </div>
          ))}
          {analysis?.sentiment_analysis?.trends?.map((trend, index) => (
            <div key={`trend-${index}`} className="bg-[#2D2D2F] p-4 rounded-lg">
              <h3 className="font-medium text-gray-300 mb-2">Trend {index + 1}</h3>
              <p className="text-gray-400">{trend}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pain Points */}
      <div className="bg-[#1D1D1F] p-6 rounded-xl">
        <h2 className="text-xl font-semibold text-purple-400 mb-4">Pain Points</h2>
        <div className="space-y-4">
          {analysis?.pain_points?.map((point, index) => (
            <div key={index} className="bg-[#2D2D2F] p-4 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-300">{point.issue}</h3>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 text-sm rounded ${
                    point.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                    point.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {point.severity}
                  </span>
                  <span className="px-2 py-1 text-sm bg-blue-500/20 text-blue-400 rounded">
                    {point.frequency} mentions
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-400">{point.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-[#1D1D1F] p-6 rounded-xl">
        <h2 className="text-xl font-semibold text-purple-400 mb-4">Recommendations</h2>
        <div className="space-y-4">
          {analysis?.recommendations?.map((rec, index) => (
            <div key={index} className="bg-[#2D2D2F] p-4 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-300">{rec.title}</h3>
                <span className={`px-2 py-1 text-sm rounded ${
                  rec.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                  rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {rec.priority} priority
                </span>
              </div>
              <p className="text-sm text-gray-400 mb-2">{rec.description}</p>
              <p className="text-sm text-purple-400">Expected Impact: {rec.expected_impact}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Feedback Sources */}
      <div className="bg-[#1D1D1F] p-6 rounded-xl mt-6">
        <h2 className="text-xl font-semibold text-purple-400 mb-4">Feedback Sources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {feedbackData.feedback_data?.map((source, index) => (
            <a
              key={index}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#2D2D2F] p-4 rounded-lg hover:bg-[#3D3D3F] transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-purple-400 font-medium">{source.source}</div>
                  <div className="text-sm text-gray-400 mt-1">Collected on {source.date}</div>
                </div>
                <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
                  View Source
                </span>
              </div>
              <div className="mt-3 text-sm text-gray-300 line-clamp-2">
                {source.content}
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
} 