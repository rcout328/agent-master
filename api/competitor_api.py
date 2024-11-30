from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime
from firecrawl import FirecrawlApp
import google.generativeai as genai
import os
import json

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.DEBUG)

# Initialize Firecrawl and Gemini
FIRECRAWL_API_KEY = "fc-b936b2eb6a3f4d2aaba86486180d41f1"
firecrawl_app = FirecrawlApp(api_key=FIRECRAWL_API_KEY)
logging.info("Firecrawl initialized")

GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY', '')
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel('gemini-')
    logging.info("Gemini initialized")

def get_competitor_data(query)
    """
    Get and analyze competitor data with fallback URLs
    """
    logging.info(f"\n{'='*50}\nAnalyzing competitors for: {query}\n{'='*50}")
    
    # Get multiple URLs as fallbacks
    search_query = f"top competitors for {query}"
    urls = []
    
    try:
        # Get top 3 URLs as fallbacks
        from googlesearch import search
        for url in search(search_query, num_results=3):
            if not any(x in url.lower() for x in ['linkedin', 'facebook', 'twitter', 'instagram']):
                urls.append(url)
                if len(urls) == 3:  # Get 3 URLs for fallback
                    break
        
        logging.info("\nFound URLs for analysis:")
        for url in urls:
            logging.info(f"- {url}")
    
    except Exception as e:
        logging.error(f"Error in Google search: {str(e)}")
        return create_empty_response()
    
    # Try each URL until we get content
    scraped_content = []
    logging.info("\nStarting web scraping:")
    
    for url in urls:
        try:
            logging.info(f"\nTrying to scrape: {url}")
            response = firecrawl_app.scrape_url(
                url=url,
                params={
                    'formats': ['markdown'],
                    'timeout': 30000  # Increased timeout
                }
            )
            
            if response and response.get('markdown'):
                content = response.get('markdown')
                if len(content) > 200:  # Check if content is substantial
                    logging.info(f"Successfully scraped content from {url}")
                    logging.info(f"Content preview:\n{content[:200]}...\n")
                    scraped_content.append({
                        'url': url,
                        'content': content
                    })
                    break  # Stop if we got good content
                else:
                    logging.warning(f"Content too short from {url}, trying next URL")
            else:
                logging.warning(f"No content from {url}, trying next URL")
        
        except Exception as e:
            logging.error(f"Error scraping {url}: {str(e)}")
            logging.info("Trying next URL...")
            continue
    
    if not scraped_content:
        logging.warning("All URLs failed, trying alternative search...")
        # Try alternative search query
        try:
            alt_query = f"{query} competitor analysis market share"
            for url in search(alt_query, num_results=2):
                if not any(x in url.lower() for x in ['linkedin', 'facebook', 'twitter', 'instagram']):
                    try:
                        response = firecrawl_app.scrape_url(
                            url=url,
                            params={'formats': ['markdown']}
                        )
                        
                        if response and response.get('markdown'):
                            content = response.get('markdown')
                            if len(content) > 200:
                                scraped_content.append({
                                    'url': url,
                                    'content': content
                                })
                                logging.info(f"Successfully scraped alternative URL: {url}")
                                break
                    except Exception as e:
                        logging.error(f"Error scraping alternative URL: {str(e)}")
                        continue
        except Exception as e:
            logging.error(f"Error in alternative search: {str(e)}")
    
    if scraped_content:
        logging.info("\nPreparing content for Gemini analysis")
        
        # Prepare prompt for Gemini
        prompt = f"""
        Analyze this article about {query}'s competitors and provide a structured response.

        Sources and content:
        {json.dumps(scraped_content, indent=2)}

        Provide ONLY these sections with this exact formatting:

        TOP COMPETITORS:
        1. [Competitor Name] - [Brief description of what they do and their market position]
        2. [Next Competitor] - [Description]
        (List top 5 most significant competitors only)

        MARKET SHARE DATA:
        • [Company Name]: [X]%
        (List if available in the content)

        COMPETITOR STRENGTHS:
        [Competitor Name]:
        • [Key strength]
        • [Another strength]
        (List main strengths for each top competitor)

        KEY FINDINGS:
        1. [Key insight about the competitive landscape]
        2. [Another key insight]
        (2-3 main findings)

        Use only factual information from the provided content.
        """
        
        try:
            logging.info("Sending to Gemini for analysis...")
            response = model.generate_content(prompt)
            analysis = response.text
            
            logging.info("\nGemini Analysis Received:")
            logging.info(f"\n{analysis}\n")
            
            # Structure the response
            structured_response = {
                "main_competitors": extract_section(analysis, "TOP COMPETITORS"),
                "market_share_data": extract_market_data(analysis),
                "competitor_strengths": extract_section(analysis, "COMPETITOR STRENGTHS"),
                "key_findings": [{
                    'title': f"Competitive Analysis for {query}",
                    'snippet': extract_section(analysis, "KEY FINDINGS"),
                    'source': "Multiple Sources",
                    'date': datetime.now().strftime("%Y-%m-%d")
                }]
            }
            
            logging.info("\nFinal Structured Response:")
            logging.info(json.dumps(structured_response, indent=2))
            
            return structured_response
            
        except Exception as e:
            logging.error(f"Gemini analysis error: {str(e)}")
            return create_empty_response()
    
    logging.warning("No content collected for analysis")
    return create_empty_response()

def extract_section(text, section_name):
    """Extract content from a specific section"""
    try:
        # Find section
        start = text.find(section_name + ":")
        if start == -1:
            return []
        
        # Find next section or end
        next_section = float('inf')
        for section in ["TOP COMPETITORS:", "MARKET SHARE DATA:", "COMPETITOR STRENGTHS:", "KEY FINDINGS:"]:
            if section != section_name + ":":
                pos = text.find(section, start + len(section_name))
                if pos != -1:
                    next_section = min(next_section, pos)
        
        # Extract content
        content = text[start + len(section_name) + 1:next_section if next_section != float('inf') else None]
        
        # Split into lines and clean
        lines = [line.strip() for line in content.strip().split('\n') if line.strip()]
        return lines
    except Exception as e:
        logging.error(f"Error extracting {section_name}: {str(e)}")
        return []

def extract_market_data(text):
    """Extract market share data"""
    try:
        market_data = []
        section = extract_section(text, "MARKET SHARE DATA")
        
        for line in section:
            if '%' in line:
                parts = line.split(':')
                if len(parts) == 2:
                    company = parts[0].strip('• ').strip()
                    share = float(parts[1].strip('% ').strip())
                    market_data.append({
                        'competitor': company,
                        'share': share
                    })
        return market_data
    except Exception as e:
        logging.error(f"Error extracting market data: {str(e)}")
        return []

def create_empty_response():
    return {
        "main_competitors": [],
        "market_share_data": [],
        "competitor_strengths": [],
        "key_findings": []
    }

@app.route('/api/competitor-analysis', methods=['POST', 'OPTIONS'])
def analyze_competitors():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        competitor_info = get_competitor_data(query)
        return jsonify(competitor_info)

    except Exception as e:
        logging.error(f"Error during analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True)