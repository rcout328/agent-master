"use client";

import { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Link from 'next/link';
import Impact from './Impact';

// Initialize Gemini
const genAI = new GoogleGenerativeAI("AIzaSyAE2SKBA38bOktQBdXS6mTK5Y1a-nKB3Mo");

export default function ImpactAssessmentContent() {
  const [viewMode, setViewMode] = useState('api'); // 'api' or 'web'
  const [storedSnapshots, setStoredSnapshots] = useState([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [processedData, setProcessedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadAllSnapshots();
  }, []);

  const loadAllSnapshots = () => {
    const allKeys = Object.keys(localStorage);
    const snapshots = allKeys
      .filter(key => key.includes('snapshot_'))
      .map(key => {
        try {
          const rawData = JSON.parse(localStorage.getItem(key));
          // Handle different data structures
          let processedData = Array.isArray(rawData) ? rawData : 
                          rawData?.data ? rawData.data :
                          rawData?.results ? rawData.results : [];
          
          return {
            id: key.split('snapshot_')[1],
            data: processedData,
            timestamp: new Date().toISOString()
          };
        } catch (e) {
          console.error(`Error parsing snapshot ${key}:`, e);
          return null;
        }
      })
      .filter(Boolean);

    setStoredSnapshots(snapshots);
  };

  const processSnapshotData = async (snapshotData) => {
    try {
      setIsProcessing(true);
      console.log('Processing snapshot data:', snapshotData.id);
      
      let raw_data = [];
      if (snapshotData && snapshotData.data) {
        if (Array.isArray(snapshotData.data)) {
          raw_data = snapshotData.data;
        } else if (snapshotData.data.data && Array.isArray(snapshotData.data.data)) {
          raw_data = snapshotData.data.data;
        } else if (snapshotData.data.results && Array.isArray(snapshotData.data.results)) {
          raw_data = snapshotData.data.results;
        }
      }

      if (!Array.isArray(raw_data) || raw_data.length === 0) {
        throw new Error('No valid data array found in snapshot');
      }

      // Process impact assessment data
      const processed = {
        social_impact: analyzeSocialImpact(raw_data),
        economic_impact: analyzeEconomicImpact(raw_data),
        environmental_impact: analyzeEnvironmentalImpact(raw_data),
        long_term_impact: analyzeLongTermImpact(raw_data),
        metrics: calculateMetrics(raw_data)
      };

      console.log('Processed impact data:', processed);
      setProcessedData(processed);

    } catch (error) {
      console.error('Error processing data:', error);
      alert('Failed to process snapshot data: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const analyzeSocialImpact = (data) => {
    return {
      employment_impact: calculateEmploymentImpact(data),
      tech_adoption: analyzeTechAdoption(data),
      growth_indicators: analyzeGrowthIndicators(data)
    };
  };

  const analyzeEconomicImpact = (data) => {
    return {
      funding_metrics: analyzeFundingMetrics(data),
      growth_metrics: calculateGrowthMetrics(data),
      market_presence: analyzeMarketPresence(data)
    };
  };

  const analyzeEnvironmentalImpact = (data) => {
    return {
      tech_efficiency: calculateTechEfficiency(data),
      resource_utilization: analyzeResourceUtilization(data),
      sustainability_metrics: calculateSustainabilityMetrics(data)
    };
  };

  const analyzeLongTermImpact = (data) => {
    return {
      growth_potential: assessGrowthPotential(data),
      scalability_metrics: calculateScalabilityMetrics(data),
      future_indicators: analyzeFutureIndicators(data)
    };
  };

  // Helper functions for impact analysis
  const calculateEmploymentImpact = (data) => {
    const employmentData = data.filter(company => company.num_employees);
    return {
      total_employment: employmentData.reduce((sum, company) => {
        const employees = parseInt(company.num_employees.replace(/[^0-9]/g, ''));
        return sum + (isNaN(employees) ? 0 : employees);
      }, 0),
      avg_team_size: employmentData.length > 0 ? 
        Math.round(employmentData.reduce((sum, company) => {
          const employees = parseInt(company.num_employees.replace(/[^0-9]/g, ''));
          return sum + (isNaN(employees) ? 0 : employees);
        }, 0) / employmentData.length) : 0
    };
  };

  const analyzeTechAdoption = (data) => {
    return data
      .filter(company => company.active_tech_count)
      .map(company => ({
        name: company.name,
        tech_count: company.active_tech_count,
        impact_score: calculateTechImpactScore(company)
      }))
      .sort((a, b) => b.impact_score - a.impact_score)
      .slice(0, 5);
  };

  const calculateTechImpactScore = (company) => {
    let score = 0;
    if (company.active_tech_count) score += company.active_tech_count * 10;
    if (company.monthly_visits_growth) score += parseFloat(company.monthly_visits_growth) * 5;
    return Math.round(score);
  };

  const analyzeGrowthIndicators = (data) => {
    return data
      .filter(company => company.monthly_visits_growth)
      .map(company => ({
        name: company.name,
        growth_rate: parseFloat(company.monthly_visits_growth),
        impact_level: calculateGrowthImpact(company)
      }))
      .sort((a, b) => b.growth_rate - a.growth_rate)
      .slice(0, 5);
  };

  const calculateGrowthImpact = (company) => {
    const growth = parseFloat(company.monthly_visits_growth);
    if (growth > 100) return "High";
    if (growth > 50) return "Medium";
    return "Low";
  };

  const analyzeFundingMetrics = (data) => {
    const fundedCompanies = data.filter(company => 
      company.featured_list && company.featured_list.some(item => item.org_funding_total)
    );
    
    return {
      total_rounds: fundedCompanies.length,
      avg_rounds: fundedCompanies.length > 0 ? 
        (fundedCompanies.reduce((sum, company) => {
          const maxFunding = Math.max(...company.featured_list.map(item => 
            item.org_funding_total?.value_usd || 0
          ));
          return sum + maxFunding;
        }, 0) / fundedCompanies.length).toFixed(1) : 0,
      funded_companies: fundedCompanies.length
    };
  };

  const calculateGrowthMetrics = (data) => {
    const growthData = data.filter(company => company.monthly_visits_growth);
    return {
      avg_growth: growthData.length > 0 ?
        (growthData.reduce((sum, company) => sum + parseFloat(company.monthly_visits_growth), 0) / growthData.length).toFixed(1) : 0,
      high_growth_companies: growthData.filter(company => parseFloat(company.monthly_visits_growth) > 50).length
    };
  };

  const analyzeMarketPresence = (data) => {
    return data
      .filter(company => company.monthly_visits_growth)
      .map(company => ({
        name: company.name,
        growth: parseFloat(company.monthly_visits_growth),
        market_impact: calculateMarketImpact(company)
      }))
      .sort((a, b) => b.growth - a.growth)
      .slice(0, 5);
  };

  const calculateTechEfficiency = (data) => {
    return data
      .filter(company => company.active_tech_count)
      .map(company => ({
        name: company.name,
        efficiency_score: calculateEfficiencyScore(company),
        tech_utilization: company.active_tech_count
      }))
      .sort((a, b) => b.efficiency_score - a.efficiency_score)
      .slice(0, 5);
  };

  const calculateEfficiencyScore = (company) => {
    let score = 0;
    if (company.active_tech_count) score += company.active_tech_count * 5;
    if (company.monthly_visits_growth) score += parseFloat(company.monthly_visits_growth) * 2;
    if (company.num_employees) {
      const employees = parseInt(company.num_employees.replace(/[^0-9]/g, ''));
      if (!isNaN(employees)) score += (employees / 10);
    }
    return Math.round(score);
  };

  const analyzeResourceUtilization = (data) => {
    return {
      tech_per_employee: calculateTechPerEmployee(data),
      growth_efficiency: calculateGrowthEfficiency(data),
      resource_metrics: getResourceMetrics(data)
    };
  };

  const calculateTechPerEmployee = (data) => {
    const validCompanies = data.filter(company => 
      company.active_tech_count && company.num_employees
    );
    return validCompanies.length > 0 ?
      (validCompanies.reduce((sum, company) => 
        sum + (company.active_tech_count / parseInt(company.num_employees.replace(/[^0-9]/g, ''))), 0
      ) / validCompanies.length).toFixed(2) : 0;
  };

  const calculateSustainabilityMetrics = (data) => {
    return {
      tech_adoption_rate: calculateTechAdoptionRate(data),
      efficiency_metrics: getEfficiencyMetrics(data),
      growth_sustainability: assessGrowthSustainability(data)
    };
  };

  const assessGrowthPotential = (data) => {
    return data
      .filter(company => company.monthly_visits_growth || company.active_tech_count)
      .map(company => ({
        name: company.name || 'Unknown',
        potential_score: calculatePotentialScore(company),
        growth_trajectory: assessGrowthTrajectory(company)
      }))
      .sort((a, b) => b.potential_score - a.potential_score)
      .slice(0, 5);
  };

  const calculateScalabilityMetrics = (data) => {
    return {
      scaling_companies: countScalingCompanies(data),
      avg_growth_rate: calculateAverageGrowth(data),
      tech_scalability: assessTechScalability(data)
    };
  };

  const analyzeFutureIndicators = (data) => {
    return {
      growth_trends: analyzeGrowthTrends(data),
      tech_evolution: analyzeTechEvolution(data),
      market_potential: assessMarketPotential(data)
    };
  };

  const calculateMetrics = (data) => {
    return {
      total_companies: data.length,
      total_employment: calculateTotalEmployment(data),
      avg_tech_count: calculateAverageTechCount(data),
      avg_growth_rate: calculateAverageGrowthRate(data)
    };
  };

  const generateAIAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      
      const prompt = `
        Analyze this impact assessment data and provide strategic insights:

        Social Impact:
        ${JSON.stringify(processedData.social_impact, null, 2)}

        Economic Impact:
        ${JSON.stringify(processedData.economic_impact, null, 2)}

        Environmental Impact:
        ${JSON.stringify(processedData.environmental_impact, null, 2)}

        Long-term Impact:
        ${JSON.stringify(processedData.long_term_impact, null, 2)}

        Key Metrics:
        ${JSON.stringify(processedData.metrics, null, 2)}

        Please provide:
        1. Social Impact Analysis
        2. Economic Growth Assessment
        3. Environmental Sustainability
        4. Long-term Potential
        5. Strategic Recommendations

        Format the analysis in clear sections with bullet points.
      `;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const analysisText = response.text();

      setAnalysis({
        timestamp: new Date().toISOString(),
        snapshotId: selectedSnapshot.id,
        content: analysisText,
        processedData: processedData
      });

    } catch (error) {
      console.error('Error generating analysis:', error);
      alert('Failed to generate analysis: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderProcessedDataReview = () => {
    if (!processedData) return null;

    return (
      <div className="bg-[#1D1D1F]/90 p-6 rounded-xl backdrop-blur-xl border border-purple-500/20 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-purple-400">
            Impact Analysis Results
          </h3>
          <div className="flex space-x-4">
            <button
              onClick={generateAIAnalysis}
              disabled={isAnalyzing}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isAnalyzing 
                  ? 'bg-purple-600/50 cursor-not-allowed' 
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {isAnalyzing ? 'Analyzing...' : 'Generate AI Analysis'}
            </button>
            <button
              onClick={() => setProcessedData(null)}
              className="text-gray-400 hover:text-gray-300"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Social Impact Section */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Social Impact</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-sm font-semibold text-purple-300 mb-2">Employment Impact</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total Employment</span>
                    <span className="text-purple-300">{processedData.social_impact.employment_impact.total_employment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Average Team Size</span>
                    <span className="text-purple-300">{processedData.social_impact.employment_impact.avg_team_size}</span>
                  </div>
                </div>
              </div>
              <div>
                <h5 className="text-sm font-semibold text-purple-300 mb-2">Tech Adoption Leaders</h5>
                {processedData.social_impact.tech_adoption.map((company, index) => (
                  <div key={index} className="flex justify-between items-center mb-2">
                    <span className="text-gray-300">{company.name}</span>
                    <span className="text-purple-300">{company.tech_count} technologies</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Economic Impact Section */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Economic Impact</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-sm font-semibold text-purple-300 mb-2">Funding Metrics</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total Funding Rounds</span>
                    <span className="text-purple-300">{processedData.economic_impact.funding_metrics.total_rounds}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Funded Companies</span>
                    <span className="text-purple-300">{processedData.economic_impact.funding_metrics.funded_companies}</span>
                  </div>
                </div>
              </div>
              <div>
                <h5 className="text-sm font-semibold text-purple-300 mb-2">Growth Metrics</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Average Growth</span>
                    <span className="text-purple-300">{processedData.economic_impact.growth_metrics.avg_growth}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">High Growth Companies</span>
                    <span className="text-purple-300">{processedData.economic_impact.growth_metrics.high_growth_companies}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Environmental Impact Section */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Environmental Impact</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-sm font-semibold text-purple-300 mb-2">Tech Efficiency</h5>
                {processedData.environmental_impact.tech_efficiency.map((company, index) => (
                  <div key={index} className="flex justify-between items-center mb-2">
                    <span className="text-gray-300">{company.name}</span>
                    <span className="text-purple-300">Score: {company.efficiency_score}</span>
                  </div>
                ))}
              </div>
              <div>
                <h5 className="text-sm font-semibold text-purple-300 mb-2">Resource Utilization</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Tech per Employee</span>
                    <span className="text-purple-300">{processedData.environmental_impact.resource_utilization.tech_per_employee}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Long-term Impact Section */}
          <div className="bg-[#2D2D2F] p-4 rounded-lg">
            <h4 className="text-lg font-semibold text-purple-400 mb-3">Long-term Impact</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-sm font-semibold text-purple-300 mb-2">Growth Potential</h5>
                {processedData.long_term_impact.growth_potential.map((company, index) => (
                  <div key={index} className="flex justify-between items-center mb-2">
                    <span className="text-gray-300">{company.name}</span>
                    <span className="text-purple-300">Score: {company.potential_score}</span>
                  </div>
                ))}
              </div>
              <div>
                <h5 className="text-sm font-semibold text-purple-300 mb-2">Scalability Metrics</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Scaling Companies</span>
                    <span className="text-purple-300">{processedData.long_term_impact.scalability_metrics.scaling_companies}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Average Growth Rate</span>
                    <span className="text-purple-300">{processedData.long_term_impact.scalability_metrics.avg_growth_rate}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Analysis Results */}
          {analysis && (
            <div className="bg-[#2D2D2F] p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-purple-400 mb-3">AI Analysis</h4>
              <div className="prose prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-300">
                  {analysis.content}
                </pre>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Generated on: {new Date(analysis.timestamp).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const calculateMarketImpact = (company) => {
    let impact = "Low";
    const growth = parseFloat(company.monthly_visits_growth || 0);
    const visits = company.monthly_visits || 0;
    
    if (growth > 100 || visits > 1000000) {
      impact = "High";
    } else if (growth > 50 || visits > 500000) {
      impact = "Medium";
    }
    
    return impact;
  };

  const calculateGrowthEfficiency = (data) => {
    return data
      .filter(company => company.monthly_visits_growth && company.active_tech_count)
      .map(company => ({
        name: company.name,
        efficiency: (parseFloat(company.monthly_visits_growth) / company.active_tech_count).toFixed(2)
      }))
      .sort((a, b) => parseFloat(b.efficiency) - parseFloat(a.efficiency))
      .slice(0, 5);
  };

  const getResourceMetrics = (data) => {
    return {
      avg_tech_per_company: calculateAverageTechCount(data),
      tech_utilization: calculateTechUtilization(data),
      resource_efficiency: calculateResourceEfficiency(data)
    };
  };

  const calculateAverageTechCount = (data) => {
    const companies = data.filter(company => company.active_tech_count);
    return companies.length > 0 ?
      Math.round(companies.reduce((sum, company) => sum + company.active_tech_count, 0) / companies.length) :
      0;
  };

  const calculateTechUtilization = (data) => {
    const companies = data.filter(company => company.active_tech_count);
    return companies.length > 0 ?
      Math.round((companies.length / data.length) * 100) + '%' :
      '0%';
  };

  const calculateResourceEfficiency = (data) => {
    return data
      .filter(company => company.active_tech_count && company.monthly_visits)
      .map(company => ({
        name: company.name,
        efficiency: ((company.monthly_visits || 0) / company.active_tech_count).toFixed(0)
      }))
      .sort((a, b) => parseInt(b.efficiency) - parseInt(a.efficiency))
      .slice(0, 5);
  };

  const assessGrowthSustainability = (data) => {
    return data
      .filter(company => company.monthly_visits_growth && company.active_tech_count)
      .map(company => ({
        name: company.name,
        sustainability: assessSustainabilityScore(company)
      }))
      .sort((a, b) => b.sustainability.localeCompare(a.sustainability))
      .slice(0, 5);
  };

  const assessSustainabilityScore = (company) => {
    const growth = parseFloat(company.monthly_visits_growth);
    const techCount = company.active_tech_count;
    
    if (growth > 100 && techCount > 10) return "High";
    if (growth > 50 && techCount > 5) return "Medium";
    return "Low";
  };

  const calculateTechScore = (company) => {
    let score = company.active_tech_count * 10;
    if (company.monthly_visits_growth) {
      score += parseFloat(company.monthly_visits_growth) * 2;
    }
    return Math.round(score);
  };

  const assessGrowthTrajectory = (company) => {
    if (!company.monthly_visits_growth) return "Steady";
    
    const growth = parseFloat(company.monthly_visits_growth);
    if (isNaN(growth)) return "Steady";
    
    if (growth > 100) return "Exponential";
    if (growth > 50) return "Linear";
    return "Steady";
  };

  const calculatePotentialScore = (company) => {
    let score = 0;
    
    // Growth score
    if (company.monthly_visits_growth) {
      score += Math.abs(parseFloat(company.monthly_visits_growth)) * 2;
    }
    
    // Tech adoption score
    if (company.active_tech_count) {
      score += company.active_tech_count * 5;
    }
    
    // Size score based on employees
    if (company.num_employees) {
      const sizeMap = {
        '1-10': 10,
        '11-50': 20,
        '51-100': 30,
        '101-250': 40,
        '251-500': 50,
        '501-1000': 60,
        '1001-5000': 70,
        '5001-10000': 80,
        '10001+': 90
      };
      score += sizeMap[company.num_employees] || 0;
    }

    return Math.round(score);
  };

  const calculateTechAdoptionRate = (data) => {
    const totalCompanies = data.length;
    const companiesWithTech = data.filter(company => company.active_tech_count > 0).length;
    return ((companiesWithTech / totalCompanies) * 100).toFixed(1) + '%';
  };

  const getEfficiencyMetrics = (data) => {
    return {
      tech_efficiency: calculateTechEfficiencyScore(data),
      resource_optimization: calculateResourceOptimization(data),
      growth_efficiency: calculateGrowthEfficiencyScore(data)
    };
  };

  const calculateTechEfficiencyScore = (data) => {
    const companies = data.filter(company => company.active_tech_count && company.monthly_visits);
    return companies.length > 0 ?
      Math.round(companies.reduce((sum, company) => 
        sum + ((company.monthly_visits || 0) / company.active_tech_count), 0
      ) / companies.length) :
      0;
  };

  const calculateResourceOptimization = (data) => {
    return data
      .filter(company => company.active_tech_count && company.num_employees)
      .map(company => ({
        name: company.name,
        optimization: (company.active_tech_count / parseInt(company.num_employees.replace(/[^0-9]/g, ''))).toFixed(2)
      }))
      .sort((a, b) => parseFloat(b.optimization) - parseFloat(a.optimization))
      .slice(0, 5);
  };

  const calculateGrowthEfficiencyScore = (data) => {
    const companies = data.filter(company => 
      company.monthly_visits_growth && company.active_tech_count
    );
    return companies.length > 0 ?
      (companies.reduce((sum, company) => 
        sum + (parseFloat(company.monthly_visits_growth) / company.active_tech_count), 0
      ) / companies.length).toFixed(1) :
      0;
  };

  const calculateTotalEmployment = (data) => {
    return data
      .filter(company => company.num_employees)
      .reduce((sum, company) => {
        const employees = parseInt(company.num_employees.replace(/[^0-9]/g, ''));
        return sum + (isNaN(employees) ? 0 : employees);
      }, 0);
  };

  const calculateAverageGrowthRate = (data) => {
    const companies = data.filter(company => company.monthly_visits_growth);
    return companies.length > 0 ?
      (companies.reduce((sum, company) => sum + parseFloat(company.monthly_visits_growth), 0) / companies.length).toFixed(1) + '%' :
      '0%';
  };

  const countScalingCompanies = (data) => {
    return data.filter(company => 
      parseFloat(company.monthly_visits_growth || 0) > 50 ||
      (company.monthly_visits || 0) > 500000
    ).length;
  };

  const assessTechScalability = (data) => {
    return data
      .filter(company => company.active_tech_count)
      .map(company => ({
        name: company.name,
        scalability: company.active_tech_count > 10 ? "High" : 
                    company.active_tech_count > 5 ? "Medium" : "Low"
      }))
      .sort((a, b) => 
        b.scalability.localeCompare(a.scalability)
      )
      .slice(0, 5);
  };

  const analyzeGrowthTrends = (data) => {
    const trends = data
      .filter(company => company.monthly_visits_growth)
      .map(company => ({
        name: company.name,
        growth: parseFloat(company.monthly_visits_growth)
      }))
      .sort((a, b) => b.growth - a.growth);

    return {
      high_growth: trends.filter(t => t.growth > 100).length,
      medium_growth: trends.filter(t => t.growth > 50 && t.growth <= 100).length,
      low_growth: trends.filter(t => t.growth <= 50).length
    };
  };

  const analyzeTechEvolution = (data) => {
    return data
      .filter(company => company.active_tech_count)
      .map(company => ({
        name: company.name,
        tech_score: calculateTechScore(company)
      }))
      .sort((a, b) => b.tech_score - a.tech_score)
      .slice(0, 5);
  };

  const assessMarketPotential = (data) => {
    return {
      total_addressable_market: data.reduce((sum, company) => sum + (company.monthly_visits || 0), 0),
      growth_potential: calculateAverageGrowth(data),
      market_maturity: assessMarketMaturity(data)
    };
  };

  const assessMarketMaturity = (data) => {
    const avgGrowth = calculateAverageGrowth(data).replace('%', '');
    if (parseFloat(avgGrowth) > 100) return "Emerging";
    if (parseFloat(avgGrowth) > 50) return "Growing";
    return "Mature";
  };

  const calculateAverageGrowth = (data) => {
    const growthRates = data
      .filter(company => company.monthly_visits_growth)
      .map(company => parseFloat(company.monthly_visits_growth));
    return growthRates.length > 0 ? 
      (growthRates.reduce((a, b) => a + b) / growthRates.length).toFixed(2) + '%' : 
      'N/A';
  };

  return (
    <div className="min-h-screen bg-[#131314] text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Navigation and View Toggle */}
        <div className="flex items-center justify-between mb-8">
          <div className="bg-[#1D1D1F] p-1 rounded-xl inline-flex">
            <Link 
              href="/market-assessment"
              className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-purple-600/50 transition-all duration-200"
            >
              Market Assessment
            </Link>
            <button 
              className="px-4 py-2 rounded-lg bg-purple-600 text-white"
            >
              Impact Assessment
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setViewMode('api')}
              className={`px-6 py-2 rounded-xl font-medium transition-colors ${
                viewMode === 'api'
                  ? 'bg-purple-600 text-white'
                  : 'bg-[#2D2D2F] text-gray-400 hover:text-white'
              }`}
            >
              API View
            </button>
            <button
              onClick={() => setViewMode('web')}
              className={`px-6 py-2 rounded-xl font-medium transition-colors ${
                viewMode === 'web'
                  ? 'bg-purple-600 text-white'
                  : 'bg-[#2D2D2F] text-gray-400 hover:text-white'
              }`}
            >
              Web View
            </button>
          </div>
        </div>

        {/* Render content based on view mode */}
        {viewMode === 'web' ? (
          // Web View - Impact Component
          <Impact />
        ) : (
          // API View - Snapshot List
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">Stored Snapshots</h2>
              
              {/* Snapshot Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {storedSnapshots.map((snapshot) => (
                  <div 
                    key={snapshot.id}
                    className="bg-[#1D1D1F]/90 p-6 rounded-xl backdrop-blur-xl border border-purple-500/20 hover:border-purple-500/40 transition-all cursor-pointer"
                    onClick={() => setSelectedSnapshot(snapshot)}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold text-purple-400">
                        Snapshot #{snapshot.id}
                      </h3>
                      <span className="text-sm text-gray-400">
                        {new Date(snapshot.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-gray-300 text-sm">
                      <p>Companies analyzed: {
                        Array.isArray(snapshot.data) ? snapshot.data.length : 0
                      }</p>
                      <p>Data points collected: {
                        Array.isArray(snapshot.data) ? 
                          snapshot.data.reduce((sum, company) => 
                            sum + (company ? Object.keys(company).length : 0), 0
                          ) : 0
                      }</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Selected Snapshot Details */}
              {selectedSnapshot && (
                <div className="mt-8 space-y-6">
                  {/* ... keep existing selected snapshot content ... */}
                </div>
              )}

              {/* Empty State */}
              {storedSnapshots.length === 0 && (
                <div className="text-center text-gray-400 py-12">
                  No stored snapshots found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}