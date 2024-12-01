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

def get_impact_data(business_query):
    """
    Get impact assessment data using search and Firecrawl
    """
    logging.info(f"\n{'='*50}\nGathering impact data for: {business_query}\n{'='*50}")
    
    search_queries = [
        f"{business_query} social impact analysis",
        f"{business_query} environmental impact report",
        f"{business_query} economic impact assessment",
        f"{business_query} sustainability initiatives",
        f"{business_query} community impact"
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
        Analyze this content about {business_query} and create a detailed impact assessment.
        
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
        1. Revenue Generation:
           - List financial benefits
        2. Market Growth:
           - List economic expansion effects
        3. Innovation Impact:
           - List technological advancements
        4. Industry Influence:
           - List sector-wide effects

        ENVIRONMENTAL IMPACT:
        1. Sustainability:
           - List environmental initiatives
        2. Resource Usage:
           - List resource management
        3. Carbon Footprint:
           - List emissions impact
        4. Green Practices:
           - List eco-friendly measures

        LONG-TERM IMPACT:
        1. Future Growth:
           - List development potential
        2. Scalability:
           - List expansion capabilities
        3. Legacy Value:
           - List lasting benefits
        4. Innovation Potential:
           - List future opportunities

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
                "long_term_impact": extract_section(analysis, "LONG-TERM IMPACT"),
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
            elif any(s + ":" in line for s in ["SOCIAL IMPACT", "ECONOMIC IMPACT", "ENVIRONMENTAL IMPACT", "LONG-TERM IMPACT"]):
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
    """Generate basic impact assessment when no data is found"""
    return {
        "social_impact": [
            f"Community engagement potential for {business_query} (Inferred)",
            "Job creation opportunities (Inferred)",
            "Social value contribution possibilities (Inferred)"
        ],
        "economic_impact": [
            "Revenue growth potential (Inferred)",
            "Market expansion opportunities (Inferred)",
            "Innovation possibilities (Inferred)"
        ],
        "environmental_impact": [
            "Sustainability initiatives potential (Inferred)",
            "Resource optimization opportunities (Inferred)",
            "Environmental protection measures (Inferred)"
        ],
        "long_term_impact": [
            "Growth trajectory projection (Inferred)",
            "Scalability assessment needed (Inferred)",
            "Future innovation potential (Inferred)"
        ],
        "sources": []
    }

@app.route('/api/impact-assessment', methods=['POST', 'OPTIONS'])
def analyze_impact():
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

        impact_data = get_impact_data(business_query)
        return jsonify(impact_data)

    except Exception as e:
        logging.error(f"Error during impact assessment: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5009, debug=True) 