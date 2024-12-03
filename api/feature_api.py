import logging
from datetime import datetime
from firecrawl import FirecrawlApp
import json
import os
from googlesearch import search
import time
import google.generativeai as genai

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

def extract_domain(url):
    """Extract domain name from URL"""
    try:
        from urllib.parse import urlparse
        domain = urlparse(url).netloc
        return domain.replace('www.', '')
    except:
        return url

def get_feature_data(business_query):
    """Get feature priority data using search and Firecrawl"""
    logging.info(f"\n{'='*50}\nGathering feature data for: {business_query}\n{'='*50}")
    
    result = {
        "social_impact": [],
        "economic_impact": [],
        "environmental_impact": [],
        "implementation_priority": [],
        "sources": []
    }
    
    search_queries = [
        f"{business_query} product features analysis",
        f"{business_query} feature prioritization",
        f"{business_query} product roadmap",
        f"{business_query} user requirements",
        f"{business_query} product development priorities"
    ]
    
    scraped_content = []
    max_attempts = 2
    
    for query in search_queries:
        try:
            logging.info(f"\nSearching for: {query}")
            search_results = list(search(query, lang="en", num_results=2))
            attempts = 0
            
            for url in search_results:
                if attempts >= max_attempts:
                    break
                    
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
                                    'section': 'Feature Analysis',
                                    'date': datetime.now().strftime("%Y-%m-%d"),
                                    'content': content[:1000]
                                })
                                break
                    except Exception as e:
                        if "402" in str(e):
                            logging.warning(f"Firecrawl credit limit reached for {url}")
                            scraped_content.append({
                                'url': url,
                                'domain': extract_domain(url),
                                'section': 'Feature Analysis (Limited)',
                                'date': datetime.now().strftime("%Y-%m-%d"),
                                'content': f"Content from {extract_domain(url)} about {business_query}'s features"
                            })
                        else:
                            logging.error(f"Error scraping {url}: {str(e)}")
                        attempts += 1
                        continue
            
            time.sleep(2)
            
        except Exception as e:
            logging.error(f"Error in search: {str(e)}")
            continue

    if scraped_content:
        try:
            prompt = f"""
            Analyze this content about {business_query}'s features and create a detailed priority analysis.
            
            Content to analyze:
            {[item['content'] for item in scraped_content]}
            
            Provide a structured analysis with these exact sections:

            SOCIAL IMPACT:
            • Community Benefits
            • Employment Impact
            • Social Value

            ECONOMIC IMPACT:
            • Revenue Generation
            • Market Growth
            • Innovation Impact

            ENVIRONMENTAL IMPACT:
            • Sustainability
            • Resource Usage
            • Carbon Footprint

            IMPLEMENTATION PRIORITY:
            • Timeline
            • Resources
            • Success Metrics

            Use factual information where available, mark inferences with (Inferred).
            Format each point as a clear, actionable item.
            """
            
            response = model.generate_content(prompt)
            analysis = response.text
            
            # Extract sections
            result["social_impact"] = extract_section(analysis, "SOCIAL IMPACT")
            result["economic_impact"] = extract_section(analysis, "ECONOMIC IMPACT")
            result["environmental_impact"] = extract_section(analysis, "ENVIRONMENTAL IMPACT")
            result["implementation_priority"] = extract_section(analysis, "IMPLEMENTATION PRIORITY")
            
            # Add sources
            result["sources"] = [{
                'url': item['url'],
                'domain': item['domain'],
                'section': item['section'],
                'date': item['date']
            } for item in scraped_content]
            
            return result
            
        except Exception as e:
            logging.error(f"Error generating analysis: {str(e)}")
            return generate_fallback_response(business_query)
    
    return generate_fallback_response(business_query)

def extract_section(text, section_name):
    """Extract content from a specific section"""
    try:
        lines = []
        in_section = False
        
        for line in text.split('\n'):
            if section_name + ":" in line:
                in_section = True
                continue
            elif any(s + ":" in line for s in ["SOCIAL IMPACT", "ECONOMIC IMPACT", "ENVIRONMENTAL IMPACT", "IMPLEMENTATION PRIORITY"]):
                in_section = False
            elif in_section and line.strip():
                cleaned_line = line.strip('- *').strip()
                if cleaned_line and not cleaned_line.endswith(':'):
                    lines.append(cleaned_line)
        
        return lines
    except Exception as e:
        logging.error(f"Error extracting section {section_name}: {str(e)}")
        return []

def generate_fallback_response(business_query):
    """Generate basic feature priority analysis when no data is found"""
    return {
        "social_impact": [
            f"Community impact assessment for {business_query} pending (Inferred)",
            "Employment effects to be evaluated (Inferred)",
            "Social value contribution potential (Inferred)"
        ],
        "economic_impact": [
            "Revenue potential being assessed (Inferred)",
            "Market growth opportunities pending analysis (Inferred)",
            "Innovation impact to be determined (Inferred)"
        ],
        "environmental_impact": [
            "Sustainability initiatives to be evaluated (Inferred)",
            "Resource usage assessment pending (Inferred)",
            "Carbon footprint analysis needed (Inferred)"
        ],
        "implementation_priority": [
            "Timeline development in progress (Inferred)",
            "Resource requirements being assessed (Inferred)",
            "Success metrics to be defined (Inferred)"
        ],
        "sources": []
    } 