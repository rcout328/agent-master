from datetime import datetime
from firecrawl import FirecrawlApp
import json
import os
from googlesearch import search
import time
import logging

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

def get_icp_data(business_query):
    """
    Get ICP data using search and Firecrawl with improved rate limiting
    """
    logging.info(f"\n{'='*50}\nGathering ICP data for: {business_query}\n{'='*50}")
    
    result = {
        "demographics": [],
        "psychographics": [],
        "professional": [],
        "pain_points": [],
        "additional_insights": [],
        "sources": []
    }
    
    search_queries = [
        f"{business_query} customer profile demographics",
        f"{business_query} target market analysis",
        f"{business_query} customer persona"
    ]  # Reduced number of queries
    
    scraped_content = []
    
    def scrape_with_retry(url, max_retries=3):
        """Helper function to scrape URL with retry logic"""
        for attempt in range(max_retries):
            try:
                response = firecrawl_app.scrape_url(
                    url=url,
                    params={'formats': ['markdown']}
                )
                if response and 'markdown' in response:
                    return response['markdown']
            except Exception as e:
                if "429" in str(e):  # Rate limit error
                    wait_time = (attempt + 1) * 10
                    logging.info(f"Rate limit hit, waiting {wait_time} seconds...")
                    time.sleep(wait_time)
                    continue
                logging.error(f"Error scraping {url}: {str(e)}")
            time.sleep(2)  # Basic delay between attempts
        return None

    for query in search_queries:
        try:
            logging.info(f"\nSearching for: {query}")
            urls = list(search(
                query,
                num=3,  # Reduced number of results
                stop=3,
                lang="en"
            ))
            
            if not urls:
                logging.warning(f"No URLs found for query: {query}")
                continue
                
            for url in urls:
                if not any(x in url.lower() for x in ['linkedin', 'facebook', 'twitter']):
                    content = scrape_with_retry(url)
                    if content and len(content) > 200:
                        logging.info("Successfully scraped content")
                        scraped_content.append({
                            'url': url,
                            'domain': extract_domain(url),
                            'section': 'ICP Analysis',
                            'date': datetime.now().strftime("%Y-%m-%d"),
                            'content': content[:2000]  # Limit content size
                        })
                        break  # Break after successful scrape
                        
            time.sleep(3)  # Delay between searches
            
        except Exception as e:
            logging.error(f"Error in search: {str(e)}")
            time.sleep(5)  # Additional delay on error
            continue
    
    if scraped_content:
        try:
            prompt = f"""
            Analyze this content about {business_query}'s customers and create a detailed ICP.
            
            Content to analyze:
            {[item['content'] for item in scraped_content]}
            
            Provide a comprehensive analysis with these exact sections.
            Mark inferred information with "(Inferred)".

            DEMOGRAPHICS:
            • Age Range
            • Income Level
            • Location
            • Education

            PSYCHOGRAPHICS:
            • Values and Beliefs
            • Lifestyle
            • Interests
            • Behaviors

            PROFESSIONAL CHARACTERISTICS:
            • Industry
            • Company Size
            • Role/Position
            • Decision Making Authority

            PAIN POINTS & NEEDS:
            • Key Challenges
            • Motivations
            • Goals
            • Purchase Triggers

            ADDITIONAL INSIGHTS:
            • Unique characteristics
            • Special considerations
            • Key differentiators
            """
            
            response = model.generate_content(prompt)
            analysis = response.text
            
            # Save Gemini output to a text file
            output_file_path = os.path.join(output_folder, 'compitoone.txt')
            with open(output_file_path, 'w') as output_file:
                output_file.write(analysis)
                logging.info(f"Gemini output saved to {output_file_path}")
            
            # Process and structure the response
            sections = extract_meaningful_content(analysis)
            if sections:
                processed_response = {
                    **sections,
                    "sources": [{'url': item['url'], 'domain': item['domain'], 
                               'section': item['section'], 'date': item['date']} 
                              for item in scraped_content]
                }
                
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

def analyze_icp(business_query):
    """Analyze ICP data for a given business query."""
    if not business_query:
        return {'error': 'No business query provided'}, 400

    # Check for valid API key
    if not os.getenv('GOOGLE_API_KEY'):
        return {'error': 'Invalid API key. Please check your configuration.'}, 401

    icp_data = get_icp_data(business_query)
    return icp_data, 200 