import os
import json
import requests
from datetime import datetime
from googlesearch import search as gsearch
from bs4 import BeautifulSoup
import google.generativeai as genai
import logging
import time

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Initialize Gemini
FIRECRAWL_API_KEY = "fc-5fadfeae30314d4ea8a3d9afaa75c493"
genai.configure(api_key=FIRECRAWL_API_KEY)

def get_competitor_news(competitor_name):
    """Get news about competitor using Google Search"""
    try:
        news_items = []
        # Simple search query
        search_query = f"{competitor_name} latest news"
        
        logging.info(f"Searching news for: {competitor_name}")
        
        # Get search results
        search_results = gsearch(search_query, num_results=4)
        
        for url in search_results:
            try:
                # Skip social media
                if any(x in url.lower() for x in ['facebook.com', 'twitter.com', 'linkedin.com']):
                    continue
                
                # Get article info
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
                response = requests.get(url, headers=headers, timeout=10)
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Get title
                title = soup.title.string if soup.title else ''
                
                # Add to news items
                news_items.append({
                    'title': title.strip()[:200] if title else 'News Article',
                    'url': url,
                    'source': url.split('/')[2],
                    'date': datetime.now().strftime('%Y-%m-%d')
                })
                
            except Exception as e:
                logging.error(f"Error processing URL {url}: {str(e)}")
                continue
        
        return news_items[:4]  # Return only 4 results
        
    except Exception as e:
        logging.error(f"Error getting news: {str(e)}")
        return []

def scrape_article_content(url):
    """Scrape article content from URL"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
        }
        
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()  # Raise exception for bad status codes
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Get title
        title = soup.title.string if soup.title else ''
        title = title.strip()
        
        # Get date
        date = None
        date_selectors = [
            {'property': 'article:published_time'},
            {'name': 'publishedDate'},
            {'name': 'date'},
            {'class_': 'date'},
            {'class_': 'article-date'},
            {'class_': 'post-date'}
        ]
        
        for selector in date_selectors:
            date_elem = soup.find('meta', selector) or soup.find('time', selector)
            if date_elem:
                date = date_elem.get('content') or date_elem.get('datetime')
                if date:
                    break
        
        # Get content
        content = ""
        # Try article body first
        article = soup.find('article') or soup.find('main') or soup.find(class_=['article-body', 'post-content'])
        
        if article:
            paragraphs = article.find_all('p')
        else:
            # Fallback to all paragraphs
            paragraphs = soup.find_all('p')
        
        # Clean and join paragraphs
        content = ' '.join(
            p.get_text().strip() 
            for p in paragraphs 
            if len(p.get_text().strip()) > 50  # Skip short paragraphs
            and not any(x in p.get_text().lower() for x in ['cookie', 'subscribe', 'sign up'])  # Skip boilerplate
        )
        
        if not content:
            return None
            
        return {
            'title': title[:200],  # Limit title length
            'url': url,
            'date': date or datetime.now().isoformat(),
            'source': url.split('/')[2],
            'content': content[:3000]  # Limit content length but keep more context
        }
        
    except Exception as e:
        logging.error(f"Error scraping {url}: {str(e)}")
        return None

def analyze_competitor_news(competitor_name, news_items):
    """Analyze competitor news using Gemini"""
    try:
        if not news_items:
            return None

        # Prepare news content for analysis
        news_content = []
        for item in news_items:
            news_content.append({
                'title': item['title'],
                'content': item['content'],
                'date': item['date'],
                'source': item['source']
            })

        analysis_prompt = f"""
        Analyze these recent news items about {competitor_name}:
        {json.dumps(news_content, indent=2)}

        Provide a comprehensive analysis in this JSON format:
        {{
            "key_developments": [
                {{
                    "title": "Development title",
                    "description": "Detailed description",
                    "impact": "Market/Industry impact analysis",
                    "date": "Date of development"
                }}
            ],
            "business_metrics": {{
                "growth_indicators": ["indicator1", "indicator2"],
                "market_share_changes": ["change1", "change2"],
                "performance_metrics": ["metric1", "metric2"]
            }},
            "strategic_moves": [
                {{
                    "category": "Category (e.g., Expansion, Product Launch)",
                    "description": "Details of the strategic move",
                    "potential_impact": "Expected impact on market"
                }}
            ],
            "market_position": {{
                "current_status": "Description of current market position",
                "trends": ["trend1", "trend2"],
                "challenges": ["challenge1", "challenge2"]
            }},
            "overall_sentiment": {{
                "score": "numeric_value (-1 to 1)",
                "description": "Detailed sentiment analysis",
                "key_factors": ["factor1", "factor2"]
            }},
            "summary": "Comprehensive analysis summary"
        }}
        """

        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(analysis_prompt)
        
        if not response.parts:
            return None
            
        analysis = json.loads(response.parts[0].text)
        return analysis

    except Exception as e:
        logging.error(f"Error analyzing news: {str(e)}")
        return None

def get_competitor_insights(competitor_name):
    """Get complete competitor insights"""
    try:
        # Get news articles
        news_items = get_competitor_news(competitor_name)
        
        # Analyze news content
        analysis = analyze_competitor_news(competitor_name, news_items)
        
        return {
            'competitor': competitor_name,
            'timestamp': datetime.now().isoformat(),
            'news_items': news_items,
            'analysis': analysis
        }
        
    except Exception as e:
        logging.error(f"Error getting competitor insights: {str(e)}")
        return None 