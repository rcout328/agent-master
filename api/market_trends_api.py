from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime
from firecrawl import FirecrawlApp
import json
import os
from googlesearch import search
import time
import google.generativeai as genai

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.DEBUG)

# Initialize Firecrawl
FIRECRAWL_API_KEY = "fc-c8fb95d8db884bd38ce266a30b0d11b4"
firecrawl_app = FirecrawlApp(api_key=FIRECRAWL_API_KEY)
logging.info("Firecrawl initialized")

# Initialize Gemini
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY', '')
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
    logging.info("Gemini initialized")
else:
    logging.warning("No Gemini API key found")

def get_trends_data(query):
    """
    Get market trends data using search and Firecrawl
    """
    logging.info(f"\n{'='*50}\nGathering trends data for: {query}\n{'='*50}")
    
    result = {
        "market_size_growth": {
            "total_market_value": [],
            "market_segments": [],
            "regional_distribution": []
        },
        "competitive_analysis": {
            "market_leaders": [],
            "competitive_advantages": [],
            "market_concentration": []
        },
        "industry_trends": {
            "current_trends": [],
            "technology_impact": [],
            "regulatory_environment": []
        },
        "growth_forecast": {
            "short_term": [],
            "long_term": [],
            "growth_drivers": []
        },
        "risk_assessment": {
            "market_challenges": [],
            "economic_factors": [],
            "competitive_threats": []
        },
        "sources": []
    }
    
    search_queries = [
        f"{query} market trends analysis",
        f"{query} industry growth forecast",
        f"{query} market size revenue",
        f"{query} competitive landscape",
        f"{query} market risks opportunities"
    ]
    
    scraped_content = []
    
    for search_query in search_queries:
        try:
            logging.info(f"\nSearching for: {search_query}")
            urls = list(search(
                search_query, 
                lang="en", 
                num=2, 
                pause=2.0, 
                stop=2
            ))
            
            for url in urls:
                if not any(x in url.lower() for x in ['linkedin', 'facebook', 'twitter']):
                    try:
                        logging.info(f"Scraping: {url}")
                        response = firecrawl_app.scrape_url(
                            url=url,
                            params={'formats': ['markdown']}
                        )
                        
                        if response and 'markdown' in response:
                            content = response['markdown']
                            if len(content) > 200:
                                logging.info("Successfully scraped content")
                                scraped_content.append({
                                    'url': url,
                                    'domain': extract_domain(url),
                                    'section': 'Market Trends',
                                    'date': datetime.now().strftime("%Y-%m-%d"),
                                    'content': content[:1000]  # Limit content size
                                })
                                # Save scraped content to a text file
                                with open('scraped_sources.txt', 'a') as f:
                                    f.write(f"URL: {url}\nContent: {content}\n\n")
                                break
                    except Exception as e:
                        if "429" in str(e):  # Rate limit error
                            logging.warning(f"Rate limit reached, waiting...")
                            time.sleep(10)  # Wait longer on rate limit
                        else:
                            logging.error(f"Error scraping {url}: {str(e)}")
                        continue
            
            time.sleep(2)  # Pause between search queries
            
        except Exception as e:
            logging.error(f"Error in search: {str(e)}")
            continue
    
    # Add sources to result
    result["sources"] = [{
        'url': item['url'],
        'domain': item['domain'],
        'section': item['section'],
        'date': item['date']
    } for item in scraped_content]
    
    # Generate analysis using scraped content
    if scraped_content:
        try:
            # First prompt to extract and structure raw data
            raw_data_prompt = f"""
            Extract and structure key market data from this content about {query}.
            
            Content to analyze:
            {[item['content'] for item in scraped_content]}
            
            Extract specific data points in this format:
            1. Market Size: Include exact numbers (billions/millions)
            2. Growth Rates: CAGR, YoY growth percentages
            3. Market Leaders: Company names with market share %
            4. Regional Data: Geographic breakdown with percentages
            5. Key Statistics: Any relevant numerical data
            
            Format as clear data points with numbers and percentages.
            Mark estimates or inferences with (Inferred).
            """
            # Save the raw data prompt to a text file
            with open('gemini_prompt.txt', 'a') as f:
                f.write(raw_data_prompt + "\n")

            raw_data_response = model.generate_content(raw_data_prompt)
            structured_data = raw_data_response.text

            # Second prompt for detailed analysis using structured data
            analysis_prompt = f"""
            Using this structured market data about {query}, provide a comprehensive analysis.
            
            Data to analyze:
            {structured_data}

            Create a detailed report with these exact sections:

            MARKET SIZE & GROWTH:
            • Total Market Value:
              - Exact current market size (use specific numbers)
              - Historical growth trajectory
              - YoY growth rate with percentages
            • Market Segments:
              - Segment sizes and percentages
              - Growth rates by segment
              - Key segment drivers
            • Regional Distribution:
              - Market share by region (%)
              - Growth rates by region
              - Regional market characteristics

            COMPETITIVE ANALYSIS:
            • Market Leaders:
              - Top 5 companies with market share %
              - Revenue figures where available
              - YoY growth rates
            • Competitive Advantages:
              - Core differentiators
              - Technology capabilities
              - Market positioning
            • Market Concentration:
              - Concentration ratios
              - Market power distribution
              - Entry barrier analysis

            INDUSTRY TRENDS:
            • Current Trends:
              - Consumer behavior shifts (with data)
              - Technology adoption rates
              - Market disruptions
            • Technology Impact:
              - Digital transformation metrics
              - Innovation investment data
              - Tech adoption rates
            • Regulatory Environment:
              - Key regulation impacts
              - Compliance costs
              - Future regulatory trends

            GROWTH FORECAST:
            • Short-term Outlook (1-2 years):
              - Growth projections with CAGR
              - Segment-wise forecasts
              - Market size targets
            • Long-term Potential (5 years):
              - Market size projections
              - Growth trajectories
              - Segment evolution
            • Growth Drivers:
              - Primary catalysts with impact %
              - Investment trends
              - Innovation metrics

            RISK ASSESSMENT:
            • Market Challenges:
              - Risk factors with impact ratings
              - Mitigation strategies
              - Cost implications
            • Economic Factors:
              - Economic sensitivity metrics
              - Cost structure analysis
              - Margin trends
            • Competitive Threats:
              - New entrant probability
              - Substitution risks
              - Market share threats

            Requirements:
            1. Use specific numbers and percentages
            2. Include data sources where available
            3. Mark estimates with (Inferred)
            4. Prioritize actionable insights
            5. Focus on quantifiable metrics
            6. Include trend indicators (↑↓→)
            7. Rate impacts (High/Medium/Low)
            """
            # Save the analysis prompt to a text file
            with open('gemini_analysis_prompt.txt', 'a') as f:
                f.write(analysis_prompt + "\n")

            analysis_response = model.generate_content(analysis_prompt)
            analysis = analysis_response.text

            # Extract and structure the sections
            result["market_size_growth"]["total_market_value"] = extract_section(analysis, "MARKET SIZE & GROWTH", "Total Market Value")
            result["market_size_growth"]["market_segments"] = extract_section(analysis, "MARKET SIZE & GROWTH", "Market Segments")
            result["market_size_growth"]["regional_distribution"] = extract_section(analysis, "MARKET SIZE & GROWTH", "Regional Distribution")
            
            result["competitive_analysis"]["market_leaders"] = extract_section(analysis, "COMPETITIVE ANALYSIS", "Market Leaders")
            result["competitive_analysis"]["competitive_advantages"] = extract_section(analysis, "COMPETITIVE ANALYSIS", "Competitive Advantages")
            result["competitive_analysis"]["market_concentration"] = extract_section(analysis, "COMPETITIVE ANALYSIS", "Market Concentration")
            
            result["industry_trends"]["current_trends"] = extract_section(analysis, "INDUSTRY TRENDS", "Current Trends")
            result["industry_trends"]["technology_impact"] = extract_section(analysis, "INDUSTRY TRENDS", "Technology Impact")
            result["industry_trends"]["regulatory_environment"] = extract_section(analysis, "INDUSTRY TRENDS", "Regulatory Environment")
            
            result["growth_forecast"]["short_term"] = extract_section(analysis, "GROWTH FORECAST", "Short-term Outlook")
            result["growth_forecast"]["long_term"] = extract_section(analysis, "GROWTH FORECAST", "Long-term Potential")
            result["growth_forecast"]["growth_drivers"] = extract_section(analysis, "GROWTH FORECAST", "Growth Drivers")
            
            result["risk_assessment"]["market_challenges"] = extract_section(analysis, "RISK ASSESSMENT", "Market Challenges")
            result["risk_assessment"]["economic_factors"] = extract_section(analysis, "RISK ASSESSMENT", "Economic Factors")
            result["risk_assessment"]["competitive_threats"] = extract_section(analysis, "RISK ASSESSMENT", "Competitive Threats")

            # Add confidence scores
            result["analysis_metadata"] = {
                "confidence_score": "High" if len(scraped_content) >= 3 else "Medium",
                "data_points": len(structured_data.split('\n')),
                "analysis_date": datetime.now().strftime("%Y-%m-%d"),
                "data_quality": "High" if any(x in structured_data.lower() for x in ['billion', 'million', '%', 'market share']) else "Medium"
            }

            return result

        except Exception as e:
            logging.error(f"Error in Gemini analysis: {str(e)}")
            return generate_fallback_response(query)
    
    return generate_fallback_response(query)

def extract_section(text, section_name, subsection=None):
    """Extract content from a specific section and subsection"""
    try:
        lines = []
        in_section = False
        in_subsection = not subsection
        
        for line in text.split('\n'):
            line = line.strip()
            
            if section_name + ":" in line:
                in_section = True
                continue
            elif any(s + ":" in line for s in ["MARKET SIZE & GROWTH", "COMPETITIVE ANALYSIS", "INDUSTRY TRENDS", "GROWTH FORECAST", "RISK ASSESSMENT"]):
                if section_name not in line:
                    in_section = False
                    in_subsection = not subsection
            elif in_section and subsection and subsection + ":" in line:
                in_subsection = True
                continue
            elif in_section and line.endswith(':'):
                in_subsection = subsection in line if subsection else True
            elif in_section and in_subsection and line and not line.endswith(':'):
                cleaned_line = line.strip('- *•').strip()
                if cleaned_line:
                    lines.append(cleaned_line)
        
        return lines
    except Exception as e:
        logging.error(f"Error extracting section {section_name}: {str(e)}")
        return []

def extract_domain(url):
    """Extract domain name from URL"""
    try:
        from urllib.parse import urlparse
        domain = urlparse(url).netloc
        return domain.replace('www.', '')
    except:
        return url

def generate_fallback_response(query):
    """Generate basic trends analysis when no data is found"""
    return {
        "market_size_growth": {
            "total_market_value": [f"Market size for {query} pending analysis (Inferred)"],
            "market_segments": ["Segment analysis in progress (Inferred)"],
            "regional_distribution": ["Regional data being collected (Inferred)"]
        },
        "competitive_analysis": {
            "market_leaders": ["Leader analysis pending (Inferred)"],
            "competitive_advantages": ["Advantage assessment in progress (Inferred)"],
            "market_concentration": ["Concentration analysis pending (Inferred)"]
        },
        "industry_trends": {
            "current_trends": ["Trend analysis in progress (Inferred)"],
            "technology_impact": ["Tech impact being evaluated (Inferred)"],
            "regulatory_environment": ["Regulatory review pending (Inferred)"]
        },
        "growth_forecast": {
            "short_term": ["Short-term projections pending (Inferred)"],
            "long_term": ["Long-term analysis in progress (Inferred)"],
            "growth_drivers": ["Driver analysis pending (Inferred)"]
        },
        "risk_assessment": {
            "market_challenges": ["Challenge assessment pending (Inferred)"],
            "economic_factors": ["Economic analysis in progress (Inferred)"],
            "competitive_threats": ["Threat analysis pending (Inferred)"]
        },
        "sources": []
    }

@app.route('/api/market-trends', methods=['POST', 'OPTIONS'])
def analyze_trends():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        trends_data = get_trends_data(query)
        return jsonify(trends_data)

    except Exception as e:
        logging.error(f"Error during trends analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5010, debug=True) 