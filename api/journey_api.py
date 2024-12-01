from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime
from firecrawl import FirecrawlApp
import json
import os
from googlesearch import search
import time

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
    GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY', '')
    if GOOGLE_API_KEY:
        genai.configure(api_key=GOOGLE_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-flash')
        logging.info("Gemini initialized")
    else:
        logging.warning("No Gemini API key found")

def get_journey_data(business_query):
    """
    Get customer journey data using search and Firecrawl
    """
    logging.info(f"\n{'='*50}\nGathering journey data for: {business_query}\n{'='*50}")
    
    search_queries = [
        f"{business_query} customer journey analysis",
        f"{business_query} customer experience touchpoints",
        f"{business_query} customer buying process",
        f"how do customers interact with {business_query}",
        f"{business_query} customer path to purchase"
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
        Analyze this content about {business_query}'s customer journey and create a clear, structured journey map.
        
        Content to analyze:
        {json.dumps(scraped_content, indent=2)}
        
        Provide a structured analysis with these exact sections:

        PRE-PURCHASE JOURNEY:
        1. Awareness Channels:
           - List main channels where customers discover the business
        2. Research Methods:
           - List how customers learn about products/services
        3. Evaluation Process:
           - List how customers compare and evaluate options

        PURCHASE EXPERIENCE:
        1. Decision Factors:
           - List key factors that influence purchase decisions
        2. Purchase Channels:
           - List available purchase methods/locations
        3. Key Touchpoints:
           - List important interaction points during purchase

        POST-PURCHASE JOURNEY:
        1. Initial Experience:
           - List onboarding/setup processes
        2. Ongoing Engagement:
           - List regular interaction points
        3. Loyalty Building:
           - List retention and advocacy activities

        OPTIMIZATION OPPORTUNITIES:
        1. Pain Points:
           - List specific issues at each journey stage
        2. Improvement Areas:
           - List concrete suggestions for enhancement
        3. Success Metrics:
           - List KPIs to measure improvements

        Use only factual information from the content. If making logical inferences, mark them with (Inferred).
        Format each point as a clear, actionable item.
        """
        
        try:
            response = model.generate_content(prompt)
            analysis = response.text
            
            logging.info("\nGemini Analysis Received:")
            logging.info(f"\n{analysis}\n")
            
            return {
                "pre_purchase": extract_section(analysis, "PRE-PURCHASE JOURNEY"),
                "purchase": extract_section(analysis, "PURCHASE EXPERIENCE"),
                "post_purchase": extract_section(analysis, "POST-PURCHASE JOURNEY"),
                "optimization": extract_section(analysis, "OPTIMIZATION OPPORTUNITIES"),
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
            elif any(s + ":" in line for s in ["PRE-PURCHASE JOURNEY", "PURCHASE EXPERIENCE", "POST-PURCHASE JOURNEY", "OPTIMIZATION OPPORTUNITIES"]):
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
    """Generate basic journey map when no data is found"""
    return {
        "pre_purchase": [
            "Awareness: Customers discover through online search (Inferred)",
            "Research: Product/service information gathering (Inferred)",
            "Consideration: Compare with alternatives (Inferred)"
        ],
        "purchase": [
            "Decision Making: Based on value proposition (Inferred)",
            "Purchase Process: Online/offline channels (Inferred)",
            "Interaction Points: Website and customer service (Inferred)"
        ],
        "post_purchase": [
            "Onboarding: Initial setup and guidance (Inferred)",
            "Usage & Support: Regular engagement patterns (Inferred)",
            "Loyalty: Retention programs (Inferred)"
        ],
        "optimization": [
            "Pain Points: Areas identified for improvement (Inferred)",
            "Enhancement Ideas: Suggested optimizations (Inferred)",
            "Key Metrics: Success measurements (Inferred)"
        ],
        "sources": []
    }

@app.route('/api/journey-analysis', methods=['POST', 'OPTIONS'])
def analyze_journey():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.json
        business_query = data.get('query')
        
        if not business_query:
            return jsonify({'error': 'No business query provided'}), 400

        journey_data = get_journey_data(business_query)
        return jsonify(journey_data)

    except Exception as e:
        logging.error(f"Error during journey analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5003, debug=True) 