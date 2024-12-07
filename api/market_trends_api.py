import logging
from datetime import datetime
from firecrawl import FirecrawlApp
import os
import time
import google.generativeai as genai
import requests  # Import requests for making API calls

# Initialize logging
logging.basicConfig(level=logging.DEBUG)

# Initialize Firecrawl
FIRECRAWL_API_KEY = "fc-43e5dcff501d4aef8cbccfa47b646f57"
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
    company_name = "100xEngineers"
    logging.info(f"\n{'='*50}\nGathering trends data for: {query}\n{'='*50}")
    
    # Define search queries with better error handling
    search_queries = [
        f"{company_name} overview",
        f"{query} market size revenue statistics",
        f"{query} industry market share data",
        f"{query} market growth forecast CAGR",
        f"{query} competitive analysis market leaders",
        f"{query} industry trends analysis report"
    ]
    
    scraped_content = []

    try:
        for search_query in search_queries:
            try:
                logging.info(f"\nSearching for: {search_query}")
                # Custom Search API request with error handling
                api_key = "AIzaSyAxeLlJ6vZxOl-TblUJg_dInBS3vNxaFVY"
                search_engine_id = "37793b12975da4e35"
                url = f"https://www.googleapis.com/customsearch/v1?q={search_query}&key={api_key}&cx={search_engine_id}&num=3"
                
                response = requests.get(url, timeout=10)  # Add timeout
                if not response.ok:
                    logging.error(f"Search API error: {response.status_code}")
                    continue
                    
                response_data = response.json()
                if 'items' not in response_data:
                    logging.warning(f"No search results for: {search_query}")
                    continue
                    
                urls = [item['link'] for item in response_data.get('items', [])]

                for url in urls:
                    if not any(x in url.lower() for x in ['linkedin', 'facebook', 'twitter', 'reddit']):
                        try:
                            logging.info(f"Scraping: {url}")
                            response = firecrawl_app.scrape_url(
                                url=url,
                                params={'formats': ['markdown']},
                            )
                            
                            if response and 'markdown' in response:
                                content = response['markdown']
                                if len(content) > 200:
                                    scraped_content.append({
                                        'url': url,
                                        'domain': extract_domain(url),
                                        'section': 'Market Trends',
                                        'date': datetime.now().strftime("%Y-%m-%d"),
                                        'content': content[:2000]
                                    })
                        except Exception as e:
                            logging.error(f"Scraping error for {url}: {str(e)}")
                            continue
                            
                time.sleep(2)  # Rate limiting
                
            except Exception as e:
                logging.error(f"Error in search query {search_query}: {str(e)}")
                continue

        if not scraped_content:
            logging.warning("No content was scraped, returning fallback response")
            return generate_fallback_response(query)

        # Process the scraped content
        return process_scraped_content(scraped_content, query)

    except Exception as e:
        logging.error(f"Error during market trends analysis: {str(e)}")
        return generate_fallback_response(query)

def process_scraped_content(scraped_content, query):
    try:
        # Generate analysis using the scraped content
        analysis = generate_analysis(scraped_content, query)
        
        # Structure the response
        result = {
            "market_size_growth": {
                "total_market_value": extract_bullet_points(analysis, "Market Size"),
                "market_segments": extract_bullet_points(analysis, "Market Segments"),
                "regional_distribution": extract_bullet_points(analysis, "Regional Distribution")
            },
            "competitive_landscape": {
                "market_leaders": extract_bullet_points(analysis, "Market Leaders"),
                "market_differentiators": extract_bullet_points(analysis, "Market Differentiators"),
                "industry_dynamics": extract_bullet_points(analysis, "Industry Dynamics")
            },
            "consumer_analysis": {
                "segments": extract_bullet_points(analysis, "Consumer Segments"),
                "behavior_patterns": extract_bullet_points(analysis, "Behavior Patterns"),
                "pain_points": extract_bullet_points(analysis, "Pain Points")
            },
            "metrics": extract_metrics(scraped_content),
            "sources": [{
                'url': item['url'],
                'domain': item['domain'],
                'section': item['section'],
                'date': item['date']
            } for item in scraped_content]
        }
        
        return result
    except Exception as e:
        logging.error(f"Error processing scraped content: {str(e)}")
        return generate_fallback_response(query)

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

def process_analysis(analysis, scraped_content):
    """Process and structure the analysis for frontend consumption"""
    result = {
        "market_size_growth": {
            "total_market_value": [],
            "market_segments": [],
            "regional_distribution": [],
            "growth_drivers": []
        },
        "competitive_landscape": {
            "market_leaders": [],
            "market_differentiators": [],
            "industry_dynamics": [],
            "entry_barriers": []
        },
        "consumer_analysis": {
            "segments": [],
            "behavior_patterns": [],
            "pain_points": [],
            "decision_factors": []
        },
        "technology_innovation": {
            "current_trends": [],
            "emerging_tech": [],
            "digital_impact": [],
            "innovation_opportunities": []
        },
        "regulatory_environment": {
            "key_regulations": [],
            "compliance_requirements": [],
            "environmental_impact": [],
            "sustainability": []
        },
        "future_outlook": {
            "growth_forecast": [],
            "opportunities": [],
            "challenges": [],
            "evolution_scenarios": []
        },
        "strategic_recommendations": {
            "entry_strategies": [],
            "product_development": [],
            "tech_investments": [],
            "risk_mitigation": []
        },
        "metrics": extract_metrics(scraped_content),
        "sources": []
    }

    # Extract sections using more specific patterns
    for section in result.keys():
        if section != "metrics" and section != "sources":
            for subsection in result[section].keys():
                result[section][subsection] = extract_bullet_points(analysis, subsection.replace('_', ' ').title())

    return result

def extract_metrics(scraped_content):
    """Extract and structure metrics from scraped content"""
    metrics = {
        "market_share": {},
        "growth_rates": {},
        "revenue": {}
    }
    
    for item in scraped_content:
        if 'metrics' in item:
            # Process market share
            for i, share in enumerate(item['metrics'].get('market_share', [])):
                try:
                    value = float(share)
                    metrics['market_share'][f'Company {i+1}'] = value
                except ValueError:
                    continue
                    
            # Process growth rates
            for i, rate in enumerate(item['metrics'].get('growth_rates', [])):
                try:
                    value = float(rate)
                    metrics['growth_rates'][f'Period {i+1}'] = value
                except ValueError:
                    continue
                    
            # Process revenue figures
            for i, amount in enumerate(item['metrics'].get('money', [])):
                try:
                    value = float(amount)
                    metrics['revenue'][f'Entity {i+1}'] = value
                except ValueError:
                    continue
    
    return metrics

def extract_bullet_points(text, section_name):
    """Extract bullet points from a section"""
    points = []
    in_section = False
    
    for line in text.split('\n'):
        line = line.strip()
        
        # Check for section start
        if section_name in line:
            in_section = True
            continue
            
        # Check for section end
        if in_section:
            # Check if we've hit another section
            if any(s + ":" in line for s in ["Total Market Value", "Market Segments", "Regional Distribution", "Top Market Players", "Market Differentiators", "Industry Dynamics", "Current Trends", "Technology Impact", "Regulatory Environment", "Short-Term", "Long-Term", "Growth Drivers", "Market Challenges", "Economic Factors", "Competitive Threats"]):
                in_section = False
                continue
            
            # Extract bullet points
            if line.startswith(('•', '-', '*', '○', '›', '»', '⁃')):
                cleaned_line = line.lstrip('•-*○›»⁃ ').strip()
                if cleaned_line and not cleaned_line.endswith(':'):
                    points.append(cleaned_line)
                    
            # Extract numbered points
            elif line.startswith(('1.', '2.', '3.', '4.', '5.')):
                cleaned_line = ' '.join(line.split()[1:])
                if cleaned_line:
                    points.append(cleaned_line)
    
    return points 