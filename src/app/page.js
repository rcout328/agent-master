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

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');

  // Recent Activity data
  const recentActivity = [
    { name: 'Cycle', price: '₹29.99', change: '-2.94%', logo: '/cycle-logo.png' },
    { name: 'Moksh', price: '₹29.99', change: '-2.94%', logo: '/moksh-logo.png' },
    { name: 'Lotus', price: '₹29.99', change: '-2.94%', logo: '/lotus-logo.png' }
  ];

  // Market Share data
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

  // Latest Strategy data
  const strategyUpdates = [
    {
      title: 'Market Trends',
      description: 'Demand for eco-friendly agarbattis increased by 15% this quarter.'
    },
    {
      title: 'Upcoming Opportunities',
      description: 'Festive season (Diwali) expected to increase agarbatti sales by 20%.'
    },
    {
      title: 'Competitor Alerts',
      description: 'Tirupati Industries is investing heavily in rural distribution.'
    },
    {
      title: 'Performance Tracking',
      description: 'Achieve 55% market share in Tier 1 cities by Q4.'
    },
    {
      title: 'Marketing Insights',
      description: 'Instagram campaign increased customer engagement by 25%.'
    },
    {
      title: 'Digital Marketing',
      description: 'Invest in digital marketing for urban regions to boost sales by 10%.'
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Search and Notification Bar */}
      <div className="flex justify-between items-center mb-8">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search for Competitors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-[#1D1D1F] border border-purple-500/30 rounded-xl 
                     text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 rounded-lg bg-[#1D1D1F] text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Recent Activity Cards */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recentActivity.map((item, index) => (
            <div key={index} className="bg-[#1D1D1F] p-4 rounded-xl flex items-center justify-between hover:bg-[#2D2D2F] transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <img src={item.logo} alt={item.name} className="w-6 h-6" />
                </div>
                <span className="font-medium">{item.name}</span>
              </div>
              <div className="text-right">
                <div className="font-medium">{item.price}</div>
                <div className="text-red-500 text-sm">{item.change}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Market Share Chart */}
        <div className="lg:col-span-2 bg-[#1D1D1F] p-6 rounded-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Your Competitors</h3>
            <div className="flex space-x-4">
              <button className="px-4 py-2 bg-[#2D2D2F] text-gray-300 rounded-lg hover:bg-purple-600/20 transition-colors">
                Get a Report
              </button>
              <select className="px-4 py-2 bg-[#2D2D2F] text-gray-300 rounded-lg border-none outline-none">
                <option>Valuation</option>
              </select>
              <select className="px-4 py-2 bg-[#2D2D2F] text-gray-300 rounded-lg border-none outline-none">
                <option>Yearly</option>
              </select>
            </div>
          </div>
          <div className="h-[400px]">
            <Bar 
              data={marketShareData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: true,
                    position: 'right',
                    labels: { color: '#fff' }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#fff' }
                  },
                  x: {
                    grid: { display: false },
                    ticks: { color: '#fff' }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Latest Strategy */}
        <div className="bg-[#1D1D1F] p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-4">Latest Strategy</h3>
          <div className="space-y-4">
            {strategyUpdates.map((update, index) => (
              <div key={index} className="border-b border-gray-800 pb-4 last:border-0">
                <h4 className="text-sm font-medium text-gray-300 mb-1">{update.title}</h4>
                <p className="text-sm text-gray-400">{update.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}