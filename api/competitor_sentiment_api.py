import logging
from datetime import datetime
import google.generativeai as genai
from googlesearch import search
import requests
from bs4 import BeautifulSoup
import json
import time

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Gemini
GOOGLE_API_KEY = "AIzaSyAE2SKBA38bOktQBdXS6mTK5Y1a-nKB3Mo"
genai.configure(api_key=GOOGLE_API_KEY)

def get_news_content(competitor_name):
    """Get news articles about competitor"""
    try:
        news_items = []
        # Try different search queries to get better results
        search_queries = [
            f"{competitor_name} latest news",
            f"{competitor_name} company news",
            f"{competitor_name} updates",
            f"{competitor_name} business news"
        ]
        
        logger.info(f"Searching news for: {competitor_name}")
        
        for query in search_queries:
            try:
                # Add delay between searches
                time.sleep(1)
                logger.info(f"Trying search query: {query}")
                
                # Get search results
                results = list(search(query, num_results=2))  # 2 results per query = 8 total max
                
                for url in results:
                    try:
                        # Skip unwanted sites
                        skip_domains = ['facebook.com', 'twitter.com', 'linkedin.com', 
                                     'instagram.com', 'youtube.com']
                        if any(domain in url.lower() for domain in skip_domains):
                            continue
                            
                        logger.info(f"Fetching content from: {url}")
                        
                        # Get article content
                        headers = {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                        }
                        response = requests.get(url, headers=headers, timeout=10)
                        soup = BeautifulSoup(response.text, 'html.parser')
                        
                        # Get title
                        title = soup.title.string if soup.title else ''
                        
                        # Try different content selectors
                        content = ""
                        for selector in ['article', 'main', '[role="main"]', '.article-content', '.post-content']:
                            if main_content := soup.select_one(selector):
                                paragraphs = main_content.find_all('p')
                                content = ' '.join([p.get_text().strip() for p in paragraphs 
                                                  if len(p.get_text().strip()) > 50])
                                break
                        
                        # Fallback to all paragraphs if no content found
                        if not content:
                            paragraphs = soup.find_all('p')
                            content = ' '.join([p.get_text().strip() for p in paragraphs 
                                              if len(p.get_text().strip()) > 50])
                        
                        # Only add if we got meaningful content
                        if content and len(content) > 200:
                            # Check for duplicates
                            if not any(item['url'] == url for item in news_items):
                                news_items.append({
                                    'url': url,
                                    'title': title.strip() or 'News Article',
                                    'content': content[:1500],  # Keep more content
                                    'source': url.split('/')[2],
                                    'date': datetime.now().strftime("%Y-%m-%d")
                                })
                                logger.info(f"Added article from: {url}")
                        
                    except Exception as e:
                        logger.error(f"Error processing URL {url}: {e}")
                        continue
                        
            except Exception as e:
                logger.error(f"Error with search query '{query}': {e}")
                continue
        
        if not news_items:
            logger.warning(f"No news found for {competitor_name}")
            return []
            
        logger.info(f"Found {len(news_items)} articles for {competitor_name}")
        return news_items[:4]  # Return top 4 articles
        
    except Exception as e:
        logger.error(f"Error getting news: {e}")
        return []

def analyze_competitor_sentiment(query):
    """Analyze competitor sentiment using Gemini"""
    try:
        logger.info(f"Starting sentiment analysis for: {query}")
        
        # Get competitor news
        news_items = get_news_content(query)
        if not news_items:
            logger.warning(f"No news found for {query}, returning basic response")
            # Return a basic response when no news is found
            return {
                "sentiment_analysis": [{
                    "company": query,
                    "overall_sentiment": "neutral",
                    "sentiment_score": 0,
                    "key_themes": ["No recent news available"],
                    "notable_developments": ["No recent developments found"],
                    "news_sources": []
                }]
            }
            
        # Prepare sentiment analysis prompt
        sentiment_prompt = f"""
        Analyze these news articles about {query} and provide sentiment analysis.
        
        News Articles:
        {json.dumps([{
            'title': item['title'],
            'content': item['content']
        } for item in news_items], indent=2)}
        
        Provide analysis in this exact JSON format:
        {{
            "sentiment_analysis": [
                {{
                    "company": "{query}",
                    "overall_sentiment": "positive/negative/neutral",
                    "sentiment_score": 0.5,
                    "key_themes": [
                        "Theme 1",
                        "Theme 2"
                    ],
                    "notable_developments": [
                        "Development 1",
                        "Development 2"
                    ]
                }}
            ]
        }}
        
        Return only the JSON object, no additional text.
        """
        
        # Get sentiment analysis from Gemini
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(sentiment_prompt)
        
        if not response.parts or not response.parts[0].text:
            logger.error("Empty response from Gemini")
            return None
            
        # Parse response
        response_text = response.parts[0].text.strip()
        
        # Clean up response if needed
        if '```json' in response_text:
            response_text = response_text.split('```json')[1].split('```')[0]
        elif '```' in response_text:
            response_text = response_text.split('```')[1].split('```')[0]
            
        result = json.loads(response_text.strip())
        
        # Add news sources to result
        for analysis in result['sentiment_analysis']:
            analysis['news_sources'] = [{
                'url': item['url'],
                'date': item['date']
            } for item in news_items]
            
        logger.info("Successfully completed sentiment analysis")
        return result
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error: {e}")
        logger.error(f"Raw response: {response_text if 'response_text' in locals() else 'No response'}")
        return None
    except Exception as e:
        logger.error(f"Error in sentiment analysis: {e}")
        return None