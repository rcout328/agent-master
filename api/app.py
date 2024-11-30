from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime
from bs4 import BeautifulSoup
import json
import requests
from googlesearch import search
import time

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.DEBUG)

def get_google_data(query):
    """
    Get data from Google Search using googlesearch module
    """
    logging.info(f"Fetching data for query: {query}")
    
    search_results = []
    try:
        # Perform Google search
        for result in search(f"{query} market analysis", num_results=10, lang="en", advanced=True):
            try:
                # Get webpage content
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
                response = requests.get(result.url, headers=headers, timeout=10)
                if response.ok:
                    soup = BeautifulSoup(response.text, 'html.parser')
                    
                    # Extract title and snippet
                    title = soup.title.string if soup.title else ''
                    snippet = ''
                    main_content = soup.find('main') or soup.find('article') or soup.find('body')
                    if main_content:
                        paragraphs = main_content.find_all('p')
                        snippet = ' '.join([p.text for p in paragraphs[:2]])
                    
                    search_results.append({
                        'title': title,
                        'snippet': snippet,
                        'url': result.url,
                        'date': result.date if hasattr(result, 'date') else ''
                    })
                    
                    time.sleep(2)  # Be nice to servers
            except Exception as e:
                logging.error(f"Error processing result {result.url}: {str(e)}")
                continue
                
    except Exception as e:
        logging.error(f"Error in Google search: {str(e)}")
    
    # Extract market information from search results
    market_info = extract_market_info(search_results, query)
    
    logging.info("Data fetched successfully.")
    return market_info

def extract_market_info(search_results, query):
    """
    Extract and process market information from search results
    """
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
        # Extract market size and growth information from snippets
        snippet = result.get('snippet', '').lower()
        title = result.get('title', '').lower()
        
        # Look for market size information
        if 'market size' in snippet or 'market value' in snippet:
            market_info['market_size'] = extract_market_size(snippet)
        
        # Look for growth rate information
        if 'cagr' in snippet or 'growth rate' in snippet:
            market_info['growth_rate'] = extract_growth_rate(snippet)
        
        # Extract competitor information
        if 'competitor' in title or 'player' in title:
            competitors = extract_competitors(snippet)
            market_info['competitors'].extend(competitors)
        
        # Extract key findings
        market_info['key_findings'].append({
            'title': result.get('title', ''),
            'snippet': result.get('snippet', ''),
            'source': extract_source(result.get('url', '')),
            'date': result.get('date', '')
        })

        # Extract market trends
        if any(keyword in snippet.lower() for keyword in ['trend', 'growth', 'forecast', 'outlook']):
            market_info['market_trends'].append(snippet)

        # Extract industry insights
        if len(snippet) > 100:  # Only meaningful insights
            market_info['industry_insights'].append(snippet)

    return market_info

def extract_source(url):
    """Extract domain name from URL"""
    try:
        from urllib.parse import urlparse
        domain = urlparse(url).netloc
        return domain.replace('www.', '')
    except:
        return url

def extract_market_size(text):
    """
    Extract market size information from text
    """
    import re
    # Look for currency amounts
    currency_pattern = r'\$?\d+(?:\.\d+)?\s*(?:billion|million|trillion|B|M|T)'
    matches = re.findall(currency_pattern, text)
    if matches:
        return matches[0]
    return None

def extract_growth_rate(text):
    """
    Extract growth rate information from text
    """
    import re
    # Look for percentage values
    percentage_pattern = r'\d+(?:\.\d+)?%'
    matches = re.findall(percentage_pattern, text)
    if matches:
        return matches[0]
    return None

def extract_competitors(text):
    """
    Extract competitor information from text
    """
    competitors = []
    # Split text into sentences
    sentences = text.split('.')
    for sentence in sentences:
        if any(keyword in sentence.lower() for keyword in ['competitor', 'player', 'company', 'vendor']):
            # Extract company names (simple approach)
            words = sentence.split()
            for i in range(len(words)-1):
                if words[i][0].isupper():
                    competitors.append(words[i])
    return list(set(competitors))

@app.route('/api/market-analysis', methods=['POST'])
def analyze_market():
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            logging.warning("No query provided.")
            return jsonify({'error': 'No query provided'}), 400

        # Get market data using Google search
        market_info = get_google_data(query)
        
        # Log the market info before returning
        logging.debug(f"Market Info: {market_info}")
        
        # Return the market info
        logging.info("Market analysis completed successfully.")
        return jsonify(market_info)

    except Exception as e:
        logging.error(f"Error during analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)