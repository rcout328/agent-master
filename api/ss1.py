from googlesearch import search
import time
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from firecrawl import FirecrawlApp
import json
import os
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
FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY", "fc-b936b2eb6a3f4d2aaba86486180d41f1")
firecrawl_app = FirecrawlApp(api_key=FIRECRAWL_API_KEY)
logging.info("Firecrawl initialized")

# Initialize Gemini if available
if GEMINI_AVAILABLE:
    load_dotenv()
    GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY', '')
    if GOOGLE_API_KEY:
        genai.configure(api_key=GOOGLE_API_KEY)
        model = genai.GenerativeModel('gemini-pro')
        logging.info("Gemini initialized")
    else:
        logging.warning("No Gemini API key found")

# Common helper functions
def scrape_content(search_queries):
    scraped_content = []
    for query in search_queries:
        try:
            logging.info(f"\nSearching for: {query}")
            search_results = list(search(query, lang="en", num_results=2))
            
            for url in search_results:
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
    
    if not scraped_content:
        logging.warning("No content found for any search query")
        return [{
            'url': 'fallback',
            'content': f'No specific data found for {search_queries[0]}. Using general industry knowledge.'
        }]
        
    return scraped_content

def extract_section(text, section_name):
    """Extract content from a specific section"""
    try:
        lines = []
        in_section = False
        
        for line in text.split('\n'):
            if section_name + ":" in line:
                in_section = True
                continue
            elif any(s + ":" in line for s in [
                "SOCIAL IMPACT", "ECONOMIC IMPACT", "ENVIRONMENTAL IMPACT", "LONG-TERM IMPACT",
                "DEMOGRAPHICS", "PSYCHOGRAPHICS", "PROFESSIONAL CHARACTERISTICS", "PAIN POINTS",
                "PRE-PURCHASE JOURNEY", "PURCHASE EXPERIENCE", "POST-PURCHASE JOURNEY", "OPTIMIZATION OPPORTUNITIES",
                "CURRENT TRENDS", "EMERGING TRENDS", "COMPETITIVE TRENDS", "RECOMMENDATIONS"
            ]):
                in_section = False
            elif in_section and line.strip():
                cleaned_line = line.strip('- *').strip()
                if cleaned_line and not cleaned_line.endswith(':'):
                    lines.append(cleaned_line)
        
        return lines
    except Exception as e:
        logging.error(f"Error extracting section {section_name}: {str(e)}")
        return []

# Competitor Analysis Endpoints
@app.route('/api/competitor-analysis', methods=['POST', 'OPTIONS'])
def analyze_competitors():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        search_queries = [
            f"{query} competitors analysis",
            f"{query} market share data",
            f"{query} competitive landscape",
            f"{query} industry competitors"
        ]
        
        scraped_content = scrape_content(search_queries)
        
        if not scraped_content:
            return jsonify({
                'error': 'No data found for the given query'
            }), 404
            
        prompt = f"""
        Analyze competitors for {query} and provide:
        1. Main competitors (top 5)
        2. Market share data
        3. Competitor strengths
        4. Key findings
        
        Content to analyze: {json.dumps(scraped_content)}
        """
        
        response = model.generate_content(prompt)
        analysis = response.text
        
        return jsonify({
            "main_competitors": extract_section(analysis, "Main competitors"),
            "market_share_data": extract_section(analysis, "Market share data"),
            "competitor_strengths": extract_section(analysis, "Competitor strengths"),
            "key_findings": extract_section(analysis, "Key findings")
        })

    except Exception as e:
        logging.error(f"Error during analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

# ICP Analysis Endpoint
@app.route('/api/icp-analysis', methods=['POST', 'OPTIONS'])
def analyze_icp():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        search_queries = [
            f"{query} customer profile demographics",
            f"{query} target market analysis",
            f"{query} customer persona"
        ]
        
        scraped_content = scrape_content(search_queries)
        
        if not scraped_content:
            return jsonify({
                'error': 'No data found for the given query'
            }), 404
            
        prompt = f"""
        Create ICP analysis for {query} with sections:
        1. Demographics
        2. Psychographics
        3. Professional Characteristics
        4. Pain Points & Needs
        
        Content to analyze: {json.dumps(scraped_content)}
        """
        
        response = model.generate_content(prompt)
        analysis = response.text
        
        return jsonify({
            "demographics": extract_section(analysis, "Demographics"),
            "psychographics": extract_section(analysis, "Psychographics"),
            "professional": extract_section(analysis, "Professional Characteristics"),
            "pain_points": extract_section(analysis, "Pain Points & Needs")
        })

    except Exception as e:
        logging.error(f"Error during analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Journey Analysis Endpoint
@app.route('/api/journey-analysis', methods=['POST', 'OPTIONS'])
def analyze_journey():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        search_queries = [
            f"{query} customer journey analysis",
            f"{query} customer experience touchpoints",
            f"{query} customer buying process"
        ]
        
        scraped_content = scrape_content(search_queries)
        
        if not scraped_content:
            return jsonify({
                'error': 'No data found for the given query'
            }), 404
            
        prompt = f"""
        Create customer journey map for {query} with sections:
        1. Pre-Purchase Journey
        2. Purchase Experience
        3. Post-Purchase Journey
        4. Optimization Opportunities
        
        Content to analyze: {json.dumps(scraped_content)}
        """
        
        response = model.generate_content(prompt)
        analysis = response.text
        
        return jsonify({
            "pre_purchase": extract_section(analysis, "Pre-Purchase Journey"),
            "purchase": extract_section(analysis, "Purchase Experience"),
            "post_purchase": extract_section(analysis, "Post-Purchase Journey"),
            "optimization": extract_section(analysis, "Optimization Opportunities")
        })

    except Exception as e:
        logging.error(f"Error during analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Add SWOT Analysis Endpoint
@app.route('/api/swot-analysis', methods=['POST', 'OPTIONS'])
def analyze_swot():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        search_queries = [
            f"{query} SWOT analysis",
            f"{query} strengths weaknesses",
            f"{query} opportunities threats",
            f"{query} competitive analysis"
        ]
        
        scraped_content = scrape_content(search_queries)
        
        if not scraped_content:
            return jsonify({
                'error': 'No data found for the given query'
            }), 404
            
        prompt = f"""
        Create SWOT analysis for {query} with sections:
        1. Strengths
        2. Weaknesses
        3. Opportunities
        4. Threats
        
        Content to analyze: {json.dumps(scraped_content)}
        """
        
        response = model.generate_content(prompt)
        analysis = response.text
        
        return jsonify({
            "strengths": extract_section(analysis, "Strengths"),
            "weaknesses": extract_section(analysis, "Weaknesses"),
            "opportunities": extract_section(analysis, "Opportunities"),
            "threats": extract_section(analysis, "Threats"),
            "sources": [{'url': item['url']} for item in scraped_content]
        })

    except Exception as e:
        logging.error(f"Error during analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Add Gap Analysis Endpoint
@app.route('/api/gap-analysis', methods=['POST', 'OPTIONS'])
def analyze_gap():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        search_queries = [
            f"{query} current state analysis",
            f"{query} desired state goals",
            f"{query} performance gaps",
            f"{query} improvement areas"
        ]
        
        scraped_content = scrape_content(search_queries)
        
        if not scraped_content:
            return jsonify({
                'error': 'No data found for the given query'
            }), 404
            
        prompt = f"""
        Create gap analysis for {query} with sections:
        1. Current State
        2. Desired State
        3. Identified Gaps
        4. Recommendations
        
        Content to analyze: {json.dumps(scraped_content)}
        """
        
        response = model.generate_content(prompt)
        analysis = response.text
        
        return jsonify({
            "current_state": extract_section(analysis, "Current State"),
            "desired_state": extract_section(analysis, "Desired State"),
            "identified_gaps": extract_section(analysis, "Identified Gaps"),
            "recommendations": extract_section(analysis, "Recommendations"),
            "sources": [{'url': item['url']} for item in scraped_content]
        })

    except Exception as e:
        logging.error(f"Error during analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Add Feature Priority Endpoint
@app.route('/api/feature-priority', methods=['POST', 'OPTIONS'])
def analyze_features():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        search_queries = [
            f"{query} feature prioritization",
            f"{query} product roadmap",
            f"{query} feature analysis",
            f"{query} development priorities"
        ]
        
        scraped_content = scrape_content(search_queries)
        
        if not scraped_content:
            return jsonify({
                'error': 'No data found for the given query'
            }), 404
            
        prompt = f"""
        Create feature priority analysis for {query} with sections:
        1. Social Impact
        2. Economic Impact
        3. Environmental Impact
        4. Implementation Priority
        
        Content to analyze: {json.dumps(scraped_content)}
        """
        
        response = model.generate_content(prompt)
        analysis = response.text
        
        return jsonify({
            "social_impact": extract_section(analysis, "Social Impact"),
            "economic_impact": extract_section(analysis, "Economic Impact"),
            "environmental_impact": extract_section(analysis, "Environmental Impact"),
            "implementation_priority": extract_section(analysis, "Implementation Priority"),
            "sources": [{'url': item['url']} for item in scraped_content]
        })

    except Exception as e:
        logging.error(f"Error during analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Add Feedback Analysis Endpoint
@app.route('/api/feedback-analysis', methods=['POST', 'OPTIONS'])
def analyze_feedback():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        search_queries = [
            f"{query} customer feedback",
            f"{query} user reviews",
            f"{query} customer satisfaction",
            f"{query} user experience"
        ]
        
        scraped_content = scrape_content(search_queries)
        
        if not scraped_content:
            return jsonify({
                'error': 'No data found for the given query'
            }), 404
            
        prompt = f"""
        Create feedback analysis for {query} with sections:
        1. Satisfaction Metrics
        2. Product Feedback
        3. Service Feedback
        4. Recommendations
        
        Content to analyze: {json.dumps(scraped_content)}
        """
        
        response = model.generate_content(prompt)
        analysis = response.text
        
        return jsonify({
            "satisfaction_metrics": extract_section(analysis, "Satisfaction Metrics"),
            "product_feedback": extract_section(analysis, "Product Feedback"),
            "service_feedback": extract_section(analysis, "Service Feedback"),
            "recommendations": extract_section(analysis, "Recommendations"),
            "sources": [{'url': item['url']} for item in scraped_content]
        })

    except Exception as e:
        logging.error(f"Error during analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Add Market Assessment Endpoint
@app.route('/api/market-assessment', methods=['POST', 'OPTIONS'])
def analyze_market():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        search_queries = [
            f"{query} market analysis",
            f"{query} market size",
            f"{query} market trends",
            f"{query} market opportunities"
        ]
        
        scraped_content = scrape_content(search_queries)
        
        if not scraped_content:
            return jsonify({
                'error': 'No data found for the given query'
            }), 404
            
        prompt = f"""
        Create market assessment for {query} with sections:
        1. Market Overview
        2. Market Dynamics
        3. Competitive Landscape
        4. Future Outlook
        
        Content to analyze: {json.dumps(scraped_content)}
        """
        
        response = model.generate_content(prompt)
        analysis = response.text
        
        return jsonify({
            "market_overview": extract_section(analysis, "Market Overview"),
            "market_dynamics": extract_section(analysis, "Market Dynamics"),
            "competitive_landscape": extract_section(analysis, "Competitive Landscape"),
            "future_outlook": extract_section(analysis, "Future Outlook"),
            "sources": [{'url': item['url']} for item in scraped_content]
        })

    except Exception as e:
        logging.error(f"Error during analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Add Impact Assessment Endpoint
@app.route('/api/impact-assessment', methods=['POST', 'OPTIONS'])
def analyze_impact():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        search_queries = [
            f"{query} social impact",
            f"{query} economic impact",
            f"{query} environmental impact",
            f"{query} long term impact"
        ]
        
        scraped_content = scrape_content(search_queries)
        
        if not scraped_content:
            return jsonify({
                'error': 'No data found for the given query'
            }), 404
            
        prompt = f"""
        Create impact assessment for {query} with sections:
        1. Social Impact
        2. Economic Impact
        3. Environmental Impact
        4. Long-term Impact
        
        Content to analyze: {json.dumps(scraped_content)}
        """
        
        response = model.generate_content(prompt)
        analysis = response.text
        
        return jsonify({
            "social_impact": extract_section(analysis, "Social Impact"),
            "economic_impact": extract_section(analysis, "Economic Impact"),
            "environmental_impact": extract_section(analysis, "Environmental Impact"),
            "long_term_impact": extract_section(analysis, "Long-term Impact"),
            "sources": [{'url': item['url']} for item in scraped_content]
        })

    except Exception as e:
        logging.error(f"Error during analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Add Market Trends Analysis Endpoint
@app.route('/api/market-trends', methods=['POST', 'OPTIONS'])
def analyze_trends():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        search_queries = [
            f"{query} market trends analysis",
            f"{query} industry trends",
            f"{query} emerging trends",
            f"{query} future market predictions",
            f"{query} market growth trends"
        ]
        
        scraped_content = scrape_content(search_queries)
        
        if not scraped_content:
            return jsonify({
                'error': 'No data found for the given query'
            }), 404
            
        prompt = f"""
        Create comprehensive market trends analysis for {query} with these exact sections:

        CURRENT TRENDS:
        1. Market Patterns:
           - List current market trends
        2. Consumer Behavior:
           - List changing consumer preferences
        3. Technology Impact:
           - List technological influences
        4. Industry Shifts:
           - List major industry changes

        EMERGING TRENDS:
        1. Future Predictions:
           - List upcoming trends
        2. Growth Areas:
           - List potential growth sectors
        3. Innovation Trends:
           - List new technologies/approaches
        4. Market Shifts:
           - List expected market changes

        COMPETITIVE TRENDS:
        1. Strategic Moves:
           - List competitor strategies
        2. Market Positioning:
           - List competitive dynamics
        3. Innovation Focus:
           - List R&D directions
        4. Market Share Trends:
           - List market share changes

        RECOMMENDATIONS:
        1. Strategic Actions:
           - List recommended actions
        2. Investment Areas:
           - List where to focus resources
        3. Risk Mitigation:
           - List potential risks and solutions
        4. Timeline:
           - List implementation phases

        Use only factual information from the content. If making logical inferences, mark them with (Inferred).
        Format each point as a clear, actionable item.
        """
        
        response = model.generate_content(prompt)
        analysis = response.text
        
        return jsonify({
            "current_trends": extract_section(analysis, "CURRENT TRENDS"),
            "emerging_trends": extract_section(analysis, "EMERGING TRENDS"),
            "competitive_trends": extract_section(analysis, "COMPETITIVE TRENDS"),
            "recommendations": extract_section(analysis, "RECOMMENDATIONS"),
            "sources": [{'url': item['url']} for item in scraped_content]
        })

    except Exception as e:
        logging.error(f"Error during trends analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)