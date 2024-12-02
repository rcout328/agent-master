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
            prompt = f"""
            Analyze this content about {query}'s market trends and create a detailed assessment.
            
            Content to analyze:
            {[item['content'] for item in scraped_content]}
            
            Provide a structured analysis with these exact sections:

            MARKET SIZE & GROWTH:
            • Total Market Value:
              - Current market size in billions/millions
              - Year-over-year growth rate
            • Market Segments:
              - Key product/service categories
              - Segment-wise breakdown
            • Regional Distribution:
              - Geographic market share
              - Key regional trends

            COMPETITIVE ANALYSIS:
            • Market Leaders:
              - Top 3-5 companies
              - Market share percentages
            • Competitive Advantages:
              - Key differentiators
              - Strategic positions
            • Market Concentration:
              - Industry consolidation
              - Market fragmentation level

            INDUSTRY TRENDS:
            • Current Trends:
              - Major market movements
              - Consumer behavior shifts
            • Technology Impact:
              - Digital transformation
              - Innovation trends
            • Regulatory Environment:
              - Key regulations
              - Compliance requirements

            GROWTH FORECAST:
            • Short-term Outlook:
              - 1-2 year projections
              - Immediate opportunities
            • Long-term Potential:
              - 5-year CAGR
              - Future market size
            • Growth Drivers:
              - Key catalysts
              - Market enablers

            RISK ASSESSMENT:
            • Market Challenges:
              - Current obstacles
              - Potential threats
            • Economic Factors:
              - Market dependencies
              - Economic impacts
            • Competitive Threats:
              - New entrants
              - Substitutes

            Use factual data where available and mark inferences with (Inferred).
            Format each point as a clear, actionable insight.
            Include specific numbers and percentages where possible.
            """
            
            response = model.generate_content(prompt)
            analysis = response.text
            
            # Extract sections
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
            
            return result
            
        except Exception as e:
            logging.error(f"Error generating analysis: {str(e)}")
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