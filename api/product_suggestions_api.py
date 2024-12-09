import logging
from datetime import datetime
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
FIRECRAWL_API_KEY = "fc-5fadfeae30314d4ea8a3d9afaa75c493"
firecrawl_app = FirecrawlApp(api_key=FIRECRAWL_API_KEY)

# Google Custom Search configuration
GOOGLE_CSE_API_KEY = "AIzaSyAxeLlJ6vZxOl-TblUJg_dInBS3vNxaFVY"
GOOGLE_CSE_ID = "37793b12975da4e35"

# Initialize Gemini
GOOGLE_API_KEY = "AIzaSyAE2SKBA38bOktQBdXS6mTK5Y1a-nKB3Mo"
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')
logger.info("Gemini initialized")

def perform_custom_search(query, max_results=5):
    """Use Google Custom Search API with limited results"""
    try:
        encoded_query = quote(query)
        url = f"https://www.googleapis.com/customsearch/v1?key={GOOGLE_CSE_API_KEY}&cx={GOOGLE_CSE_ID}&q={encoded_query}&num={max_results}"
        
        response = requests.get(url)
        if response.status_code == 200:
            results = response.json().get('items', [])
            # Limit to max_results
            return [item['link'] for item in results[:max_results]]
        else:
            logger.error(f"Custom search API error: {response.status_code}")
            return []
            
    except Exception as e:
        logger.error(f"Custom search error: {str(e)}")
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

def analyze_product_suggestions(product_details):
    """Analyze product with Gemini-generated search queries and user-provided URL"""
    try:
        logger.info(f"Starting product analysis for: {product_details['name']}")
        
        # First, ask Gemini to generate search queries
        search_query_prompt = f"""
        Analyze this product and create 5 specific search queries for research:

        Product Details:
        Name: {product_details['name']}
        Description: {product_details['description']}
        Current Features: {product_details['currentFeatures']}
        Target Market: {product_details['targetMarket']}
        Challenges: {product_details['mainChallenges']}
        Product URL: {product_details.get('product_url', 'Not provided')}

        Create exactly 5 search queries that will help find information about:
        1. Market position and competition
        2. Customer feedback and pain points
        3. Latest technology trends
        4. Feature comparisons
        5. Innovation opportunities

        Return ONLY the 5 search queries in a JSON array format, like:
        ["query 1", "query 2", "query 3", "query 4", "query 5"]
        """

        # Get search queries from Gemini
        query_response = model.generate_content(search_query_prompt)
        if not query_response or not query_response.text:
            raise Exception("Failed to generate search queries")

        # Parse the queries
        query_text = query_response.text.strip()
        if '```json' in query_text:
            query_text = query_text.split('```json')[1].split('```')[0]
        
        search_queries = json.loads(query_text)
        
        # Ensure exactly 5 queries
        if len(search_queries) != 5:
            logger.warning(f"Got {len(search_queries)} queries, adjusting to 5")
            if len(search_queries) > 5:
                search_queries = search_queries[:5]
            else:
                # Add generic queries if less than 5
                while len(search_queries) < 5:
                    search_queries.append(f"{product_details['name']} market analysis")

        logger.info("Generated search queries:")
        for i, query in enumerate(search_queries, 1):
            logger.info(f"{i}. {query}")
        
        # Use the generated queries for research
        research_data = []
        total_urls = 0
        max_total_urls = 20  # Adjust as needed

        # First, scrape user-provided URL if available
        if 'product_url' in product_details and product_details['product_url']:
            logger.info(f"Scraping user-provided URL: {product_details['product_url']}")
            content = scrape_with_retry(product_details['product_url'])
            if content:
                research_data.append({
                    'url': product_details['product_url'],
                    'source': product_details['product_url'].split('/')[2],
                    'content': content[:1000],
                    'date': datetime.now().strftime("%Y-%m-%d"),
                    'type': 'user_provided'  # Mark as user provided
                })
                total_urls += 1
                logger.info(f"Added content from user-provided URL ({total_urls}/{max_total_urls})")
            else:
                logger.warning("Failed to scrape user-provided URL")

        # Then proceed with search queries...
        max_urls_per_query = 2
        for query in search_queries:
            if total_urls >= max_total_urls:
                break
                
            try:
                search_results = perform_custom_search(query, max_results=max_urls_per_query)
                
                for url in search_results:
                    if total_urls >= max_total_urls:
                        break
                        
                    # Skip if URL is same as user-provided
                    if 'product_url' in product_details and url == product_details['product_url']:
                        continue
                        
                    content = scrape_with_retry(url)
                    if content:
                        research_data.append({
                            'url': url,
                            'source': url.split('/')[2],
                            'content': content[:1000],
                            'date': datetime.now().strftime("%Y-%m-%d"),
                            'type': 'search_result'
                        })
                        total_urls += 1
                        logger.info(f"Added content from: {url} ({total_urls}/{max_total_urls})")
                
                time.sleep(2)
                
            except Exception as e:
                logger.error(f"Search error for query '{query}': {str(e)}")
                continue

        if not research_data:
            logger.warning("No research data collected")
            return generate_fallback_response(product_details)

        # Analyze with Gemini - provide focused data
        analysis_prompt = f"""
        Analyze product enhancement opportunities for {product_details['name']} based on:

        Product Details:
        {json.dumps(product_details, indent=2)}

        Research Data (from {len(research_data)} sources):
        {json.dumps(research_data, indent=2)}

        Provide concise suggestions in this JSON format:
        {{
            "suggestions": [
                {{
                    "title": "Enhancement title",
                    "description": "Brief description",
                    "benefits": ["key benefit 1", "key benefit 2"],
                    "priority": "high/medium/low"
                }}
            ],
            "market_insights": {{
                "trends": ["trend1", "trend2"],
                "competitor_activities": ["activity1", "activity2"]
            }}
        }}
        
        Focus on the most impactful suggestions based on the available data.
        """

        response = model.generate_content(analysis_prompt)
        if not response or not response.text:
            raise Exception("Empty response from Gemini")

        # Parse response
        analysis_text = response.text.strip()
        if '```json' in analysis_text:
            analysis_text = analysis_text.split('```json')[1].split('```')[0]
            
        analysis = json.loads(analysis_text)
        
        # Add sources
        analysis['sources'] = [
            {
                'url': data['url'],
                'source': data['source'],
                'date': data['date']
            } for data in research_data
        ]

        return analysis

    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        return generate_fallback_response(product_details)

def generate_fallback_response(product_details):
    """Generate basic response when analysis fails"""
    return {
        'suggestions': [
            {
                'title': 'Basic Enhancement Suggestion',
                'description': f'Consider improving {product_details["name"]} based on current market trends',
                'benefits': ['Potential market growth', 'Customer satisfaction'],
                'priority': 'medium',
                'implementation_complexity': 'To be determined',
                'estimated_impact': 'Moderate improvement in product performance'
            }
        ],
        'market_insights': {
            'trends': ['Analysis unavailable'],
            'competitor_activities': ['Analysis unavailable'],
            'customer_needs': ['Analysis unavailable']
        },
        'sources': []
    } 