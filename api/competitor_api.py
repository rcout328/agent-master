from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime
from firecrawl import FirecrawlApp
import google.generativeai as genai
import os
import json

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.DEBUG)

# Initialize Firecrawl and Gemini
FIRECRAWL_API_KEY = "fc-c8fb95d8db884bd38ce266a30b0d11b4"
firecrawl_app = FirecrawlApp(api_key=FIRECRAWL_API_KEY)
logging.info("Firecrawl initialized")

GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY', '')
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
    logging.info("Gemini initialized")
else:
    logging.warning("No Gemini API key found")

def get_competitor_data(query):
    """
    Get competitor data in phases and send updates
    """
    logging.info(f"\n{'='*50}\nAnalyzing competitors for: {query}\n{'='*50}")
    
    result = {
        "main_competitors": [],
        "market_share_data": [],
        "competitor_strengths": [],
        "key_findings": []
    }

    # Phase 1: Get Top Competitors
    logging.info("\nPhase 1: Getting Top Competitors")
    search_query = f"top competitors of {query} list"
    try:
        from googlesearch import search
        competitor_url = next(search(search_query, num_results=1))
        response = firecrawl_app.scrape_url(
            url=competitor_url,
            params={'formats': ['markdown']}
        )
        if response and response.get('markdown'):
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

    # Phase 2: Get Market Share Data
    logging.info("\nPhase 2: Getting Market Share Data")
    search_query = f"{query} competitor market share analysis"
    try:
        market_url = next(search(search_query, num_results=1))
        response = firecrawl_app.scrape_url(
            url=market_url,
            params={'formats': ['markdown']}
        )
        if response and response.get('markdown'):
            prompt = f"""
            Extract market share data for {query} and its competitors.
            Format as: [Company]: [X]%
            Content: {response.get('markdown')}
            """
            market_data = model.generate_content(prompt).text
            result["market_share_data"] = extract_market_data(market_data)
            logging.info(f"Found market share data: {result['market_share_data']}")
    except Exception as e:
        logging.error(f"Error in Phase 2: {str(e)}")

    # Phase 3: Get Competitor Strengths
    logging.info("\nPhase 3: Getting Competitor Strengths")
    search_query = f"{query} competitors strengths advantages comparison"
    try:
        strengths_url = next(search(search_query, num_results=1))
        response = firecrawl_app.scrape_url(
            url=strengths_url,
            params={'formats': ['markdown']}
        )
        if response and response.get('markdown'):
            prompt = f"""
            List the key strengths of {query}'s main competitors.
            Format as: [Competitor Name]: [Key strength]
            Content: {response.get('markdown')}
            """
            strengths = model.generate_content(prompt).text
            result["competitor_strengths"] = extract_section(strengths, "")
            logging.info(f"Found strengths: {result['competitor_strengths']}")
    except Exception as e:
        logging.error(f"Error in Phase 3: {str(e)}")

    # Phase 4: Get Key Findings
    logging.info("\nPhase 4: Getting Key Findings")
    search_query = f"{query} competitive landscape analysis insights"
    try:
        insights_url = next(search(search_query, num_results=1))
        response = firecrawl_app.scrape_url(
            url=insights_url,
            params={'formats': ['markdown']}
        )
        if response and response.get('markdown'):
            prompt = f"""
            Provide 2-3 key insights about {query}'s competitive landscape.
            Format as numbered points.
            Content: {response.get('markdown')}
            """
            findings = model.generate_content(prompt).text
            result["key_findings"] = [{
                'title': f"Competitive Analysis for {query}",
                'snippet': findings,
                'source': "Multiple Sources",
                'date': datetime.now().strftime("%Y-%m-%d")
            }]
            logging.info(f"Found key findings: {findings}")
    except Exception as e:
        logging.error(f"Error in Phase 4: {str(e)}")

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
        for section in ["TOP COMPETITORS:", "MARKET SHARE DATA:", "COMPETITOR STRENGTHS:", "KEY FINDINGS:"]:
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

def extract_market_data(text):
    """Extract market share data"""
    try:
        market_data = []
        section = extract_section(text, "MARKET SHARE DATA")
        
        for line in section:
            if '%' in line:
                parts = line.split(':')
                if len(parts) == 2:
                    company = parts[0].strip('• ').strip()
                    share = float(parts[1].strip('% ').strip())
                    market_data.append({
                        'competitor': company,
                        'share': share
                    })
        return market_data
    except Exception as e:
        logging.error(f"Error extracting market data: {str(e)}")
        return []

def create_empty_response():
    return {
        "main_competitors": [],
        "market_share_data": [],
        "competitor_strengths": [],
        "key_findings": []
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