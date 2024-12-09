import logging
from datetime import datetime
from firecrawl import FirecrawlApp
import os
import time
import google.generativeai as genai
import requests
from googlesearch import search
import json

# Initialize logging
logging.basicConfig(level=logging.DEBUG)

# Initialize Firecrawl
FIRECRAWL_API_KEY = "fc-5fadfeae30314d4ea8a3d9afaa75c493"
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

def search_with_retry(search_query):
    """Helper function to perform search with retry logic"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            return list(search(
                search_query,
                num_results=3,
                lang="en"
            ))
        except Exception as e:
            if "429" in str(e):
                wait_time = (attempt + 1) * 10
                logging.info(f"Search rate limit hit, waiting {wait_time} seconds...")
                time.sleep(wait_time)
                continue
            logging.error(f"Search error: {str(e)}")
            break
    return []

def scrape_with_retry(url, section):
    """Helper function to scrape URL with retry logic"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Skip social media URLs
            if any(x in url.lower() for x in ['linkedin', 'facebook', 'twitter', 'reddit']):
                logging.info(f"Skipping social media URL: {url}")
                return None
                
            response = firecrawl_app.scrape_url(
                url=url,
                params={'formats': ['markdown']}
            )
            if response and response.get('markdown'):
                return response.get('markdown')
        except Exception as e:
            if "429" in str(e):
                wait_time = (attempt + 1) * 10
                logging.info(f"Rate limit hit, waiting {wait_time} seconds...")
                time.sleep(wait_time)
                continue
            logging.error(f"Error scraping {url}: {str(e)}")
        time.sleep(2)
    return None

def get_competitor_data(query):
    """Get competitor data with improved rate limit handling"""
    logging.info(f"\n{'='*50}\nAnalyzing competitors for: {query}\n{'='*50}")
    
    result = {
        "competitors": [],
        "analysis_summary": "",
        "sources": []
    }

    try:
        # Generate competitor analysis prompt
        competitor_prompt = f"""
        Analyze and list exactly 5 main competitors for {query}.
        Return only a JSON object in this exact format:
        {{
            "competitors": [
                {{
                    "name": "Competitor Name",
                    "description": "2-3 sentence description",
                    "strengths": ["strength1", "strength2", "strength3"],
                    "market_position": "Brief market position",
                    "target_market": "Target audience",
                    "unique_features": ["feature1", "feature2"]
                }}
            ],
            "analysis_summary": "Brief market overview"
        }}
        """

        # Get analysis from Gemini
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(competitor_prompt)
        
        if not response or not response.text:
            logging.error("Empty response from Gemini")
            return result

        # Parse response
        analysis_text = response.text.strip()
        if '```json' in analysis_text:
            analysis_text = analysis_text.split('```json')[1].split('```')[0]
        
        analysis = json.loads(analysis_text)
        
        # Validate and merge response
        if isinstance(analysis, dict):
            result["competitors"] = analysis.get("competitors", [])
            result["analysis_summary"] = analysis.get("analysis_summary", "")
            
        return result

    except Exception as e:
        logging.error(f"Error in competitor analysis: {str(e)}")
        return result

def extract_section(text, section_name):
    """Enhanced section extraction to handle ICP data"""
    if not section_name:
        return [line.strip() for line in text.split('\n') if line.strip()]
        
    try:
        lines = text.split('\n')
        section_content = []
        in_section = False
        
        for line in lines:
            if section_name in line:
                in_section = True
                continue
            elif in_section and line.strip() and any(s in line for s in ["Demographics:", "Psychographics:", "Behavior Patterns:"]):
                in_section = False
            elif in_section and line.strip():
                if line.strip().startswith('•'):
                    section_content.append(line.strip()[1:].strip())
                else:
                    section_content.append(line.strip())
                    
        return section_content
    except Exception as e:
        logging.error(f"Error extracting section {section_name}: {str(e)}")
        return []

def extract_domain(url):
    """Extract domain from a URL"""
    try:
        return url.split('/')[2]
    except Exception as e:
        logging.error(f"Error extracting domain: {str(e)}")
        return ""

def create_empty_response():
    return {
        "main_competitors": [],
        "competitor_strengths": [],
        "key_findings": [],
        "sources": []
    }