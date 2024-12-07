"use client";

import { useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function MarketTrends({ onClose }) {
  const [selectedRegion, setSelectedRegion] = useState('ASIA');

  // Market Share Distribution data
  const marketShareData = {
    labels: ['Cycle Pure', 'Mangaldeep', 'Mysore Sugandhi', 'Others'],
    datasets: [{
      data: [35, 28, 20, 17],
      backgroundColor: [
        '#4169E1',  // Blue
        '#90EE90',  // Green
        '#DC143C',  // Red
        '#FFA500',  // Orange
      ],
    }]
  };

  // Market Growth Trend data
  const growthTrendData = {
    labels: ['2020', '2021', '2022', '2023', '2024'],
    datasets: [{
      label: 'Market Size (Million USD)',
      data: [150, 180, 220, 280, 320],
      borderColor: '#4169E1',
      tension: 0.4,
      pointBackgroundColor: '#4169E1',
    }]
  };

  const targetAudience = [
    {
      title: "Religious Consumers",
      description: "Traditional users seeking authentic products for religious ceremonies"
    },
    {
      title: "Wellness Enthusiasts",
      description: "Modern consumers using incense for meditation and aromatherapy"
    },
    {
      title: "Home Decorators",
      description: "Style-conscious users seeking premium fragrances for ambiance"
    }
  ];

  const trends = [
    {
      icon: "🌍",
      title: "Global Expansion",
      description: "Enter new international markets through strategic partnerships and localized product offerings for the consumer",
      metric: "25% Growth Potential"
    },
    {
      icon: "📱",
      title: "Digital Transformation",
      description: "Implement AR/VR experiences for product visualization and mobile-first e-commerce platform",
      metric: "40% Digital Engagement"
    },
    {
      icon: "🌱",
      title: "Sustainability Initiative",
      description: "Launch eco-friendly product lines with carbon-neutral manufacturing processes",
      metric: "30% Carbon Reduction"
    },
    {
      icon: "👥",
      title: "Customer Experience",
      description: "Enhance customer journey through personalized recommendations and loyalty programs",
      metric: "85% Satisfaction Rate"
    }
  ];

  const competitiveInsights = [
    {
      company: "Cycle Pure Agarbatti",
      strengths: "Market leader, premium products",
      challenges: "Competition in affordable segments"
    },
    {
      company: "Mangaldeep Agarbatti",
      strengths: "Affordable pricing, mass appeal",
      challenges: "Limited premium offerings"
    },
    {
      company: "Moksh Agarbatti",
      strengths: "Sustainability focus",
      challenges: "Smaller market presence"
    },
    {
      company: "Tirupati Industries",
      strengths: "Cost-effective, bulk options",
      challenges: "Low differentiation"
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top Navigation */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex space-x-3">
              <button className="px-5 py-2.5 bg-[#1D1D1F] rounded-xl text-white font-medium">
                Market Trends
              </button>
              <button className="px-5 py-2.5 text-gray-400 hover:bg-[#1D1D1F] rounded-xl font-medium transition-colors">
                Competitor Tracking
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <button 
                onClick={onClose}
                className="px-5 py-2.5 bg-[#1D1D1F] text-gray-300 rounded-xl hover:bg-red-600/20 transition-colors font-medium"
              >
                Close Analysis
              </button>
              <button className="px-5 py-2.5 bg-[#1D1D1F] text-gray-300 rounded-xl hover:bg-[#2D2D2F] transition-colors font-medium">
                Get a Report
              </button>
              <select 
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="px-5 py-2.5 bg-[#1D1D1F] text-gray-300 rounded-xl border-none outline-none font-medium cursor-pointer"
              >
                <option value="ASIA">ASIA</option>
                <option value="EUROPE">EUROPE</option>
                <option value="USA">USA</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-10">
        {/* Title */}
        <h1 className="text-3xl font-bold">Market Analysis for Incense sticks</h1>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Market Share Distribution */}
          <div className="bg-[#1D1D1F] p-8 rounded-2xl">
            <h2 className="text-xl font-semibold mb-6">Market Share Distribution</h2>
            <div className="h-[400px] flex items-center justify-center">
              <div className="w-full max-w-md">
                <Bar 
                  data={marketShareData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: true,
                        position: 'right',
                        labels: {
                          color: '#fff',
                          padding: 20,
                          font: {
                            size: 12
                          }
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: {
                          color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                          color: '#fff',
                          callback: value => `${value}%`
                        }
                      },
                      x: {
                        display: false
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Market Growth Trend */}
          <div className="bg-[#1D1D1F] p-8 rounded-2xl">
            <h2 className="text-xl font-semibold mb-6">Market Growth Trend</h2>
            <div className="h-[400px]">
              <Line 
                data={growthTrendData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    y: {
                      grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                      },
                      ticks: {
                        color: '#fff',
                        callback: value => `${value}M USD`
                      }
                    },
                    x: {
                      grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                      },
                      ticks: {
                        color: '#fff'
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Insight Section */}
        <div className="bg-[#1D1D1F] p-8 rounded-2xl">
          <h2 className="text-xl font-semibold mb-4">Insight</h2>
          <p className="text-gray-300 leading-relaxed">
            Cycle Pure Agarbatti dominates the market with half of the total market share, followed by Mangaldeep 
            Agarbatti, which holds a significant portion as well. Moksh and Tirupati Industries share an equal but smaller 
            stake in the market.
          </p>
        </div>

        {/* Target Audience Section */}
        <div>
          <h2 className="text-xl font-semibold mb-6">Target Audience</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {targetAudience.map((target, index) => (
              <div key={index} className="bg-[#1D1D1F] p-8 rounded-2xl">
                <h3 className="text-lg font-medium mb-3">{target.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{target.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Trends Section */}
        <div>
          <h2 className="text-xl font-semibold mb-6">Trends Shaping Their Market Strategy</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trends.map((trend, index) => (
              <div key={index} className="bg-[#1D1D1F] p-8 rounded-2xl">
                <div className="flex items-start space-x-5">
                  <span className="text-3xl">{trend.icon}</span>
                  <div>
                    <h3 className="text-lg font-medium mb-3">{trend.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-3">{trend.description}</p>
                    <span className="text-blue-400 text-sm font-medium">{trend.metric}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Competitive Insights Section */}
        <div>
          <h2 className="text-xl font-semibold mb-6">Competitive Insights</h2>
          <div className="bg-[#1D1D1F] rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-8 py-5 text-left font-medium">Company</th>
                  <th className="px-8 py-5 text-left font-medium">Strengths</th>
                  <th className="px-8 py-5 text-left font-medium">Challenges</th>
                </tr>
              </thead>
              <tbody>
                {competitiveInsights.map((insight, index) => (
                  <tr key={index} className="border-b border-gray-800 last:border-0">
                    <td className="px-8 py-5">{insight.company}</td>
                    <td className="px-8 py-5 text-green-400">{insight.strengths}</td>
                    <td className="px-8 py-5 text-red-400">{insight.challenges}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}