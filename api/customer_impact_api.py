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

# Initialize Gemini
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY', '')
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
    logging.info("Gemini initialized")
else:
    logging.warning("No Gemini API key found")

def perform_custom_search(query, max_results=5):
    """Use Google Custom Search API with limited results"""
    try:
        encoded_query = quote(query)
        url = f"https://www.googleapis.com/customsearch/v1?key={GOOGLE_CSE_API_KEY}&cx={GOOGLE_CSE_ID}&q={encoded_query}&num={max_results}"
        
        response = requests.get(url)
        if response.status_code == 200:
            results = response.json().get('items', [])
            return [item['link'] for item in results[:max_results]]
        else:
            logger.error(f"Custom search API error: {response.status_code}")
            return []
            
    except Exception as e:
        logger.error(f"Custom search error: {str(e)}")
        return []

def scrape_with_retry(url, max_retries=3):
    """Helper function to scrape URL with retry logic"""
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
            
            response = firecrawl_app.scrape_url(
                url=url,
                params={
                    'formats': ['markdown']
                }
            )
            
            if response and response.get('markdown'):
                content = response.get('markdown')
                if len(content.strip()) > 200:
                    logger.info(f"Successfully scraped {url}")
                    return content
                else:
                    logger.warning(f"Content too short from {url}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error scraping {url}: {str(e)}")
            if attempt < max_retries - 1:
                time.sleep((attempt + 1) * 2)
            
        time.sleep(1)
    return None

def analyze_customer_impact(company_name):
    """Analyze customer impact through web scraping"""
    try:
        logger.info(f"Starting customer impact analysis for: {company_name}")
        
        # Generate search queries
        search_queries = [
            f"{company_name} customer reviews feedback",
            f"{company_name} customer satisfaction",
            f"{company_name} user experience",
            f"{company_name} customer complaints",
            f"{company_name} market impact"
        ]
        
        research_data = []
        total_urls = 0
        max_total_urls = 10

        for query in search_queries:
            if total_urls >= max_total_urls:
                break
                
            try:
                search_results = perform_custom_search(query, max_results=2)
                
                for url in search_results:
                    if total_urls >= max_total_urls:
                        break
                        
                    content = scrape_with_retry(url)
                    if content:
                        research_data.append({
                            'url': url,
                            'source': url.split('/')[2],
                            'content': content[:1000],
                            'date': datetime.now().strftime("%Y-%m-%d")
                        })
                        total_urls += 1
                        logger.info(f"Added content from: {url} ({total_urls}/{max_total_urls})")
                
                time.sleep(2)
                
            except Exception as e:
                logger.error(f"Search error: {str(e)}")
                continue

        if not research_data:
            logger.warning("No research data collected")
            return generate_fallback_response(company_name)

        # Analyze with Gemini
        analysis_prompt = f"""
        Analyze customer impact for {company_name} based on this research data:
        {json.dumps(research_data, indent=2)}

        Provide a detailed analysis in this JSON format:
        {{
            "customer_sentiment": {{
                "overall_score": number (0-100),
                "positive_aspects": ["aspect1", "aspect2"],
                "negative_aspects": ["aspect1", "aspect2"],
                "sentiment_distribution": {{
                    "positive": number,
                    "neutral": number,
                    "negative": number
                }}
            }},
            "engagement_metrics": {{
                "interaction_level": "High/Medium/Low",
                "key_channels": ["channel1", "channel2"],
                "engagement_trends": ["trend1", "trend2"]
            }},
            "impact_areas": [
                {{
                    "area": "Area name",
                    "impact_level": "High/Medium/Low",
                    "description": "Impact description",
                    "recommendations": ["rec1", "rec2"]
                }}
            ],
            "customer_feedback": [
                {{
                    "category": "Category name",
                    "common_issues": ["issue1", "issue2"],
                    "suggested_improvements": ["improvement1", "improvement2"]
                }}
            ]
        }}
        """

        response = model.generate_content(analysis_prompt)
        if not response or not response.text:
            raise Exception("Empty response from Gemini")

        analysis_text = response.text.strip()
        if '```json' in analysis_text:
            analysis_text = analysis_text.split('```json')[1].split('```')[0]
            
        analysis = json.loads(analysis_text)
        
        # Add sources
        analysis['sources'] = research_data

        # Save analysis
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'customer_impact_{timestamp}.json'
        
        with open(os.path.join('gemini_outputs', filename), 'w') as f:
            json.dump({
                'company': company_name,
                'timestamp': timestamp,
                'analysis': analysis
            }, f, indent=2)

        return analysis

    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        return generate_fallback_response(company_name)

def generate_fallback_response(company_name):
    """Generate basic response when analysis fails"""
    return {
        "customer_sentiment": {
            "overall_score": 50,
            "positive_aspects": ["Analysis unavailable"],
            "negative_aspects": ["Analysis unavailable"],
            "sentiment_distribution": {
                "positive": 33,
                "neutral": 34,
                "negative": 33
            }
        },
        "engagement_metrics": {
            "interaction_level": "Medium",
            "key_channels": ["Analysis unavailable"],
            "engagement_trends": ["Analysis unavailable"]
        },
        "impact_areas": [
            {
                "area": "General",
                "impact_level": "Medium",
                "description": "Analysis unavailable",
                "recommendations": ["Analysis unavailable"]
            }
        ],
        "customer_feedback": [
            {
                "category": "General",
                "common_issues": ["Analysis unavailable"],
                "suggested_improvements": ["Analysis unavailable"]
            }
        ],
        "sources": []
    } 