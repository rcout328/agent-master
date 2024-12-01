from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime
from firecrawl import FirecrawlApp
import json
import re
from googlesearch import search
import time

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.DEBUG)

# Initialize Firecrawl
FIRECRAWL_API_KEY = "fc-c8fb95d8db884bd38ce266a30b0d11b4"
firecrawl_app = FirecrawlApp(api_key=FIRECRAWL_API_KEY)
logging.info("Firecrawl initialized")

def get_google_data(query):
    """
    Get data from Google Search and use Firecrawl to scrape content
    """
    logging.info(f"\n{'='*50}\nFetching data for query: {query}\n{'='*50}")
    
    search_results = []
    sources = []
    
    try:
        # Perform Google search
        logging.info("\nSearching Google for relevant URLs...")
        for url in search(f"{query} market analysis", num_results=5):
            if not any(x in url.lower() for x in ['linkedin', 'facebook', 'twitter']):
                try:
                    logging.info(f"\nScraping URL: {url}")
                    response = firecrawl_app.scrape_url(
                        url=url,
                        params={
                            'formats': ['markdown']
                        }
                    )
                    
                    if response and response.get('markdown'):
                        content = response.get('markdown')
                        logging.info("Successfully scraped content")
                        logging.info(f"Content preview:\n{content[:200]}...\n")
                        
                        sources.append({
                            'url': url,
                            'domain': extract_source(url),
                            'date': datetime.now().strftime("%Y-%m-%d")
                        })
                        
                        search_results.append({
                            'title': extract_title(content),
                            'snippet': content[:500],
                            'url': url,
                            'content': content,
                            'date': datetime.now().strftime("%Y-%m-%d")
                        })
                        
                        time.sleep(2)
                        
                except Exception as e:
                    logging.error(f"Error scraping {url}: {str(e)}")
                    continue
                    
    except Exception as e:
        logging.error(f"Error in Google search: {str(e)}")
    
    # Extract market information from search results
    market_info = extract_market_info(search_results, query)
    market_info['sources'] = sources
    
    logging.info("\nData fetching completed")
    logging.info(f"Found {len(search_results)} valid results")
    return market_info

def extract_title(markdown_content):
    """Extract title from markdown content"""
    lines = markdown_content.split('\n')
    for line in lines:
        if line.strip().startswith('# '):
            return line.strip('# ').strip()
    return "Market Analysis"

def extract_market_info(search_results, query):
    """
    Extract and process market information from search results
    """
    logging.info("\nExtracting market information...")
    
    market_info = {
        "market_size": None,
        "growth_rate": None,
        "competitors": [],
        "trends": [],
        "key_findings": [],
        "market_trends": [],
        "industry_insights": []
    }
    
    for result in search_results:
        content = result.get('content', '').lower()
        
        # Extract market size
        size_matches = re.finditer(r'market\s+size.*?(\$?\d+(?:\.\d+)?\s*(?:billion|million|trillion|B|M|T))', content)
        for match in size_matches:
            market_info['market_size'] = match.group(1)
            break
        
        # Extract growth rate
        growth_matches = re.finditer(r'(?:cagr|growth rate).*?(\d+(?:\.\d+)?%)', content)
        for match in growth_matches:
            market_info['growth_rate'] = match.group(1)
            break
        
        # Extract trends
        trend_paragraphs = re.split(r'\n+', content)
        for para in trend_paragraphs:
            if any(word in para for word in ['trend', 'growing', 'emerging', 'future']):
                market_info['market_trends'].append(para.strip())
        
        # Add key findings
        market_info['key_findings'].append({
            'title': result.get('title', ''),
            'snippet': result.get('snippet', ''),
            'source': extract_source(result.get('url', '')),
            'date': result.get('date', '')
        })
        
        # Extract insights
        if len(result.get('content', '')) > 200:
            market_info['industry_insights'].append(result.get('content', '')[:500])
    
    logging.info("\nExtracted Information:")
    logging.info(f"Market Size: {market_info['market_size']}")
    logging.info(f"Growth Rate: {market_info['growth_rate']}")
    logging.info(f"Found {len(market_info['market_trends'])} market trends")
    logging.info(f"Found {len(market_info['key_findings'])} key findings")
    
    return market_info

def extract_source(url):
    """Extract domain name from URL"""
    try:
        from urllib.parse import urlparse
        domain = urlparse(url).netloc
        return domain.replace('www.', '')
    except:
        return url

@app.route('/api/market-analysis', methods=['POST'])
def analyze_market():
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            logging.warning("No query provided.")
            return jsonify({'error': 'No query provided'}), 400

        # Get market data
        market_info = get_google_data(query)
        
        logging.info("\nAnalysis completed successfully")
        return jsonify(market_info)

    except Exception as e:
        logging.error(f"Error during analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)