export const ANALYSIS_PROMPTS = {
  marketTrends: {
    prompt: (input) => `Perform a detailed market trends analysis for this business/startup: ${input}. 
    Please analyze:
    1. Current market trends and dynamics
    2. Emerging trends and future predictions
    3. Consumer behavior patterns
    4. Industry-specific trends
    5. Technology trends affecting the market`,
    title: "Market Trends Analysis"
  },
  
  competitorTracking: {
    prompt: (input) => `Conduct a comprehensive competitor analysis for this business/startup: ${input}.
    Please analyze:
    1. Direct competitors
    2. Indirect competitors
    3. Their strengths and weaknesses
    4. Market positioning
    5. Competitive advantages
    6. Market share analysis`,
    title: "Competitor Analysis"
  },
  
  icpCreation: {
    prompt: (input) => `Create a detailed Ideal Customer Profile (ICP) for this business/startup: ${input}.
    Include:
    1. Demographic characteristics
    2. Psychographic profiles
    3. Behavior patterns
    4. Pain points and needs
    5. Buying preferences
    6. Decision-making factors`,
    title: "ICP Creation"
  },
  
  journeyMapping: {
    prompt: (input) => `Create a comprehensive customer journey map for this business/startup: ${input}.
    Map out:
    1. Awareness stage
    2. Consideration stage
    3. Decision stage
    4. Purchase process
    5. Post-purchase experience
    6. Key touchpoints and interactions`,
    title: "Journey Mapping"
  },
  
  swotAnalysis: {
    prompt: (input) => `Perform a detailed SWOT analysis for this business/startup: ${input}.
    Analyze:
    1. Strengths (internal advantages)
    2. Weaknesses (internal limitations)
    3. Opportunities (external possibilities)
    4. Threats (external challenges)
    5. Strategic implications`,
    title: "SWOT Analysis"
  },
  
  labeledGap: {
    prompt: (input) => `Identify and analyze market gaps for this business/startup: ${input}.
    Include:
    1. Current market gaps
    2. Unmet customer needs
    3. Service/product gaps
    4. Market opportunity size
    5. Potential solutions`,
    title: "Gap Analysis"
  },
  
  feedbackCollection: {
    prompt: (input) => `Design a comprehensive feedback collection strategy for: ${input}.
    Cover:
    1. Customer feedback mechanisms
    2. Key feedback metrics
    3. Collection methods
    4. Analysis approach
    5. Implementation recommendations`,
    title: "Feedback Collection"
  },
  
  featurePriority: {
    prompt: (input) => `Create a feature prioritization framework for: ${input}.
    Include:
    1. Core features ranking
    2. Development priorities
    3. User impact assessment
    4. Resource requirements
    5. Implementation timeline`,
    title: "Feature Priority"
  },
  
  marketSize: {
    prompt: (input) => `Analyze the market size and potential for: ${input}.
    Include:
    1. Total addressable market (TAM)
    2. Serviceable addressable market (SAM)
    3. Serviceable obtainable market (SOM)
    4. Market growth projections
    5. Market segments analysis`,
    title: "Market Size Analysis"
  },
  
  competitionHeat: {
    prompt: (input) => `Create a detailed competition heat map for: ${input}.
    Include:
    1. Competitor density analysis
    2. Market saturation levels
    3. Competitive intensity by segment
    4. Geographic distribution
    5. Market share distribution`,
    title: "Competition Heat Map"
  },
  
  regulatoryChecklist: {
    prompt: (input) => `Develop a comprehensive regulatory compliance checklist for: ${input}.
    Cover:
    1. Industry-specific regulations
    2. Compliance requirements
    3. Legal considerations
    4. Required permits/licenses
    5. Compliance timeline`,
    title: "Regulatory Checklist"
  },
  
  riskAssessment: {
    prompt: (input) => `Perform a detailed risk assessment for: ${input}.
    Analyze:
    1. Business risks
    2. Market risks
    3. Operational risks
    4. Financial risks
    5. Mitigation strategies`,
    title: "Risk Assessment"
  }
}; 