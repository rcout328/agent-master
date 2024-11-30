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
        model = genai.GenerativeModel('gemini-1.5-pro')
        logging.info("Gemini initialized")
    else:
        logging.warning("No Gemini API key found")

def get_feature_data(business_query):
    """
    Get feature priority data using search and Firecrawl
    """
    logging.info(f"\n{'='*50}\nGathering feature priority data for: {business_query}\n{'='*50}")
    
    search_queries = [
        f"{business_query} product features analysis",
        f"{business_query} feature prioritization",
        f"{business_query} product roadmap",
        f"{business_query} user requirements",
        f"{business_query} product development priorities"
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
        Analyze this content about {business_query} and create a detailed feature priority analysis.
        
        Content to analyze:
        {json.dumps(scraped_content, indent=2)}
        
        Provide a structured analysis with these exact sections:

        SOCIAL IMPACT:
        1. Community Benefits:
           - List positive community impacts
        2. Employment Impact:
           - List job creation effects
        3. Social Value:
           - List societal benefits
        4. Stakeholder Benefits:
           - List key stakeholder advantages

        ECONOMIC IMPACT:
        1. Revenue Potential:
           - List revenue generation opportunities
        2. Market Growth:
           - List market expansion possibilities
        3. Cost Efficiency:
           - List cost saving opportunities
        4. ROI Metrics:
           - List key performance indicators

        ENVIRONMENTAL IMPACT:
        1. Sustainability:
           - List environmental benefits
        2. Resource Usage:
           - List resource optimization
        3. Green Initiatives:
           - List eco-friendly features
        4. Carbon Footprint:
           - List emission reduction potential

        IMPLEMENTATION PRIORITY:
        1. Timeline:
           - List implementation phases
        2. Resource Needs:
           - List required resources
        3. Risk Factors:
           - List potential challenges
        4. Success Metrics:
           - List measurement criteria

        Use only factual information from the content. If making logical inferences, mark them with (Inferred).
        Format each point as a clear, actionable item.
        """
        
        try:
            response = model.generate_content(prompt)
            analysis = response.text
            
            logging.info("\nGemini Analysis Received:")
            logging.info(f"\n{analysis}\n")
            
            return {
                "social_impact": extract_section(analysis, "SOCIAL IMPACT"),
                "economic_impact": extract_section(analysis, "ECONOMIC IMPACT"),
                "environmental_impact": extract_section(analysis, "ENVIRONMENTAL IMPACT"),
                "implementation_priority": extract_section(analysis, "IMPLEMENTATION PRIORITY"),
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
            elif any(s + ":" in line for s in ["SOCIAL IMPACT", "ECONOMIC IMPACT", "ENVIRONMENTAL IMPACT", "IMPLEMENTATION PRIORITY"]):
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
    """Generate basic feature priority analysis when no data is found"""
    return {
        "social_impact": [
            "Community engagement opportunities (Inferred)",
            "Job creation potential (Inferred)",
            "Social value contribution (Inferred)"
        ],
        "economic_impact": [
            "Revenue growth potential (Inferred)",
            "Market expansion opportunities (Inferred)",
            "Cost optimization possibilities (Inferred)"
        ],
        "environmental_impact": [
            "Sustainability initiatives (Inferred)",
            "Resource efficiency measures (Inferred)",
            "Environmental protection efforts (Inferred)"
        ],
        "implementation_priority": [
            "Phased implementation plan (Inferred)",
            "Resource allocation strategy (Inferred)",
            "Risk mitigation approach (Inferred)"
        ],
        "sources": []
    }

@app.route('/api/feature-priority', methods=['POST', 'OPTIONS'])
def analyze_features():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.json
        business_query = data.get('query')
        
        if not business_query:
            return jsonify({'error': 'No business query provided'}), 400

        feature_data = get_feature_data(business_query)
        return jsonify(feature_data)

    except Exception as e:
        logging.error(f"Error during feature analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5006, debug=True) 