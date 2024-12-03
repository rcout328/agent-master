from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime
from firecrawl import FirecrawlApp
import json
import os
import requests
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
FIRECRAWL_API_KEY = "fc-b69d6504ab0a42b79e87b7827a538199"
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

# Create a folder to store Gemini outputs
output_folder = 'gemini_outputs'
os.makedirs(output_folder, exist_ok=True)

def extract_domain(url):
    """Extract domain name from URL"""
    try:
        from urllib.parse import urlparse
        domain = urlparse(url).netloc
        return domain.replace('www.', '')
    except:
        return url

def get_journey_data(business_query):
    """
    Get customer journey data using custom search API and Firecrawl
    """
    logging.info(f"\n{'='*50}\nGathering journey data for: {business_query}\n{'='*50}")
    
    result = {
        "pre_purchase": [],
        "purchase": [],
        "post_purchase": [],
        "optimization": [],
        "sources": []
    }
    
    search_queries = [
        f"{business_query} customer journey analysis",
        f"{business_query} customer experience touchpoints",
        f"{business_query} customer buying process",
        f"how do customers interact with {business_query}",
        f"{business_query} customer path to purchase"
    ]
    
    scraped_content = []
    max_attempts = 2  # Limit number of attempts per query
    
    for query in search_queries:
        try:
            logging.info(f"\nSearching for: {query}")
            search_results = custom_search(query)
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
                                    'section': 'Journey Analysis',
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
                                'section': 'Journey Analysis (Limited)',
                                'date': datetime.now().strftime("%Y-%m-%d"),
                                'content': f"Content from {extract_domain(url)} about {business_query}'s customer journey"
                            })
                        else:
                            logging.error(f"Error scraping {url}: {str(e)}")
                        attempts += 1
                        continue
            
            time.sleep(2)
            
        except Exception as e:
            logging.error(f"Error in search: {str(e)}")
            continue
    
    # Generate journey analysis using available content
    if scraped_content:
        try:
            prompt = f"""
            Create a detailed customer journey analysis for {business_query} with these exact sections:
            
            PRE-PURCHASE JOURNEY:
            • Awareness phase
            • Research phase
            • Consideration phase
            
            PURCHASE EXPERIENCE:
            • Decision making
            • Checkout process
            • Payment options
            
            POST-PURCHASE JOURNEY:
            • Order confirmation
            • Delivery experience
            • Product usage
            
            OPTIMIZATION OPPORTUNITIES:
            • Pain points
            • Improvement areas
            • Enhancement suggestions
            
            Use factual information where available, mark inferences with (Inferred).
            Format each point as a clear, actionable item.
            """
            
            response = model.generate_content(prompt)
            analysis = response.text
            
            # Extract sections
            result["pre_purchase"] = extract_section(analysis, "PRE-PURCHASE JOURNEY")
            result["purchase"] = extract_section(analysis, "PURCHASE EXPERIENCE")
            result["post_purchase"] = extract_section(analysis, "POST-PURCHASE JOURNEY")
            result["optimization"] = extract_section(analysis, "OPTIMIZATION OPPORTUNITIES")
            
            # Save Gemini output to a text file
            with open(os.path.join(output_folder, 'compitoone.txt'), 'w') as f:
                f.write(analysis)
            
            # Add sources
            result["sources"] = [{
                'url': item['url'],
                'domain': item['domain'],
                'section': item['section'],
                'date': item['date']
            } for item in scraped_content]
            
            return result
            
        except Exception as e:
            logging.error(f"Error generating analysis: {str(e)}")
            return generate_fallback_journey(business_query)
    
    return generate_fallback_journey(business_query)

def custom_search(query):
    """Perform a custom search using the Custom Search API"""
    api_key = "AIzaSyAxeLlJ6vZxOl-TblUJg_dInBS3vNxaFVY"
    search_engine_id = "37793b12975da4e35"
    url = f"https://www.googleapis.com/customsearch/v1?key={api_key}&cx={search_engine_id}&q={query}&num=2"
    
    response = requests.get(url)
    if response.status_code == 200:
        search_results = response.json().get('items', [])
        return [item['link'] for item in search_results]
    else:
        logging.error(f"Error during custom search: {response.status_code} - {response.text}")
        return []

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

def generate_fallback_journey(business_query):
    """Generate basic journey data when no content is found"""
    return {
        "pre_purchase": [
            f"Customers discover {business_query} through various channels (Inferred)",
            "Research phase includes product comparisons (Inferred)",
            "Decision influenced by reviews and ratings (Inferred)"
        ],
        "purchase": [
            "Customer selects desired products (Inferred)",
            "Multiple payment options available (Inferred)",
            "Secure checkout process (Inferred)"
        ],
        "post_purchase": [
            "Order confirmation and tracking (Inferred)",
            "Delivery and fulfillment process (Inferred)",
            "Customer support available (Inferred)"
        ],
        "optimization": [
            "Streamline checkout process (Inferred)",
            "Improve product discovery (Inferred)",
            "Enhance customer support (Inferred)"
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