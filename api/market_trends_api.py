import logging
from datetime import datetime
from firecrawl import FirecrawlApp
import os
from googlesearch import search
import time
import google.generativeai as genai
import uuid  # Import uuid for unique file naming

# Initialize logging
logging.basicConfig(level=logging.DEBUG)

# Initialize Firecrawl
FIRECRAWL_API_KEY = "fc-b69d6504ab0a42b79e87b7827a538199"
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
    Get market trends data using search and Firecrawl with improved scraping
    """
    logging.info(f"\n{'='*50}\nGathering trends data for: {query}\n{'='*50}")
    
    # Define search queries
    search_queries = [
        f"{query} market size revenue statistics",
        f"{query} industry market share data",
        f"{query} market growth forecast CAGR",
        f"{query} competitive analysis market leaders",
        f"{query} industry trends analysis report"
    ]
    
    scraped_content = []
    
    for search_query in search_queries:
        try:
            logging.info(f"\nSearching for: {search_query}")
            urls = list(search(
                search_query, 
                num_results=3,
                lang="en"
            ))
            
            if not urls:
                logging.warning(f"No URLs found for query: {search_query}")
                continue
            
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
                                    'content': content[:2000],  # Limit content size
                                })
                                break
                    except Exception as e:
                        logging.error(f"Error scraping {url}: {str(e)}")
                        continue
            
            time.sleep(2)
            
        except Exception as e:
            logging.error(f"Error in search: {str(e)}")
            continue

    if not scraped_content:
        logging.warning("No content was scraped, returning fallback response")
        return generate_fallback_response(query)

    # Generate analysis using enhanced prompt
    if scraped_content:
        try:
            analysis_prompt = f"""
            Analyze this market data about {query} and provide a detailed trends analysis.
            
            Raw Data:
            {[item['content'] for item in scraped_content]}
            
            Create a comprehensive market trends report with these exact sections:

            1. MARKET SIZE & GROWTH
            • Total Market Value
            • Market Segments
            • Regional Distribution

            2. COMPETITIVE LANDSCAPE
            • Market Leaders
            • Market Differentiators
            • Industry Dynamics

            3. INDUSTRY TRENDS
            • Current Trends
            • Technology Impact
            • Regulatory Environment

            4. GROWTH FORECAST
            • Short-Term Outlook
            • Long-Term Potential
            • Growth Drivers

            5. RISK ASSESSMENT
            • Market Challenges
            • Economic Factors
            • Competitive Threats

            Format each point with specific data where available.
            Mark estimates or inferences with (Inferred).
            Include numerical data and percentages where possible.
            """
            
            response = model.generate_content(analysis_prompt)
            analysis = response.text
            
            # Create directory for storing Gemini output
            output_dir = 'gemini_outputs'
            os.makedirs(output_dir, exist_ok=True)
            
            # Save Gemini output to a specific txt file
            output_filename = os.path.join(output_dir, 'markettrand.txt')
            with open(output_filename, 'w') as file:
                file.write(analysis)
            logging.info(f"Gemini output saved to {output_filename}")
            
            # Process and structure the analysis
            result = process_analysis(analysis, scraped_content)
            
            # Add sources
            result["sources"] = [{
                'url': item['url'],
                'domain': item['domain'],
                'section': item['section'],
                'date': item['date']
            } for item in scraped_content]

            return result
            
        except Exception as e:
            logging.error(f"Error in analysis: {str(e)}")
            return generate_fallback_response(query)

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
            "regional_distribution": []
        },
        "competitive_landscape": {
            "market_leaders": [],
            "market_differentiators": [],
            "industry_dynamics": []
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
        "metrics": extract_metrics(scraped_content),
        "sources": []
    }

    # Extract sections
    result["market_size_growth"]["total_market_value"] = extract_bullet_points(analysis, "Total Market Value")
    result["market_size_growth"]["market_segments"] = extract_bullet_points(analysis, "Market Segments")
    result["market_size_growth"]["regional_distribution"] = extract_bullet_points(analysis, "Regional Distribution")
    
    result["competitive_landscape"]["market_leaders"] = extract_bullet_points(analysis, "Top Market Players")
    result["competitive_landscape"]["market_differentiators"] = extract_bullet_points(analysis, "Market Differentiators")
    result["competitive_landscape"]["industry_dynamics"] = extract_bullet_points(analysis, "Industry Dynamics")
    
    result["industry_trends"]["current_trends"] = extract_bullet_points(analysis, "Current Trends")
    result["industry_trends"]["technology_impact"] = extract_bullet_points(analysis, "Technology Impact")
    result["industry_trends"]["regulatory_environment"] = extract_bullet_points(analysis, "Regulatory Environment")
    
    result["growth_forecast"]["short_term"] = extract_bullet_points(analysis, "Short-Term")
    result["growth_forecast"]["long_term"] = extract_bullet_points(analysis, "Long-Term")
    result["growth_forecast"]["growth_drivers"] = extract_bullet_points(analysis, "Growth Drivers")
    
    result["risk_assessment"]["market_challenges"] = extract_bullet_points(analysis, "Market Challenges")
    result["risk_assessment"]["economic_factors"] = extract_bullet_points(analysis, "Economic Factors")
    result["risk_assessment"]["competitive_threats"] = extract_bullet_points(analysis, "Competitive Threats")

    # Add sources
    result["sources"] = [{
        'url': item['url'],
        'domain': item['domain'],
        'section': item['section'],
        'date': item['date']
    } for item in scraped_content]

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