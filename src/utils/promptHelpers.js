export function marketDataToPrompt(marketData) {
  return `
Generate a comprehensive market analysis report based on the following data:

Market Overview:
- Market Size: ${marketData.market_size || 'Not available'}
- Growth Rate: ${marketData.growth_rate || 'Not available'}

Competitors:
${marketData.competitors.map(comp => `- ${comp}`).join('\n')}

Market Trends:
${marketData.market_trends.map(trend => `- ${trend}`).join('\n')}

Key Findings:
${marketData.key_findings.map(finding => 
  `- ${finding.title}\n  ${finding.snippet}`
).join('\n')}

Industry Insights:
${marketData.industry_insights.map(insight => `- ${insight}`).join('\n')}

Please provide a detailed analysis including:
1. Monthly Growth Rates (with specific percentages)
2. Market Segment Distribution (with percentages)
3. Key Market Drivers
4. Competitive Landscape
5. Future Outlook

Format the response with clear numerical data that can be extracted for visualization.
Include specific growth percentages and market segment distributions.`;
} 