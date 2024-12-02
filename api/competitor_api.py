from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime
from firecrawl import FirecrawlApp
import google.generativeai as genai
import os
import json
import time

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.DEBUG)

# Initialize Firecrawl and Gemini
FIRECRAWL_API_KEY = "fc-b69d6504ab0a42b79e87b7827a538199"
firecrawl_app = FirecrawlApp(api_key=FIRECRAWL_API_KEY)
logging.info("Firecrawl initialized")

GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY', '')
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
    logging.info("Gemini initialized")

def get_competitor_data(query):
    """
    Get competitor data in phases and send updates
    """
    logging.info(f"\n{'='*50}\nAnalyzing competitors for: {query}\n{'='*50}")
    
    result = {
        "main_competitors": [],
        "competitor_strengths": [],
        "key_findings": [],
        "sources": []
    }

    # Phase 1: Get Top Competitors
    logging.info("\nPhase 1: Getting Top Competitors")
    search_query = f"top competitors of {query} list"
    try:
        from googlesearch import search
        urls = list(search(
            search_query, 
            num_results=10,
            lang="en"
        ))
        
        time.sleep(2)  # Add delay between searches
        
        competitor_url = urls[0] if urls else None
        if competitor_url:
            response = firecrawl_app.scrape_url(
                url=competitor_url,
                params={'formats': ['markdown']}
            )
            if response and response.get('markdown'):
                result["sources"].append({
                    'url': competitor_url,
                    'domain': extract_domain(competitor_url),
                    'section': 'Top Competitors',
                    'date': datetime.now().strftime("%Y-%m-%d")
                })
                
                prompt = f"""
                Analyze this content and list the top 5 competitors of {query}.
                Format each competitor as: [Name] - [Brief description]
                Content: {response.get('markdown')}
                """
                competitors = model.generate_content(prompt).text
                result["main_competitors"] = extract_section(competitors, "")
                logging.info(f"Found competitors: {result['main_competitors']}")
    except Exception as e:
        logging.error(f"Error in Phase 1: {str(e)}")

    # Phase 2: Get Competitor Strengths
    logging.info("\nPhase 2: Getting Competitor Strengths")
    search_query = f"{query} competitors strengths advantages comparison"
    try:
        urls = list(search(
            search_query, 
            num_results=10,
            lang="en"
        ))
        
        time.sleep(2)  # Add delay between searches
        
        strengths_url = urls[0] if urls else None
        if strengths_url:
            response = firecrawl_app.scrape_url(
                url=strengths_url,
                params={'formats': ['markdown']}
            )
            if response and response.get('markdown'):
                result["sources"].append({
                    'url': strengths_url,
                    'domain': extract_domain(strengths_url),
                    'section': 'Competitor Strengths',
                    'date': datetime.now().strftime("%Y-%m-%d")
                })
                
                prompt = f"""
                List the key strengths of {query}'s main competitors.
                Format as: [Competitor Name]: [Key strength]
                Content: {response.get('markdown')}
                """
                strengths = model.generate_content(prompt).text
                result["competitor_strengths"] = extract_section(strengths, "")
                logging.info(f"Found strengths: {result['competitor_strengths']}")
    except Exception as e:
        logging.error(f"Error in Phase 2: {str(e)}")

    # Phase 3: Get Key Findings
    logging.info("\nPhase 3: Getting Key Findings")
    search_query = f"{query} competitive landscape analysis insights"
    try:
        urls = list(search(
            search_query, 
            num_results=10,
            lang="en"
        ))
        
        time.sleep(2)  # Add delay between searches
        
        insights_url = urls[0] if urls else None
        if insights_url:
            response = firecrawl_app.scrape_url(
                url=insights_url,
                params={'formats': ['markdown']}
            )
            if response and response.get('markdown'):
                result["sources"].append({
                    'url': insights_url,
                    'domain': extract_domain(insights_url),
                    'section': 'Key Findings',
                    'date': datetime.now().strftime("%Y-%m-%d")
                })
                
                prompt = f"""
                Provide 2-3 key insights about {query}'s competitive landscape.
                Format as numbered points.
                Content: {response.get('markdown')}
                """
                findings = model.generate_content(prompt).text
                result["key_findings"] = extract_section(findings, "")
                logging.info(f"Found key findings: {findings}")
    except Exception as e:
        logging.error(f"Error in Phase 3: {str(e)}")

    return result

def extract_section(text, section_name):
    """Extract content from a specific section"""
    try:
        # Find section
        start = text.find(section_name + ":")
        if start == -1:
            return []
        
        # Find next section or end
        next_section = float('inf')
        for section in ["TOP COMPETITORS:", "COMPETITOR STRENGTHS:", "KEY FINDINGS:"]:
            if section != section_name + ":":
                pos = text.find(section, start + len(section_name))
                if pos != -1:
                    next_section = min(next_section, pos)
        
        # Extract content
        content = text[start + len(section_name) + 1:next_section if next_section != float('inf') else None]
        
        # Split into lines and clean
        lines = [line.strip() for line in content.strip().split('\n') if line.strip()]
        return lines
    except Exception as e:
        logging.error(f"Error extracting {section_name}: {str(e)}")
        return []

def extract_domain(url):
    """Extract domain from a URL"""
    try:
        return url.split('/')[2]
    except Exception as e:
        logging.error(f"Error extracting domain: {str(e)}")
        return ""

def create_empty_response():
    return {
        "main_competitors": [],
        "competitor_strengths": [],
        "key_findings": [],
        "sources": []
    }

@app.route('/api/competitor-analysis', methods=['POST', 'OPTIONS'])
def analyze_competitors():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        competitor_info = get_competitor_data(query)
        return jsonify(competitor_info)

    except Exception as e:
        logging.error(f"Error during analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True)