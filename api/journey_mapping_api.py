from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime, timedelta
from firecrawl import FirecrawlApp
import json
import os
import time
import google.generativeai as genai
from googlesearch import search
import requests
from urllib.parse import quote

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize APIs
FIRECRAWL_API_KEY = "fc-43e5dcff501d4aef8cbccfa47b646f57"
firecrawl_app = FirecrawlApp(api_key=FIRECRAWL_API_KEY)

GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY', '')
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
    logger.info("Gemini initialized")
else:
    logger.warning("No Gemini API key found")

# Add Google Custom Search configuration
GOOGLE_CSE_API_KEY = "AIzaSyAxeLlJ6vZxOl-TblUJg_dInBS3vNxaFVY"
GOOGLE_CSE_ID = "37793b12975da4e35"

# Add rate limiting configuration
RATE_LIMIT = {
    'requests': 0,
    'reset_time': None,
    'max_requests': 10,  # Adjust based on your plan
    'window': 60  # 60 seconds window
}

def wait_for_rate_limit_reset(reset_time_str):
    """Extract and wait for rate limit reset"""
    try:
        # Parse the reset time from the error message
        reset_time = datetime.strptime(reset_time_str.split('resets at ')[1].split(' GMT')[0], '%a %b %d %Y %H:%M:%S')
        wait_seconds = (reset_time - datetime.now()).total_seconds()
        if wait_seconds > 0:
            logger.info(f"Rate limit hit. Waiting {wait_seconds:.0f} seconds...")
            time.sleep(wait_seconds + 1)  # Add 1 second buffer
    except Exception as e:
        logger.error(f"Error parsing reset time: {e}")
        time.sleep(30)  # Default wait time if parsing fails

def scrape_with_retry(url, max_retries=3, initial_delay=1, max_delay=60):
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
            
            # Use Firecrawl with correct parameters - only include supported params
            response = firecrawl_app.scrape_url(
                url=url,
                params={
                    'formats': ['markdown']  # Only include supported parameters
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
                # Use exponential backoff
                wait_time = min(max_delay, initial_delay * (2 ** attempt))
                logger.info(f"Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
            
        time.sleep(1)  # Basic rate limiting between attempts
    
    return None

def perform_custom_search(query):
    """Perform search using Google Custom Search API"""
    try:
        encoded_query = quote(query)
        url = f"https://www.googleapis.com/customsearch/v1?key={GOOGLE_CSE_API_KEY}&cx={GOOGLE_CSE_ID}&q={encoded_query}&num=5"
        
        response = requests.get(url)
        if response.status_code == 200:
            results = response.json().get('items', [])
            return [item['link'] for item in results]
        else:
            logger.error(f"Custom search API error: {response.status_code}")
            return []
            
    except Exception as e:
        logger.error(f"Custom search error: {str(e)}")
        return []

def get_search_results(query, use_custom_search=False):
    """Get search results with fallback to Custom Search API"""
    try:
        if not use_custom_search:
            try:
                # Try regular search first
                return list(search(query, num_results=3))
            except Exception as e:
                if "429" in str(e):
                    logger.warning("Rate limit hit, falling back to Custom Search API")
                    return perform_custom_search(query)
                raise e
        else:
            return perform_custom_search(query)
            
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        return []

def get_journey_data(query):
    """Get journey mapping data with improved scraping"""
    try:
        logger.info(f"Starting journey analysis for: {query}")
        
        # Reduce number of search queries
        search_queries = [
            f"{query} customer journey touchpoints",
            f"{query} user experience flow"
        ]
        
        journey_data = []
        use_custom_search = False
        
        for search_query in search_queries:
            try:
                # Get fewer results per query
                search_results = get_search_results(search_query, use_custom_search)[:2]
                
                if search_results:
                    # Add delay between searches
                    time.sleep(2)
                    
                    for url in search_results:
                        content = scrape_with_retry(url)
                        if content and len(content.strip()) > 200:
                            journey_data.append({
                                'url': url,
                                'source': url.split('/')[2],
                                'content': content[:1500],  # Reduced content length
                                'date': datetime.now().strftime("%Y-%m-%d")
                            })
                            logger.info(f"Added content from: {url}")
                
            except Exception as e:
                logger.error(f"Search error: {str(e)}")
                if "429" in str(e) and not use_custom_search:
                    use_custom_search = True
                    logger.info("Switching to Custom Search API")
                continue

        if not journey_data:
            logger.warning("No journey data collected, returning fallback")
            return generate_fallback_response(query)

        # Analyze with Gemini
        analysis_prompt = f"""
        Analyze the customer journey for {query} based on this data:
        {json.dumps(journey_data, indent=2)}

        Provide a detailed journey map in this JSON format:
        {{
            "pre_purchase": [
                {{
                    "stage": "Stage name",
                    "touchpoints": ["touchpoint1", "touchpoint2"],
                    "customer_actions": ["action1", "action2"],
                    "pain_points": ["pain1", "pain2"],
                    "opportunities": ["opportunity1", "opportunity2"]
                }}
            ],
            "purchase": [
                {{
                    "stage": "Stage name",
                    "touchpoints": ["touchpoint1", "touchpoint2"],
                    "customer_actions": ["action1", "action2"],
                    "pain_points": ["pain1", "pain2"],
                    "opportunities": ["opportunity1", "opportunity2"]
                }}
            ],
            "post_purchase": [
                {{
                    "stage": "Stage name",
                    "touchpoints": ["touchpoint1", "touchpoint2"],
                    "customer_actions": ["action1", "action2"],
                    "pain_points": ["pain1", "pain2"],
                    "opportunities": ["opportunity1", "opportunity2"]
                }}
            ],
            "optimization": [
                {{
                    "area": "Area name",
                    "current_state": "Description",
                    "target_state": "Description",
                    "recommendations": ["rec1", "rec2"],
                    "priority": "high/medium/low",
                    "expected_impact": "Description"
                }}
            ]
        }}
        """

        response = model.generate_content(analysis_prompt)
        if not response or not response.text:
            raise Exception("Empty response from Gemini")

        # Parse response
        analysis_text = response.text.strip()
        if '```json' in analysis_text:
            analysis_text = analysis_text.split('```json')[1].split('```')[0]
            
        analysis = json.loads(analysis_text)

        result = {
            'query': query,
            'timestamp': datetime.now().isoformat(),
            'journey_map': analysis,
            'sources': [{
                'url': item['url'],
                'source': item['source'],
                'date': item['date']
            } for item in journey_data]
        }

        # Save analysis
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'journey_analysis_{timestamp}.json'
        
        with open(os.path.join('gemini_outputs', filename), 'w') as f:
            json.dump(result, f, indent=2)

        return result

    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        return generate_fallback_response(query)

def generate_fallback_response(query):
    """Generate basic response when analysis fails"""
    return {
        'query': query,
        'timestamp': datetime.now().isoformat(),
        'journey_map': {
            'pre_purchase': [{
                'stage': 'Discovery',
                'touchpoints': ['Website', 'Social Media'],
                'customer_actions': ['Research', 'Compare Options'],
                'pain_points': ['Limited Information'],
                'opportunities': ['Improve Online Presence']
            }],
            'purchase': [{
                'stage': 'Transaction',
                'touchpoints': ['Checkout Process'],
                'customer_actions': ['Place Order'],
                'pain_points': ['Process Complexity'],
                'opportunities': ['Streamline Checkout']
            }],
            'post_purchase': [{
                'stage': 'Support',
                'touchpoints': ['Customer Service'],
                'customer_actions': ['Seek Assistance'],
                'pain_points': ['Response Time'],
                'opportunities': ['Enhance Support']
            }],
            'optimization': [{
                'area': 'General Improvement',
                'current_state': 'Basic Journey',
                'target_state': 'Optimized Experience',
                'recommendations': ['Implement Improvements'],
                'priority': 'medium',
                'expected_impact': 'Better Customer Experience'
            }]
        },
        'sources': []
    }

# Flask route
def journey_mapping_endpoint():
    """Handle journey mapping requests"""
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        result = get_journey_data(query)
        return jsonify(result)

    except Exception as e:
        logger.error(f"Endpoint error: {str(e)}")
        return jsonify({'error': str(e)}), 500 