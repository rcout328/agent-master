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

def get_feature_data(business_query):
    """
    Get feature priority data using search and Firecrawl
    """
    logging.info(f"\n{'='*50}\nGathering feature data for: {business_query}\n{'='*50}")
    
    result = {
        "social_impact": [],
        "economic_impact": [],
        "environmental_impact": [],
        "implementation_priority": [],
        "sources": []
    }
    
    search_queries = [
        f"{business_query} product features analysis",
        f"{business_query} feature prioritization",
        f"{business_query} product roadmap",
        f"{business_query} user requirements",
        f"{business_query} product development priorities"
    ]
    
    scraped_content = []
    max_attempts = 2  # Limit number of attempts per query
    
    for query in search_queries:
        try:
            logging.info(f"\nSearching for: {query}")
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
                                    'section': 'Feature Analysis',
                                    'date': datetime.now().strftime("%Y-%m-%d"),
                                    'content': content[:1000]  # Limit content size
                                })
                                
                                # Create a text file for the scraped content
                                with open(f"{extract_domain(url)}_feature_analysis.txt", "w") as f:
                                    f.write(content)
                                
                                break
                    except Exception as e:
                        if "402" in str(e):  # Credit limit error
                            logging.warning(f"Firecrawl credit limit reached for {url}")
                            scraped_content.append({
                                'url': url,
                                'domain': extract_domain(url),
                                'section': 'Feature Analysis (Limited)',
                                'date': datetime.now().strftime("%Y-%m-%d"),
                                'content': f"Content from {extract_domain(url)} about {business_query}'s features"
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
    
    # Generate feature analysis using scraped content
    if scraped_content:
        try:
            prompt = f"""
            Analyze this content about {business_query}'s features and create a detailed priority analysis.
            
            Content to analyze:
            {[item['content'] for item in scraped_content]}
            
            Provide a structured analysis with these exact sections:

            SOCIAL IMPACT:
            • Community Benefits:
              - List positive community impacts
            • Employment Impact:
              - List job creation effects
            • Social Value:
              - List societal benefits

            ECONOMIC IMPACT:
            • Revenue Potential:
              - List revenue opportunities
            • Market Growth:
              - List expansion possibilities
            • Cost Benefits:
              - List efficiency gains

            ENVIRONMENTAL IMPACT:
            • Sustainability:
              - List green initiatives
            • Resource Usage:
              - List optimization measures
            • Environmental Benefits:
              - List positive impacts

            IMPLEMENTATION PRIORITY:
            • Timeline:
              - List implementation phases
            • Resources:
              - List required resources
            • Success Metrics:
              - List key indicators

            Use factual information where available, mark inferences with (Inferred).
            Format each point as a clear, actionable item.
            """
            
            response = model.generate_content(prompt)
            analysis = response.text
            
            # Extract sections
            result["social_impact"] = extract_section(analysis, "SOCIAL IMPACT")
            result["economic_impact"] = extract_section(analysis, "ECONOMIC IMPACT")
            result["environmental_impact"] = extract_section(analysis, "ENVIRONMENTAL IMPACT")
            result["implementation_priority"] = extract_section(analysis, "IMPLEMENTATION PRIORITY")
            
            # Create a text file for the Gemini output
            with open(f"{business_query}_gemini_analysis.txt", "w") as f:
                f.write(analysis)
            
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