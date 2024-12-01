from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime
from firecrawl import FirecrawlApp
import json
import os
from googlesearch import search
import time
from dotenv import load_dotenv

# Import Gemini with error handling
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logging.warning("Gemini API not available. Installing required package...")
    os.system('pip install google-generativeai')
    try:
        import google.generativeai as genai
        GEMINI_AVAILABLE = True
    except ImportError:
        logging.error("Failed to install google-generativeai package")
        GEMINI_AVAILABLE = False

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.DEBUG)

# Initialize Firecrawl
FIRECRAWL_API_KEY = "fc-b936b2eb6a3f4d2aaba86486180d41f1"
firecrawl_app = FirecrawlApp(api_key=FIRECRAWL_API_KEY)
logging.info("Firecrawl initialized")

# Initialize Gemini if available
if GEMINI_AVAILABLE:
    load_dotenv()
    GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY', '')
    if GOOGLE_API_KEY:
        genai.configure(api_key=GOOGLE_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-flash')
        logging.info("Gemini initialized")
    else:
        logging.warning("No Gemini API key found")

def get_market_data(business_query):
    """
    Get market assessment data using search and Firecrawl
    """
    logging.info(f"\n{'='*50}\nGathering market data for: {business_query}\n{'='*50}")
    
    search_queries = [
        f"{business_query} market analysis",
        f"{business_query} industry trends",
        f"{business_query} market size revenue",
        f"{business_query} market growth forecast",
        f"{business_query} market opportunities challenges"
    ]
    
    scraped_content = []
    
    for query in search_queries:
        try:
            logging.info(f"\nSearching for: {query}")
            for url in search(query, num=2, stop=2, pause=2.0):
                if not any(x in url.lower() for x in ['linkedin', 'facebook', 'twitter']):
                    try:
                        logging.info(f"Scraping: {url}")
                        response = firecrawl_app.scrape_url(
                            url=url,
                            params={
                                'formats': ['markdown']
                            }
                        )
                        
                        if response and 'markdown' in response:
                            content = response['markdown']
                            if len(content) > 200:
                                logging.info("Successfully scraped content")
                                logging.info(f"Content preview:\n{content[:200]}...\n")
                                scraped_content.append({
                                    'url': url,
                                    'content': content
                                })
                                break
                    except Exception as e:
                        logging.error(f"Error scraping {url}: {str(e)}")
                        continue
            
            time.sleep(2)
            
        except Exception as e:
            logging.error(f"Error in search: {str(e)}")
            continue
    
    if scraped_content:
        logging.info("\nPreparing Gemini analysis")
        
        prompt = f"""
        Analyze this content about {business_query} and create a detailed market assessment.
        
        Content to analyze:
        {json.dumps(scraped_content, indent=2)}
        
        Provide a structured analysis with these exact sections:

        MARKET OVERVIEW:
        1. Market Size:
           - List current market valuation
        2. Growth Rate:
           - List annual growth projections
        3. Market Stage:
           - List market maturity level
        4. Key Regions:
           - List important geographical markets

        MARKET DYNAMICS:
        1. Demand Drivers:
           - List factors driving market growth
        2. Supply Factors:
           - List supply chain insights
        3. Pricing Trends:
           - List pricing dynamics
        4. Market Barriers:
           - List entry barriers and challenges

        COMPETITIVE LANDSCAPE:
        1. Key Players:
           - List major competitors
        2. Market Share:
           - List market share distribution
        3. Competitive Advantages:
           - List key differentiators
        4. Strategic Moves:
           - List recent market activities

        FUTURE OUTLOOK:
        1. Growth Opportunities:
           - List emerging opportunities
        2. Market Threats:
           - List potential risks
        3. Technology Impact:
           - List technological influences
        4. Regulatory Factors:
           - List regulatory considerations

        Use only factual information from the content. If making logical inferences, mark them with (Inferred).
        Format each point as a clear, actionable item.
        """
        
        try:
            response = model.generate_content(prompt)
            analysis = response.text
            
            logging.info("\nGemini Analysis Received:")
            logging.info(f"\n{analysis}\n")
            
            return {
                "market_overview": extract_section(analysis, "MARKET OVERVIEW"),
                "market_dynamics": extract_section(analysis, "MARKET DYNAMICS"),
                "competitive_landscape": extract_section(analysis, "COMPETITIVE LANDSCAPE"),
                "future_outlook": extract_section(analysis, "FUTURE OUTLOOK"),
                "sources": [{'url': item['url']} for item in scraped_content]
            }
            
        except Exception as e:
            logging.error(f"Error in Gemini analysis: {str(e)}")
            return generate_fallback_response(business_query)
    
    return generate_fallback_response(business_query)

def extract_section(text, section_name):
    """Extract content from a specific section"""
    try:
        lines = []
        in_section = False
        
        for line in text.split('\n'):
            if section_name + ":" in line:
                in_section = True
                continue
            elif any(s + ":" in line for s in ["MARKET OVERVIEW", "MARKET DYNAMICS", "COMPETITIVE LANDSCAPE", "FUTURE OUTLOOK"]):
                in_section = False
            elif in_section and line.strip():
                cleaned_line = line.strip('- *').strip()
                if cleaned_line and not cleaned_line.endswith(':'):
                    lines.append(cleaned_line)
        
        return lines
    except Exception as e:
        logging.error(f"Error extracting section {section_name}: {str(e)}")
        return []

def generate_fallback_response(business_query):
    """Generate basic market assessment when no data is found"""
    return {
        "market_overview": [
            f"Market size estimation pending for {business_query} (Inferred)",
            "Growth rate to be determined (Inferred)",
            "Market stage analysis needed (Inferred)"
        ],
        "market_dynamics": [
            "Demand factors under analysis (Inferred)",
            "Supply chain assessment pending (Inferred)",
            "Pricing trends to be evaluated (Inferred)"
        ],
        "competitive_landscape": [
            "Competitor analysis in progress (Inferred)",
            "Market share data collection needed (Inferred)",
            "Competitive positioning pending (Inferred)"
        ],
        "future_outlook": [
            "Growth opportunities being identified (Inferred)",
            "Risk assessment in progress (Inferred)",
            "Technology impact evaluation pending (Inferred)"
        ],
        "sources": []
    }

@app.route('/api/market-assessment', methods=['POST', 'OPTIONS'])
def analyze_market():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        # Check if Gemini is properly configured
        if not GEMINI_AVAILABLE or not os.getenv('GOOGLE_API_KEY'):
            return jsonify({
                'error': 'Gemini API not properly configured. Please check your API key.'
            }), 500

        data = request.json
        business_query = data.get('query')
        
        if not business_query:
            return jsonify({'error': 'No business query provided'}), 400

        market_data = get_market_data(business_query)
        return jsonify(market_data)

    except Exception as e:
        logging.error(f"Error during market assessment: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5008, debug=True) 