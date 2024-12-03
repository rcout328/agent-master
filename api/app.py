from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime
from firecrawl import FirecrawlApp
import json
import os
from googlesearch import search
import time
import google.generativeai as genai

app = Flask(__name__)
CORS(app)

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

def get_google_data(query):
    """
    Get data from Google Search and use Firecrawl to scrape content
    """
    logging.info(f"Fetching data for query: {query}")
    
    search_results = []
    scraped_content = []
    
    try:
        # Perform Google search
        for url in search(f"{query} market analysis", num=3):
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
                                'content': content[:2000],  # Limit content size
                                'date': datetime.now().strftime("%Y-%m-%d")
                            })
                            
                            search_results.append({
                                'title': extract_title(content),
                                'snippet': content[:500],
                                'url': url,
                                'date': datetime.now().strftime("%Y-%m-%d")
                            })
                    
                    time.sleep(2)  # Be nice to servers
                    
                except Exception as e:
                    logging.error(f"Error scraping {url}: {str(e)}")
                    continue
                    
    except Exception as e:
        logging.error(f"Error in Google search: {str(e)}")
    
    # Use Gemini to analyze content
    if scraped_content:
        try:
            prompt = f"""
            Analyze this content about {query}'s market and provide key insights.
            
            Content to analyze:
            {[item['content'] for item in scraped_content]}
            
            Extract and structure the following information:
            1. Market Size (with specific numbers if available)
            2. Growth Rate (CAGR or YoY growth)
            3. Key Market Trends
            4. Major Competitors
            5. Industry Insights
            
            Format the response in clear, concise points.
            Mark any inferred information with (Inferred).
            """
            
            response = model.generate_content(prompt)
            analysis = response.text
            
            # Process the analysis
            market_info = {
                "market_size": extract_market_size(analysis),
                "growth_rate": extract_growth_rate(analysis),
                "competitors": extract_competitors(analysis),
                "market_trends": extract_trends(analysis),
                "industry_insights": extract_insights(analysis),
                "key_findings": [{
                    'title': result.get('title', ''),
                    'snippet': result.get('snippet', ''),
                    'source': extract_domain(result.get('url', '')),
                    'date': result.get('date', '')
                } for result in search_results]
            }
            
            return market_info
            
        except Exception as e:
            logging.error(f"Error in Gemini analysis: {str(e)}")
            return generate_fallback_response(query)
    
    return generate_fallback_response(query)

def extract_title(content):
    """Extract title from markdown content"""
    lines = content.split('\n')
    for line in lines:
        if line.strip().startswith('# '):
            return line.strip('# ').strip()
    return "Market Analysis"

def extract_market_size(text):
    """Extract market size from analysis"""
    lines = text.split('\n')
    for line in lines:
        if 'market size' in line.lower():
            return line.strip('- ').strip()
    return None

def extract_growth_rate(text):
    """Extract growth rate from analysis"""
    lines = text.split('\n')
    for line in lines:
        if 'growth rate' in line.lower() or 'cagr' in line.lower():
            return line.strip('- ').strip()
    return None

def extract_trends(text):
    """Extract market trends from analysis"""
    trends = []
    in_trends = False
    for line in text.split('\n'):
        if 'trends' in line.lower():
            in_trends = True
            continue
        if in_trends and line.strip().startswith('-'):
            trends.append(line.strip('- ').strip())
        if in_trends and not line.strip():
            in_trends = False
    return trends

def extract_insights(text):
    """Extract industry insights from analysis"""
    insights = []
    in_insights = False
    for line in text.split('\n'):
        if 'insights' in line.lower():
            in_insights = True
            continue
        if in_insights and line.strip().startswith('-'):
            insights.append(line.strip('- ').strip())
        if in_insights and not line.strip():
            in_insights = False
    return insights

def extract_competitors(text):
    """Extract competitors from analysis"""
    competitors = []
    in_competitors = False
    for line in text.split('\n'):
        if 'competitors' in line.lower():
            in_competitors = True
            continue
        if in_competitors and line.strip().startswith('-'):
            competitors.append(line.strip('- ').strip())
        if in_competitors and not line.strip():
            in_competitors = False
    return competitors

def extract_domain(url):
    """Extract domain name from URL"""
    try:
        from urllib.parse import urlparse
        domain = urlparse(url).netloc
        return domain.replace('www.', '')
    except:
        return url

def generate_fallback_response(query):
    """Generate basic response when analysis fails"""
    return {
        "market_size": f"Market size for {query} pending analysis (Inferred)",
        "growth_rate": "Growth rate pending analysis (Inferred)",
        "competitors": ["Competitor analysis in progress (Inferred)"],
        "market_trends": ["Trend analysis pending (Inferred)"],
        "industry_insights": ["Industry analysis in progress (Inferred)"],
        "key_findings": []
    }

@app.route('/api/market-analysis', methods=['POST'])
def analyze_market():
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        market_info = get_google_data(query)
        return jsonify(market_info)

    except Exception as e:
        logging.error(f"Error during analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)