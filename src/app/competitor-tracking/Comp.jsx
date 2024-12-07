"use client";

import { useState } from 'react';
import { Bar } from 'react-chartjs-2';

export default function CompetitorTracking({ onClose }) {
  const [selectedRegion, setSelectedRegion] = useState('ASIA');
  const [searchQuery, setSearchQuery] = useState('');

  // Growth Analysis Chart Data
  const growthChartData = {
    labels: ['Market Share', 'Revenue', 'Units Sold'],
    datasets: [{
      data: [50, -2.94, 5],
      backgroundColor: ['#FFD700', '#FF4444', '#4CAF50'],
      barThickness: 20,
    }]
  };

  // Profitability Analysis Chart Data
  const profitabilityChartData = {
    labels: ['Net Profit', 'EBITDA', 'Cost-to-Revenue'],
    datasets: [{
      data: [18, 25, 70],
      backgroundColor: ['#4CAF50', '#2196F3', '#FF4444'],
      barThickness: 20,
    }]
  };

  // Competitor Cards Data
  const competitors = [
    {
      name: "CYCLE",
      logo: "/cycle-logo.png",
      change: "-2.94%",
      value: "₹251 CR",
      description: "Cycle offers a wide range of Agarbatti and Incense collections, including Dhoop & Sambrani, Home & Personal Care, Bambooless Incense, Karpure, and Puja Samagri.",
      metrics: {
        growth: {
          market_share: "50%",
          revenue: "-2.94%",
          units_sold: "+5%"
        },
        profitability: {
          net_profit_margin: "18%",
          ebitda_margin: "25%",
          cost_to_revenue: "70%"
        },
        operational: {
          distribution_reach: "50 DCs",
          production_efficiency: "85%",
          avg_delivery_time: "3 Days"
        },
        customer: {
          retention_rate: "75%",
          acquisition_cost: "₹1200",
          lifetime_value: "₹15,000"
        },
        brand: {
          brand_equity: "82",
          market_awareness: "65%",
          online_sentiment: "80%"
        },
        sustainability: {
          carbon_footprint: "250",
          sustainable_products: "40%",
          waste_recycling: "60%"
        }
      }
    }
  ];

  const CompetitorCard = ({ competitor }) => (
    <div className="bg-gradient-to-br from-[#1D1D1F] to-[#2D2D2F] rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-8 border-b border-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 p-2 rounded-xl">
              <img src={competitor.logo} alt={competitor.name} className="w-12 h-12 rounded-lg" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                {competitor.name}
              </h2>
              <p className="text-gray-400 text-sm mt-1">{competitor.description}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-red-500 text-lg font-medium">{competitor.change}</div>
            <div className="text-gray-400 text-sm">{competitor.value}</div>
          </div>
        </div>
      </div>

      {/* Analysis Charts */}
      <div className="grid grid-cols-2 gap-px">
        {/* Growth Analysis */}
        <div className="bg-[#1D1D1F] p-6">
          <h3 className="text-sm font-semibold mb-6 text-gray-300">Growth Analysis</h3>
          <div className="h-[200px]">
            <Bar data={growthChartData} options={chartOptions} />
          </div>
        </div>

        {/* Profitability Analysis */}
        <div className="bg-[#1D1D1F] p-6">
          <h3 className="text-sm font-semibold mb-6 text-gray-300">Profitability Analysis</h3>
          <div className="h-[200px]">
            <Bar data={profitabilityChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-px bg-gray-800/50">
        {/* Operational Metrics */}
        <MetricsSection
          title="OPERATIONAL"
          metrics={[
            { label: "Distribution Reach", value: competitor.metrics.operational.distribution_reach },
            { label: "Production Efficiency", value: competitor.metrics.operational.production_efficiency },
            { label: "Avg Delivery Time", value: competitor.metrics.operational.avg_delivery_time }
          ]}
        />

        {/* Customer Metrics */}
        <MetricsSection
          title="CUSTOMER METRICS"
          metrics={[
            { label: "Retention Rate", value: competitor.metrics.customer.retention_rate },
            { label: "Acquisition Cost", value: competitor.metrics.customer.acquisition_cost },
            { label: "Lifetime Value", value: competitor.metrics.customer.lifetime_value }
          ]}
        />

        {/* Brand Metrics */}
        <MetricsSection
          title="BRAND METRICS"
          metrics={[
            { label: "Brand Equity", value: competitor.metrics.brand.brand_equity },
            { label: "Market Awareness", value: competitor.metrics.brand.market_awareness },
            { label: "Online Sentiment", value: competitor.metrics.brand.online_sentiment }
          ]}
        />
      </div>
    </div>
  );

  const MetricsSection = ({ title, metrics }) => (
    <div className="bg-[#1D1D1F] p-6">
      <h3 className="text-sm font-semibold mb-4 text-gray-300">{title}</h3>
      <div className="space-y-4">
        {metrics.map((metric, index) => (
          <div key={index} className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">{metric.label}</span>
            <span className="text-sm font-medium text-white">{metric.value}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const chartOptions = {
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
          color: '#9CA3AF'
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#9CA3AF'
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top Navigation */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex space-x-3">
              <button className="px-5 py-2.5 text-gray-400 hover:bg-[#1D1D1F] rounded-xl font-medium transition-colors">
                Market Trends
              </button>
              <button className="px-5 py-2.5 bg-[#1D1D1F] rounded-xl text-white font-medium">
                Competitor Tracking
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for Competitors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 px-4 py-2 bg-[#1D1D1F] border border-gray-800 rounded-xl 
                           text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button 
                onClick={onClose}
                className="px-5 py-2.5 bg-[#1D1D1F] text-gray-300 rounded-xl hover:bg-red-600/20 transition-colors font-medium"
              >
                Close Analysis
              </button>
              <button className="px-5 py-2.5 bg-[#1D1D1F] text-gray-300 rounded-xl hover:bg-[#2D2D2F] transition-colors font-medium">
                Export
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
      <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Competitor Tracking Analysis
        </h1>
        
        {/* Competitor Cards */}
        <div className="grid grid-cols-1 gap-8">
          {competitors.map((competitor, index) => (
            <CompetitorCard key={index} competitor={competitor} />
          ))}
            {competitors.map((competitor, index) => (
            <CompetitorCard key={index} competitor={competitor} />
          ))}
            {competitors.map((competitor, index) => (
            <CompetitorCard key={index} competitor={competitor} />
          ))}
        </div>
      </div>
    </div>
  );
}
