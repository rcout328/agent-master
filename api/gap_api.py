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
        model = genai.GenerativeModel('gemini-pro')
        logging.info("Gemini initialized")
    else:
        logging.warning("No Gemini API key found")

def get_gap_data(business_query):
    """
    Get gap analysis data using search and Firecrawl
    """
    logging.info(f"\n{'='*50}\nGathering gap analysis data for: {business_query}\n{'='*50}")
    
    search_queries = [
        f"{business_query} business performance analysis",
        f"{business_query} market position analysis",
        f"{business_query} business challenges",
        f"{business_query} growth opportunities",
        f"{business_query} business improvement areas"
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
        Analyze this content about {business_query} and create a detailed gap analysis.
        
        Content to analyze:
        {json.dumps(scraped_content, indent=2)}
        
        Provide a structured analysis with these exact sections:

        CURRENT STATE:
        1. Performance Metrics:
           - List current performance indicators
        2. Resources:
           - List available resources and capabilities
        3. Market Position:
           - List current market standing

        DESIRED STATE:
        1. Target Objectives:
           - List key business goals
        2. Required Capabilities:
           - List needed resources and skills
        3. Market Aspirations:
           - List desired market position

        IDENTIFIED GAPS:
        1. Performance Gaps:
           - List differences between current and desired performance
        2. Resource Gaps:
           - List missing resources and capabilities
        3. Market Position Gaps:
           - List market-related shortcomings

        RECOMMENDATIONS:
        1. Action Items:
           - List specific steps to close gaps
        2. Resource Requirements:
           - List needed investments
        3. Timeline:
           - List implementation phases

        Use only factual information from the content. If making logical inferences, mark them with (Inferred).
        Format each point as a clear, actionable item.
        """
        
        try:
            response = model.generate_content(prompt)
            analysis = response.text
            
            logging.info("\nGemini Analysis Received:")
            logging.info(f"\n{analysis}\n")
            
            return {
                "current_state": extract_section(analysis, "CURRENT STATE"),
                "desired_state": extract_section(analysis, "DESIRED STATE"),
                "identified_gaps": extract_section(analysis, "IDENTIFIED GAPS"),
                "recommendations": extract_section(analysis, "RECOMMENDATIONS"),
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
            elif any(s + ":" in line for s in ["CURRENT STATE", "DESIRED STATE", "IDENTIFIED GAPS", "RECOMMENDATIONS"]):
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
    """Generate basic gap analysis when no data is found"""
    return {
        "current_state": [
            f"Current market position of {business_query} (Inferred)",
            "Existing resources and capabilities (Inferred)",
            "Present performance metrics (Inferred)"
        ],
        "desired_state": [
            "Target market position (Inferred)",
            "Required capabilities and resources (Inferred)",
            "Desired performance levels (Inferred)"
        ],
        "identified_gaps": [
            "Performance improvement areas (Inferred)",
            "Resource and capability needs (Inferred)",
            "Market position enhancement requirements (Inferred)"
        ],
        "recommendations": [
            "Strategic initiatives needed (Inferred)",
            "Resource acquisition plan (Inferred)",
            "Implementation timeline suggestions (Inferred)"
        ],
        "sources": []
    }

@app.route('/api/gap-analysis', methods=['POST', 'OPTIONS'])
def analyze_gap():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.json
        business_query = data.get('query')
        
        if not business_query:
            return jsonify({'error': 'No business query provided'}), 400

        gap_data = get_gap_data(business_query)
        return jsonify(gap_data)

    except Exception as e:
        logging.error(f"Error during gap analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5005, debug=True) 