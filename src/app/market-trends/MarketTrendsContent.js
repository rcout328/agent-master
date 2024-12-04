"use client";

import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const formatMetric = (value, type) => {
  if (type === 'percentage') return `${value}%`;
  if (type === 'money') {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    return `$${value.toLocaleString()}`;
  }
  return value;
};

const renderSection = (title, data, metrics) => {
  if (!data) return null;

  return (
    <div className="mb-8">
      <h3 className="text-xl font-semibold text-purple-400 mb-4">{title}</h3>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Object.entries(data).map(([key, items]) => (
          <div key={key} className="bg-[#2D2D2F] rounded-xl p-6">
            <h4 className="font-medium text-white mb-3 text-lg">
              {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </h4>
            <ul className="space-y-3">
              {Array.isArray(items) ? items.map((item, i) => (
                <li key={i} className="flex items-start space-x-2">
                  <span className="text-gray-300 flex-grow">{item}</span>
                  {metrics && metrics[key] && metrics[key][i] && (
                    <span className="text-purple-400 font-medium">
                      {formatMetric(metrics[key][i], key.includes('percentage') ? 'percentage' : 'money')}
                    </span>
                  )}
                </li>
              )) : (
                <li className="text-gray-400">No data available</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

const MarketShareChart = ({ data }) => {
  if (!data?.market_share) return null;

  const chartData = {
    labels: Object.keys(data.market_share),
    datasets: [{
      label: 'Market Share (%)',
      data: Object.values(data.market_share),
      backgroundColor: [
        'rgba(147, 51, 234, 0.5)',  // purple
        'rgba(59, 130, 246, 0.5)',  // blue
        'rgba(16, 185, 129, 0.5)',  // green
        'rgba(245, 158, 11, 0.5)',  // yellow
        'rgba(239, 68, 68, 0.5)',   // red
      ],
      borderColor: [
        'rgb(147, 51, 234)',
        'rgb(59, 130, 246)',
        'rgb(16, 185, 129)',
        'rgb(245, 158, 11)',
        'rgb(239, 68, 68)',
      ],
      borderWidth: 1
    }]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'rgb(156, 163, 175)'  // gray-400
        }
      },
      title: {
        display: true,
        text: 'Market Share Distribution',
        color: 'rgb(156, 163, 175)'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: 'rgb(156, 163, 175)'
        },
        grid: {
          color: 'rgba(31, 41, 55, 0.2)'  // gray-800 with opacity
        }
      },
      x: {
        ticks: {
          color: 'rgb(156, 163, 175)'
        },
        grid: {
          color: 'rgba(31, 41, 55, 0.2)'
        }
      }
    }
  };

  return (
    <div className="bg-[#2D2D2F] rounded-xl p-6 mb-8">
      <Bar data={chartData} options={options} />
    </div>
  );
};

const AnalysisMetadata = ({ metadata }) => {
  if (!metadata) return null;

  return (
    <div className="bg-[#2D2D2F] rounded-xl p-6 mb-6">
      <h4 className="font-medium text-white mb-4">Analysis Quality Metrics</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-gray-400 text-sm">Confidence Score</p>
          <p className={`text-lg font-medium ${metadata.confidence_score === 'High' ? 'text-green-400' : 'text-yellow-400'}`}>
            {metadata.confidence_score}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Data Points</p>
          <p className="text-lg font-medium text-purple-400">{metadata.data_points}</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Data Quality</p>
          <p className={`text-lg font-medium ${metadata.data_quality === 'High' ? 'text-green-400' : 'text-yellow-400'}`}>
            {metadata.data_quality}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Coverage</p>
          <div className="flex space-x-2">
            {Object.entries(metadata.coverage).map(([key, value]) => (
              <span key={key} className={`px-2 py-1 rounded text-xs ${value ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {key.split('_').map(word => word.charAt(0).toUpperCase()).join('')}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Added renderSourcesSection function to resolve ReferenceError
const renderSourcesSection = (sources) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="bg-[#2D2D2F] rounded-xl p-6 mb-6">
      <h4 className="font-medium text-white mb-4">Sources</h4>
      <ul className="space-y-2">
        {sources.map((source, index) => (
          <li key={index} className="text-gray-300">
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">
              {source.domain} - {source.section} (Date: {source.date})
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default function MarketTrendsContent() {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [apiResponse, setApiResponse] = useState(() => {
    if (typeof window !== 'undefined') {
      const storedData = localStorage.getItem('marketTrendsData');
      return storedData ? JSON.parse(storedData) : null;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPhase, setCurrentPhase] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && apiResponse) {
      localStorage.setItem('marketTrendsData', JSON.stringify(apiResponse));
    }
  }, [apiResponse]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setCurrentPhase(1);

    try {
        console.log('Starting market analysis for:', searchQuery);

        // Call our backend API instead of Brightdata directly
        const response = await fetch('http://localhost:5000/api/market-trends', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: searchQuery })
        });

        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }

        const data = await response.json();
        console.log('API Response:', data);

        // Process the data into our format
        const processedData = {
            market_size_growth: {
                total_market_value: [
                    `Total Companies: ${data.length} companies`,
                    `Market Leader: ${data[0]?.name || 'N/A'}`,
                    `Industry Size: ${calculateMarketSize(data)}`
                ],
                market_segments: extractIndustries(data),
                regional_distribution: extractRegions(data)
            },
            competitive_landscape: {
                market_leaders: extractTopCompanies(data),
                market_differentiators: extractDifferentiators(data),
                industry_dynamics: extractDynamics(data)
            },
            industry_trends: {
                current_trends: extractTrends(data),
                technology_impact: extractTechImpact(data),
                regulatory_environment: extractRegulations(data)
            },
            growth_forecast: {
                short_term: extractShortTermGrowth(data),
                long_term: extractLongTermGrowth(data)
            },
            metrics: {
                market_share: calculateMarketShare(data),
                growth_rates: calculateGrowthRates(data),
                revenue: extractRevenue(data)
            },
            sources: extractSources(data)
        };

        setApiResponse(processedData);
        localStorage.setItem('marketTrendsData', JSON.stringify(processedData));

    } catch (error) {
        console.error('API Error:', error);
        setError(`Failed to get market trends data: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  // Helper functions to process Crunchbase data
  const calculateAverageEmployees = (data) => {
    const employeeRanges = data.map(company => company.num_employees).filter(Boolean);
    // Convert ranges like "1-10" to average numbers
    const averages = employeeRanges.map(range => {
        const [min, max] = range.split('-').map(Number);
        return (min + max) / 2;
    });
    const average = averages.reduce((a, b) => a + b, 0) / averages.length;
    return `${Math.round(average)} employees average`;
  };

  const extractIndustries = (data) => {
    const industries = new Set();
    data.forEach(company => {
        company.industries?.forEach(industry => industries.add(industry.value));
    });
    return Array.from(industries).map(industry => `${industry} Sector`);
  };

  const extractRegions = (data) => {
    const regions = new Set();
    data.forEach(company => {
        if (company.region) regions.add(company.region);
    });
    return Array.from(regions).map(region => `${region} Market`);
  };

  const extractTopCompanies = (data) => {
    return data.slice(0, 5).map(company => 
        `${company.name}: ${company.about || 'No description available'}`
    );
  };

  const extractDifferentiators = (data) => {
    return data.slice(0, 3).map(company => 
        `${company.name}: ${company.industries?.map(i => i.value).join(', ')}`
    );
  };

  const extractDynamics = (data) => {
    return [
        `Market Leaders: ${data.filter(c => c.cb_rank < 1000).length} companies`,
        `Emerging Players: ${data.filter(c => c.cb_rank >= 1000).length} companies`,
        `Average Company Age: ${calculateAverageAge(data)} years`
    ];
  };

  const calculateAverageAge = (data) => {
    const currentYear = new Date().getFullYear();
    const foundingYears = data
        .map(company => company.founded_date?.split('-')[0])
        .filter(Boolean)
        .map(Number);
    
    const average = foundingYears.reduce((a, b) => a + (currentYear - b), 0) / foundingYears.length;
    return Math.round(average);
  };

  const extractTrends = (data) => {
    const trends = new Set();
    data.forEach(company => {
        if (company.full_description) {
            // Extract key phrases that might indicate trends
            const description = company.full_description.toLowerCase();
            if (description.includes('ai')) trends.add('AI Integration');
            if (description.includes('machine learning')) trends.add('Machine Learning Adoption');
            if (description.includes('cloud')) trends.add('Cloud Computing');
        }
    });
    return Array.from(trends);
  };

  const calculateMarketShare = (data) => {
    const total = data.length;
    return data.slice(0, 5).reduce((acc, company) => {
        acc[company.name] = (1 / total) * 100;
        return acc;
    }, {});
  };

  const extractSources = (data) => {
    return data.slice(0, 5).map(company => ({
        url: company.url || '',
        domain: 'crunchbase.com',
        section: 'Market Analysis',
        date: new Date().toISOString().split('T')[0]
    }));
  };

  // Add these missing helper functions
  const extractTechImpact = (data) => {
    const techImpacts = new Set();
    data.forEach(company => {
        if (company.builtwith_tech) {
            techImpacts.add('Technology Stack Integration');
        }
        if (company.active_tech_count > 20) {
            techImpacts.add('High Tech Adoption');
        }
        if (company.monthly_visits_growth > 0) {
            techImpacts.add('Growing Online Presence');
        }
    });
    return Array.from(techImpacts);
  };

  const extractShortTermGrowth = (data) => {
    return [
        `Monthly Traffic Growth: ${calculateAverageGrowth(data)}%`,
        `New Market Entrants: ${countRecentCompanies(data)} companies`,
        `Technology Adoption Rate: ${calculateTechAdoption(data)}%`
    ];
  };

  const extractLongTermGrowth = (data) => {
    return [
        `Market Maturity: ${calculateMarketMaturity(data)}`,
        `Industry Consolidation: ${calculateConsolidation(data)}`,
        `Innovation Index: ${calculateInnovationIndex(data)}`
    ];
  };

  const calculateGrowthRates = (data) => {
    const growthRates = {};
    data.slice(0, 5).forEach(company => {
        if (company.monthly_visits_growth) {
            growthRates[company.name] = company.monthly_visits_growth * 100;
        }
    });
    return growthRates;
  };

  // Helper calculation functions
  const calculateAverageGrowth = (data) => {
    const growthRates = data
        .map(company => company.monthly_visits_growth)
        .filter(rate => rate !== undefined && rate !== null);
    if (growthRates.length === 0) return 0;
    const average = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
    return Math.round(average * 100);
  };

  const countRecentCompanies = (data) => {
    const currentYear = new Date().getFullYear();
    return data.filter(company => {
        const foundedYear = company.founded_date?.split('-')[0];
        return foundedYear && (currentYear - parseInt(foundedYear)) <= 2;
    }).length;
  };

  const calculateTechAdoption = (data) => {
    const companiesWithTech = data.filter(company => 
        company.active_tech_count > 0 || company.builtwith_tech?.length > 0
    ).length;
    return Math.round((companiesWithTech / data.length) * 100);
  };

  const calculateMarketMaturity = (data) => {
    const avgAge = calculateAverageAge(data);
    if (avgAge < 5) return "Emerging Market";
    if (avgAge < 10) return "Growth Phase";
    return "Mature Market";
  };

  const calculateConsolidation = (data) => {
    const leaders = data.filter(c => c.cb_rank < 1000).length;
    const total = data.length;
    const ratio = leaders / total;
    if (ratio > 0.3) return "High Consolidation";
    if (ratio > 0.1) return "Moderate Consolidation";
    return "Fragmented Market";
  };

  const calculateInnovationIndex = (data) => {
    const score = data.reduce((acc, company) => {
        let points = 0;
        if (company.active_tech_count > 20) points += 2;
        if (company.monthly_visits_growth > 0) points += 1;
        if (company.industries?.some(i => 
            i.value.toLowerCase().includes('ai') || 
            i.value.toLowerCase().includes('tech')
        )) points += 2;
        return acc + points;
    }, 0);
    
    const maxScore = data.length * 5;
    const index = (score / maxScore) * 100;
    return `${Math.round(index)}% Innovation Score`;
  };

  // Add new helper functions for Brightdata data
  const calculateMarketSize = (data) => {
    console.log('Calculating market size from:', data);
    const totalFunding = data.reduce((sum, company) => {
        const funding = company.funding_rounds?.value?.value_usd || 0;
        return sum + funding;
    }, 0);
    return `$${(totalFunding / 1000000000).toFixed(2)}B Total Funding`;
  };

  const extractRegulations = (data) => {
    console.log('Extracting regulations from:', data);
    const regulations = new Set();
    data.forEach(company => {
        if (company.legal_name) regulations.add('Company Registration Required');
        if (company.industries?.some(i => i.value.includes('Financial'))) {
            regulations.add('Financial Regulations Apply');
        }
        if (company.industries?.some(i => i.value.includes('Health'))) {
            regulations.add('Healthcare Compliance Required');
        }
    });
    return Array.from(regulations);
  };

  const extractRevenue = (data) => {
    console.log('Extracting revenue data from:', data);
    return data.slice(0, 5).reduce((acc, company) => {
        if (company.aberdeen_it_spend?.value) {
            acc[company.name] = company.aberdeen_it_spend.value;
        }
        return acc;
    }, {});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Market Trends Analysis</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Enter company or industry name (e.g., OpenAI, AI Technology)"
                        className="w-full px-4 py-2 rounded-lg bg-[#2D2D2F] text-white border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-2 rounded-lg font-medium transition-all duration-200
                        ${isLoading 
                            ? 'bg-gray-600 cursor-not-allowed' 
                            : 'bg-purple-600 hover:bg-purple-700 text-white'
                        }`}
                >
                    {isLoading ? 'Analyzing...' : 'Analyze Market'}
                </button>
            </form>
        </div>

        {isLoading && (
            <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-purple-400">
                        {currentPhase === 1 ? 'Triggering data collection...' :
                         currentPhase === 2 ? 'Waiting for data processing...' :
                         'Analyzing market data...'}
                    </span>
                </div>
            </div>
        )}

        {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-red-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span className="text-red-400">{error}</span>
                </div>
            </div>
        )}

        {apiResponse && (
            <div className="space-y-8">
                {/* Market Size & Growth */}
                {renderSection("Market Size & Growth", apiResponse.market_size_growth)}
                
                {/* Market Share Visualization */}
                <MarketShareChart data={apiResponse.metrics} />
                
                {/* Competitive Landscape */}
                {renderSection("Competitive Landscape", apiResponse.competitive_landscape)}
                
                {/* Industry Trends */}
                {renderSection("Industry Trends", apiResponse.industry_trends)}
                
                {/* Growth Forecast */}
                {renderSection("Growth Forecast", apiResponse.growth_forecast)}
                
                {/* Sources */}
                {renderSourcesSection(apiResponse.sources)}
            </div>
        )}
    </div>
  );
}