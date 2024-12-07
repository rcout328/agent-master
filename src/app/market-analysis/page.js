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

export default function MarketAnalysis() {
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

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex space-x-4">
          <button className="px-4 py-2 bg-[#1D1D1F] rounded-lg text-white">
            Market Trends
          </button>
          <button className="px-4 py-2 bg-transparent text-gray-400 hover:bg-[#1D1D1F] rounded-lg">
            Competitor Tracking
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <button className="px-4 py-2 bg-[#2D2D2F] text-gray-300 rounded-lg hover:bg-purple-600/20">
            Export
          </button>
          <button className="px-4 py-2 bg-[#2D2D2F] text-gray-300 rounded-lg hover:bg-purple-600/20">
            Share
          </button>
          <select 
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-4 py-2 bg-[#2D2D2F] text-gray-300 rounded-lg border-none outline-none"
          >
            <option value="ASIA">ASIA</option>
            <option value="EUROPE">EUROPE</option>
            <option value="USA">USA</option>
          </select>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold mb-8">Market Analysis for Incense sticks</h1>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Market Share Distribution */}
        <div className="bg-[#1D1D1F] p-6 rounded-xl">
          <h2 className="text-xl font-semibold mb-4">Market Share Distribution</h2>
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
                        color: '#fff'
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
                        color: '#fff'
                      }
                    },
                    x: {
                      grid: {
                        display: false
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

        {/* Market Growth Trend */}
        <div className="bg-[#1D1D1F] p-6 rounded-xl">
          <h2 className="text-xl font-semibold mb-4">Market Growth Trend</h2>
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
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                      color: '#fff'
                    }
                  },
                  x: {
                    grid: {
                      display: false
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
    </div>
  );
} 