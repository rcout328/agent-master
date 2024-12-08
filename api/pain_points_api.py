from flask import jsonify
import logging
from datetime import datetime
from firecrawl import FirecrawlApp
import json
import os
import time
import os
import google.generativeai as genai
import logging
import requests

# Import from config instead of combined_api


# Setup logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# API Keys
FIRECRAWL_API_KEY = "fc-43e5dcff501d4aef8cbccfa47b646f57"
GOOGLE_API_KEY = "AIzaSyAE2SKBA38bOktQBdXS6mTK5Y1a-nKB3Mo"

# Initialize Gemini
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY', '')
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
    logging.info("Gemini initialized")
else:
    logging.warning("No Gemini API key found")

# Output directory
output_dir = 'gemini_outputs'
os.makedirs(output_dir, exist_ok=True) 
# Initialize Firecrawl
firecrawl_app = FirecrawlApp(api_key=FIRECRAWL_API_KEY)

def perform_search(query):
    """Use Google Custom Search API instead of direct search"""
    try:
        api_key = "AIzaSyAxeLlJ6vZxOl-TblUJg_dInBS3vNxaFVY"  # Your Custom Search API key
        search_engine_id = "37793b12975da4e35"  # Your Search Engine ID
        
        url = f"https://www.googleapis.com/customsearch/v1?key={api_key}&cx={search_engine_id}&q={query}&num=5"
        
        response = requests.get(url)
        if response.ok:
            results = response.json().get('items', [])
            return [item['link'] for item in results]
        return []
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        return []

def scrape_with_retry(url, max_retries=3):
    """Helper function to scrape URL with retry logic"""
    # Skip problematic domains
    problematic_domains = [
        'linkedin.com',
        'facebook.com', 
        'twitter.com',
        'reddit.com',
        '.pdf'
    ]
    
    if any(domain in url.lower() for domain in problematic_domains):
        logger.info(f"Skipping known problematic URL: {url}")
        return None

    for attempt in range(max_retries):
        try:
            logger.info(f"Attempting to scrape {url}")
            
            # Use Firecrawl with correct parameters
            response = firecrawl_app.scrape_url(
                url=url,
                params={
                    'formats': ['markdown']
                }
            )
            
            if response and response.get('markdown'):
                content = response.get('markdown')
                if len(content.strip()) > 200:  # Verify content quality
                    logger.info(f"Successfully scraped {url}")
                    return content
                else:
                    logger.warning(f"Content too short from {url}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error scraping {url}: {str(e)}")
            if attempt < max_retries - 1:
                time.sleep((attempt + 1) * 2)  # Exponential backoff
            
        time.sleep(1)  # Basic rate limiting
    return None

def analyze_pain_points(query, market_segment=None):
    """Analyze pain points with improved error handling"""
    try:
        logger.info(f"Starting pain points analysis for: {query}")
        
        search_queries = [
            f"{query} customer complaints",
            f"{query} user problems",
            f"{query} service issues"
        ]
        
        feedback_data = []
        for search_query in search_queries:
            logger.info(f"Searching: {search_query}")
            search_results = perform_search(search_query)
            
            for url in search_results:
                content = scrape_with_retry(url)
                if content:
                    feedback_data.append({
                        'source': url,
                        'content': content[:1500]
                    })
                    logger.debug(f"Added content from: {url}")
                time.sleep(1)  # Rate limiting

        # If no data collected, return fallback response
        if not feedback_data:
            return generate_fallback_response(query)

        # 2. Analyze with Gemini
        analysis_prompt = f"""
        Analyze these customer pain points for {query}:

        Data:
        {json.dumps(feedback_data, indent=2)}

        Provide a comprehensive pain points analysis in this JSON format:
        {{
            "major_pain_points": [
                {{
                    "issue": "Issue name",
                    "description": "Detailed description",
                    "severity": "high/medium/low",
                    "frequency": <number>,
                    "impact": "Business impact description",
                    "examples": ["Example 1", "Example 2"]
                }}
            ],
            "categories": [
                {{
                    "name": "Category name",
                    "issues": ["Issue 1", "Issue 2"],
                    "priority": "high/medium/low"
                }}
            ],
            "trends": [
                {{
                    "trend": "Trend description",
                    "direction": "increasing/decreasing",
                    "impact_level": "high/medium/low"
                }}
            ],
            "recommendations": [
                {{
                    "solution": "Solution description",
                    "implementation": "Implementation steps",
                    "expected_impact": "Impact description",
                    "priority": "high/medium/low"
                }}
            ]
        }}

        Focus on real issues found in the data and provide actionable insights.
        """

        logger.info("Sending prompt to Gemini")
        response = model.generate_content(analysis_prompt)
        if not response or not response.text:
            raise Exception("Empty response from Gemini")

        # Parse and clean the response
        analysis_text = response.text.strip()
        if '```json' in analysis_text:
            analysis_text = analysis_text.split('```json')[1].split('```')[0]
        
        analysis = json.loads(analysis_text)
        logger.info("Successfully parsed analysis")

        result = {
            'query': query,
            'market_segment': market_segment,
            'data_sources': len(feedback_data),
            'analysis': analysis,
            'timestamp': datetime.now().isoformat()
        }

        # Save to file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'pain_points_{timestamp}.json'
        filepath = os.path.join(output_dir, filename)
        
        with open(filepath, 'w') as f:
            json.dump(result, f, indent=2)
            logger.info(f"Saved analysis to: {filepath}")

        return result

    except Exception as e:
        logger.error(f"Error analyzing pain points: {str(e)}")
        return generate_fallback_response(query)

def generate_fallback_response(query):
    """Generate basic response when analysis fails"""
    return {
        "analysis": {
            "major_pain_points": [
                {
                    "issue": "Analysis Unavailable",
                    "description": "Unable to fetch real-time data. Using general assessment.",
                    "severity": "medium",
                    "impact": "Please try again later for detailed analysis"
                }
            ],
            "categories": [
                {
                    "name": "General Assessment",
                    "issues": ["Data collection temporarily unavailable"],
                    "priority": "medium"
                }
            ],
            "recommendations": [
                {
                    "solution": "Retry Analysis",
                    "implementation": "Please try again in a few minutes",
                    "expected_impact": "Full analysis results",
                    "priority": "medium"
                }
            ]
        }
    }

# Export the function
__all__ = ['analyze_pain_points']