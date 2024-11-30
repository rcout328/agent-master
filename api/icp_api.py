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
        model = genai.GenerativeModel('gemini-1.5-flash')
        logging.info("Gemini initialized")
    else:
        logging.warning("No Gemini API key found")

def get_icp_data(business_query):
    """
    Get ICP data using search and Firecrawl
    """
    logging.info(f"\n{'='*50}\nGathering ICP data for: {business_query}\n{'='*50}")
    
    # More specific search queries
    search_queries = [
        f"{business_query} customer profile demographics",
        f"{business_query} target market analysis",
        f"who buys from {business_query}",
        f"{business_query} customer persona",
        f"{business_query} market segmentation"
    ]
    
    scraped_content = []
    
    for query in search_queries:
        try:
            logging.info(f"\nSearching for: {query}")
            for url in search(query, num=2, stop=2, pause=2.0):
                if not any(x in url.lower() for x in ['linkedin', 'facebook', 'twitter']):
                    try:
                        logging.info(f"Scraping: {url}")
                        # Fixed Firecrawl request format
                        response = firecrawl_app.scrape_url(
                            url=url,
                            params={
                                'formats': ['markdown']  # Only use supported parameters
                            }
                        )
                        
                        if response and 'markdown' in response:  # Changed to check for 'markdown' key
                            content = response['markdown']  # Direct access to markdown content
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
            
            time.sleep(2)  # Be nice to servers
            
        except Exception as e:
            logging.error(f"Error in search: {str(e)}")
            continue
    
    if scraped_content:
        logging.info("\nPreparing Gemini analysis")
        
        # More detailed prompt for better analysis
        prompt = f"""
        Analyze this content about {business_query}'s customers and create a detailed ICP (Ideal Customer Profile).
        If specific data isn't available, make logical inferences based on the industry and business type.
        
        Content to analyze:
        {json.dumps(scraped_content, indent=2)}
        
        Provide a comprehensive analysis with these exact sections.
        For each point, either extract information from the content or make a logical inference based on the business type.
        Mark inferred information with "(Inferred)".

        DEMOGRAPHICS:
        - Age Range: [Specify typical age range of customers]
        - Income Level: [Specify typical income brackets]
        - Location: [Specify geographical focus]
        - Education: [Specify typical education levels]

        PSYCHOGRAPHICS:
        - Values and Beliefs: [What matters to these customers]
        - Lifestyle: [Daily habits and preferences]
        - Interests: [Hobbies and activities]
        - Behaviors: [Shopping and decision-making patterns]

        PROFESSIONAL CHARACTERISTICS:
        - Industry: [Primary industries]
        - Company Size: [Typical organization size]
        - Role/Position: [Common job roles]
        - Decision Making Authority: [Level of authority]

        PAIN POINTS & NEEDS:
        - Key Challenges: [Main problems they face]
        - Motivations: [What drives their decisions]
        - Goals: [What they want to achieve]
        - Purchase Triggers: [What prompts them to buy]

        ADDITIONAL INSIGHTS:
        [Provide 2-3 unique insights about the ideal customer]

        Base your analysis on the provided content and make logical inferences where needed.
        Ensure each section has meaningful content, even if inferred from the business context.
        """
        
        try:
            response = model.generate_content(prompt)
            analysis = response.text
            
            logging.info("\nGemini Analysis Received:")
            logging.info(f"\n{analysis}\n")
            
            # Process and structure the response
            sections = extract_meaningful_content(analysis)
            if sections:
                processed_response = {
                    **sections,
                    "sources": [{'url': item['url']} for item in scraped_content]
                }
                
                # Validate response has meaningful content
                if is_valid_response(processed_response):
                    return processed_response
                    
            return generate_fallback_response(business_query)
            
        except Exception as e:
            logging.error(f"Error in Gemini analysis: {str(e)}")
            return generate_fallback_response(business_query)
    
    return generate_fallback_response(business_query)

def process_section(text, section_name):
    """Process section with better extraction"""
    try:
        lines = []
        in_section = False
        
        for line in text.split('\n'):
            if section_name + ":" in line:
                in_section = True
                continue
            elif in_section and any(s + ":" in line for s in ["DEMOGRAPHICS", "PSYCHOGRAPHICS", "PROFESSIONAL CHARACTERISTICS", "PAIN POINTS & NEEDS", "ADDITIONAL INSIGHTS"]):
                break
            elif in_section and line.strip():
                # Clean and format the line
                cleaned_line = line.strip('- *').strip()
                if cleaned_line and not cleaned_line.endswith(':'):
                    # Remove any markdown formatting
                    cleaned_line = cleaned_line.replace('*', '').replace('_', '').strip()
                    if cleaned_line:
                        lines.append(cleaned_line)
    
        return lines
    except Exception as e:
        logging.error(f"Error processing section {section_name}: {str(e)}")
        return []

def extract_meaningful_content(text):
    """Extract meaningful content from Gemini's response"""
    try:
        sections = {
            "demographics": process_section(text, "DEMOGRAPHICS"),
            "psychographics": process_section(text, "PSYCHOGRAPHICS"),
            "professional": process_section(text, "PROFESSIONAL CHARACTERISTICS"),
            "pain_points": process_section(text, "PAIN POINTS & NEEDS"),
            "additional_insights": process_section(text, "ADDITIONAL INSIGHTS")
        }
        
        # Validate each section has meaningful content
        for key, value in sections.items():
            if not value or all("not specify" in item.lower() for item in value):
                sections[key] = [f"No specific {key} data available"]
                
        return sections
    except Exception as e:
        logging.error(f"Error extracting meaningful content: {str(e)}")
        return None

def is_valid_response(response):
    """Check if response has meaningful content"""
    try:
        # Check each section has content and meaningful data
        for key, value in response.items():
            if key == 'sources':  # Skip sources check
                continue
                
            if not value or not isinstance(value, list):
                return False
                
            # Check if all items in the section are empty or contain "not specify"
            has_valid_content = False
            for item in value:
                if isinstance(item, str) and len(item.strip()) > 0 and "not specify" not in item.lower():
                    has_valid_content = True
                    break
            
            if not has_valid_content:
                return False
                
        return True
    except Exception as e:
        logging.error(f"Error validating response: {str(e)}")
        return False

def generate_fallback_response(business_query):
    """Generate a basic response based on business type"""
    # Add basic inference logic here
    return {
        "demographics": [
            f"Age Range: 25-45 (Inferred based on {business_query}'s market)",
            "Income Level: Middle to upper-middle class (Inferred)",
            "Location: Major metropolitan areas (Inferred)",
            "Education: Bachelor's degree or higher (Inferred)"
        ],
        "psychographics": [
            "Values and Beliefs: Quality-conscious and innovation-oriented (Inferred)",
            "Lifestyle: Tech-savvy, busy professionals (Inferred)",
            "Interests: Professional development, industry trends (Inferred)",
            "Behaviors: Research-driven purchase decisions (Inferred)"
        ],
        "professional": [
            "Industry: Various relevant sectors (Inferred)",
            "Company Size: Small to medium enterprises (Inferred)",
            "Role/Position: Decision-makers and influencers (Inferred)",
            "Decision Making Authority: Mid to senior level (Inferred)"
        ],
        "pain_points": [
            "Key Challenges: Efficiency and productivity (Inferred)",
            "Motivations: Business growth and optimization (Inferred)",
            "Goals: Improved operations and ROI (Inferred)",
            "Purchase Triggers: Need for better solutions (Inferred)"
        ],
        "additional_insights": [
            "Shows strong interest in innovative solutions (Inferred)",
            "Values long-term business relationships (Inferred)"
        ],
        "sources": []
    }

@app.route('/api/icp-analysis', methods=['POST', 'OPTIONS'])
def analyze_icp():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.json
        business_query = data.get('query')
        
        if not business_query:
            return jsonify({'error': 'No business query provided'}), 400

        # Check for valid API key
        if not os.getenv('GOOGLE_API_KEY'):
            return jsonify({'error': 'Invalid API key. Please check your configuration.'}), 401

        icp_data = get_icp_data(business_query)
        return jsonify(icp_data)

    except Exception as e:
        logging.error(f"Error during ICP analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5002, debug=True) 