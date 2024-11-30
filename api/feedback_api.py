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
    GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY', '')
    if GOOGLE_API_KEY:
        genai.configure(api_key=GOOGLE_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-flash')
        logging.info("Gemini initialized")
    else:
        logging.warning("No Gemini API key found")

def get_feedback_data(business_query):
    """
    Get feedback analysis data using search and Firecrawl
    """
    logging.info(f"\n{'='*50}\nGathering feedback data for: {business_query}\n{'='*50}")
    
    search_queries = [
        f"{business_query} customer reviews analysis",
        f"{business_query} customer feedback summary",
        f"{business_query} user satisfaction",
        f"{business_query} customer complaints",
        f"{business_query} customer experience reviews"
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
        Analyze this content about {business_query} and create a detailed feedback analysis.
        
        Content to analyze:
        {json.dumps(scraped_content, indent=2)}
        
        Provide a structured analysis with these exact sections:

        SATISFACTION METRICS:
        1. Overall Rating:
           - List satisfaction scores and ratings
        2. Key Drivers:
           - List main factors affecting satisfaction
        3. Improvement Areas:
           - List areas needing attention
        4. Positive Aspects:
           - List well-performing areas

        PRODUCT FEEDBACK:
        1. Features:
           - List feedback on specific features
        2. Quality:
           - List quality-related feedback
        3. Usability:
           - List ease-of-use feedback
        4. Value:
           - List price-to-value perceptions

        SERVICE FEEDBACK:
        1. Support Quality:
           - List customer service experiences
        2. Response Time:
           - List feedback on service speed
        3. Resolution Rate:
           - List problem resolution effectiveness
        4. Staff Interaction:
           - List staff-related feedback

        RECOMMENDATIONS:
        1. Quick Wins:
           - List immediate improvement opportunities
        2. Long-term Goals:
           - List strategic improvements needed
        3. Priority Actions:
           - List high-priority fixes
        4. Monitoring Points:
           - List areas to track

        Use only factual information from the content. If making logical inferences, mark them with (Inferred).
        Format each point as a clear, actionable item.
        """
        
        try:
            response = model.generate_content(prompt)
            analysis = response.text
            
            logging.info("\nGemini Analysis Received:")
            logging.info(f"\n{analysis}\n")
            
            return {
                "satisfaction_metrics": extract_section(analysis, "SATISFACTION METRICS"),
                "product_feedback": extract_section(analysis, "PRODUCT FEEDBACK"),
                "service_feedback": extract_section(analysis, "SERVICE FEEDBACK"),
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
            elif any(s + ":" in line for s in ["SATISFACTION METRICS", "PRODUCT FEEDBACK", "SERVICE FEEDBACK", "RECOMMENDATIONS"]):
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
    """Generate basic feedback analysis when no data is found"""
    return {
        "satisfaction_metrics": [
            "Overall satisfaction level needs assessment (Inferred)",
            "Key satisfaction drivers to be identified (Inferred)",
            "Areas for improvement pending analysis (Inferred)"
        ],
        "product_feedback": [
            "Feature effectiveness to be evaluated (Inferred)",
            "Quality metrics need assessment (Inferred)",
            "Usability feedback pending collection (Inferred)"
        ],
        "service_feedback": [
            "Customer service performance to be measured (Inferred)",
            "Response time metrics needed (Inferred)",
            "Support effectiveness to be evaluated (Inferred)"
        ],
        "recommendations": [
            "Implement feedback collection system (Inferred)",
            "Establish performance baselines (Inferred)",
            "Develop improvement tracking (Inferred)"
        ],
        "sources": []
    }

@app.route('/api/feedback-analysis', methods=['POST', 'OPTIONS'])
def analyze_feedback():
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

        feedback_data = get_feedback_data(business_query)
        return jsonify(feedback_data)

    except Exception as e:
        logging.error(f"Error during feedback analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5007, debug=True) 