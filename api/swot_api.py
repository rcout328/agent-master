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

def get_swot_data(business_query):
    """
    Get SWOT analysis data using search and Firecrawl
    """
    logging.info(f"\n{'='*50}\nGathering SWOT data for: {business_query}\n{'='*50}")
    
    result = {
        "strengths": [],
        "weaknesses": [],
        "opportunities": [],
        "threats": [],
        "sources": []
    }
    
    search_queries = [
        f"{business_query} SWOT analysis",
        f"{business_query} strengths weaknesses",
        f"{business_query} business analysis",
        f"{business_query} competitive analysis",
        f"{business_query} market position analysis"
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
                                    'section': 'SWOT Analysis',
                                    'date': datetime.now().strftime("%Y-%m-%d"),
                                    'content': content[:1000]  # Limit content size
                                })
                                # Create a text file for the scraped content
                                with open(f"{business_query.replace(' ', '_')}_SWOT_analysis.txt", "a") as f:
                                    f.write(f"URL: {url}\nContent:\n{content}\n\n")
                                break
                    except Exception as e:
                        if "402" in str(e):  # Credit limit error
                            logging.warning(f"Firecrawl credit limit reached for {url}")
                            # Add URL as source even if we can't scrape it
                            scraped_content.append({
                                'url': url,
                                'domain': extract_domain(url),
                                'section': 'SWOT Analysis (Limited)',
                                'date': datetime.now().strftime("%Y-%m-%d"),
                                'content': f"Content from {extract_domain(url)} about {business_query}'s SWOT analysis"
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
    
    # Generate SWOT analysis using scraped content
    if scraped_content:
        try:
            prompt = f"""
            Analyze this content about {business_query} and create a detailed SWOT analysis.
            
            Content to analyze:
            {[item['content'] for item in scraped_content]}
            
            Provide a structured analysis with these exact sections:

            STRENGTHS:
            1. Core Competencies:
               - List unique capabilities and advantages
            2. Market Position:
               - List competitive advantages
            3. Resources:
               - List valuable assets and capabilities

            WEAKNESSES:
            1. Internal Limitations:
               - List operational challenges
            2. Competitive Disadvantages:
               - List areas where competitors are stronger
            3. Resource Gaps:
               - List missing capabilities or resources

            OPPORTUNITIES:
            1. Market Trends:
               - List emerging opportunities
            2. Growth Potential:
               - List expansion possibilities
            3. Innovation Areas:
               - List potential improvements

            THREATS:
            1. Market Risks:
               - List external challenges
            2. Competitive Pressures:
               - List competitor actions
            3. Industry Changes:
               - List disruptive trends

            Use only factual information from the content. If making logical inferences, mark them with (Inferred).
            Format each point as a clear, actionable item.
            """
            
            response = model.generate_content(prompt)
            analysis = response.text
            
            logging.info("\nGemini Analysis Received:")
            logging.info(f"\n{analysis}\n")
            
            # Create a text file for the Gemini analysis
            with open(f"{business_query.replace(' ', '_')}_Gemini_analysis.txt", "w") as f:
                f.write(analysis)
            
            # Extract sections
            result["strengths"] = extract_section(analysis, "STRENGTHS")
            result["weaknesses"] = extract_section(analysis, "WEAKNESSES")
            result["opportunities"] = extract_section(analysis, "OPPORTUNITIES")
            result["threats"] = extract_section(analysis, "THREATS")
            
            return result
            
        except Exception as e:
            logging.error(f"Error in Gemini analysis: {str(e)}")
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
            elif any(s + ":" in line for s in ["STRENGTHS", "WEAKNESSES", "OPPORTUNITIES", "THREATS"]):
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
    """Generate basic SWOT analysis when no data is found"""
    return {
        "strengths": [
            f"Strong market presence (Inferred for {business_query})",
            "Established brand reputation (Inferred)",
            "Quality products/services (Inferred)"
        ],
        "weaknesses": [
            "Limited market coverage (Inferred)",
            "Resource constraints (Inferred)",
            "Areas needing improvement (Inferred)"
        ],
        "opportunities": [
            "Market expansion potential (Inferred)",
            "New product possibilities (Inferred)",
            "Technology adoption (Inferred)"
        ],
        "threats": [
            "Increasing competition (Inferred)",
            "Market uncertainties (Inferred)",
            "Changing consumer preferences (Inferred)"
        ],
        "sources": []
    }

@app.route('/api/swot-analysis', methods=['POST', 'OPTIONS'])
def analyze_swot():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.json
        business_query = data.get('query')
        
        if not business_query:
            return jsonify({'error': 'No business query provided'}), 400

        swot_data = get_swot_data(business_query)
        return jsonify(swot_data)

    except Exception as e:
        logging.error(f"Error during SWOT analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5004, debug=True) 