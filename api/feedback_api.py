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
FIRECRAWL_API_KEY = "fc-c8fb95d8db884bd38ce266a30b0d11b4"
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
    
    result = {
        "satisfaction_metrics": [],
        "product_feedback": [],
        "service_feedback": [],
        "recommendations": [],
        "sources": []
    }
    
    search_queries = [
        f"{business_query} customer reviews analysis",
        f"{business_query} customer feedback summary",
        f"{business_query} user satisfaction",
        f"{business_query} customer complaints",
        f"{business_query} customer experience reviews"
    ]
    
    scraped_content = []
    max_attempts = 2  # Limit number of attempts per query
    
    for query in search_queries:
        try:
            logging.info(f"\nSearching for: {query}")
            # Changed from num to num_results
            search_results = list(search(query, lang="en", num_results=2))
            attempts = 0
            
            for url in search_results:
                if attempts >= max_attempts:
                    break
                    
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
                                    'section': 'Feedback Analysis',
                                    'date': datetime.now().strftime("%Y-%m-%d"),
                                    'content': content[:1000]  # Limit content size
                                })
                                break
                    except Exception as e:
                        if "402" in str(e):  # Credit limit error
                            logging.warning(f"Firecrawl credit limit reached for {url}")
                            scraped_content.append({
                                'url': url,
                                'domain': extract_domain(url),
                                'section': 'Feedback Analysis (Limited)',
                                'date': datetime.now().strftime("%Y-%m-%d"),
                                'content': f"Content from {extract_domain(url)} about {business_query}'s customer feedback"
                            })
                        else:
                            logging.error(f"Error scraping {url}: {str(e)}")
                        attempts += 1
                        continue
            
            time.sleep(2)
            
        except Exception as e:
            logging.error(f"Error in search: {str(e)}")
            continue
    
    # Add sources to result
    result["sources"] = [{
        'url': item['url'],
        'domain': item['domain'],
        'section': item['section'],
        'date': item['date']
    } for item in scraped_content]
    
    # Generate feedback analysis using scraped content
    if scraped_content:
        try:
            prompt = f"""
            Analyze this content about {business_query}'s customer feedback and create a detailed analysis.
            
            Content to analyze:
            {[item['content'] for item in scraped_content]}
            
            Provide a structured analysis with these exact sections:

            SATISFACTION METRICS:
            • Overall Rating:
              - List satisfaction scores and ratings
            • Key Drivers:
              - List main factors affecting satisfaction
            • Improvement Areas:
              - List areas needing attention

            PRODUCT FEEDBACK:
            • Features:
              - List feedback on specific features
            • Quality:
              - List quality-related feedback
            • Usability:
              - List ease-of-use feedback

            SERVICE FEEDBACK:
            • Support Quality:
              - List customer service experiences
            • Response Time:
              - List feedback on service speed
            • Resolution Rate:
              - List problem resolution effectiveness

            RECOMMENDATIONS:
            • Quick Wins:
              - List immediate improvement opportunities
            • Long-term Goals:
              - List strategic improvements needed
            • Priority Actions:
              - List high-priority fixes

            Use factual information where available, mark inferences with (Inferred).
            Format each point as a clear, actionable item.
            """
            
            response = model.generate_content(prompt)
            analysis = response.text
            
            # Extract sections
            result["satisfaction_metrics"] = extract_section(analysis, "SATISFACTION METRICS")
            result["product_feedback"] = extract_section(analysis, "PRODUCT FEEDBACK")
            result["service_feedback"] = extract_section(analysis, "SERVICE FEEDBACK")
            result["recommendations"] = extract_section(analysis, "RECOMMENDATIONS")
            
            return result
            
        except Exception as e:
            logging.error(f"Error generating analysis: {str(e)}")
            return generate_fallback_response(business_query)
    
    return generate_fallback_response(business_query)

def extract_domain(url):
    """Extract domain name from URL"""
    try:
        from urllib.parse import urlparse
        domain = urlparse(url).netloc
        return domain.replace('www.', '')
    except:
        return url

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