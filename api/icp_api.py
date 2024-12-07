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
FIRECRAWL_API_KEY = "fc-43e5dcff501d4aef8cbccfa47b646f57"
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

def scrape_with_retry(url, max_retries=3):
    """Helper function to scrape URL with retry logic"""
    for attempt in range(max_retries):
        try:
            # Skip social media URLs
            if any(x in url.lower() for x in ['linkedin', 'facebook', 'twitter', 'reddit']):
                logging.info(f"Skipping social media URL: {url}")
                return None
                
            response = firecrawl_app.scrape_url(
                url=url,
                params={'formats': ['markdown']}
            )
            if response and response.get('markdown'):
                logging.info("Successfully scraped content")
                return response.get('markdown')
                
        except Exception as e:
            if "429" in str(e):  # Rate limit error
                wait_time = (attempt + 1) * 10
                logging.info(f"Rate limit hit, waiting {wait_time} seconds...")
                time.sleep(wait_time)
                continue
            logging.error(f"Error scraping {url}: {str(e)}")
            
        time.sleep(2)  # Basic delay between attempts
    return None

def get_icp_data(business_query):
    """
    Get ICP data using enhanced search and analysis
    """
    logging.info(f"\n{'='*50}\nGathering ICP data for: {business_query}\n{'='*50}")
    
    # Enhanced search queries for better ICP analysis
    search_queries = [
        # Company & Market Information
        f"{business_query} target market analysis customer profile",
        f"{business_query} ideal customer demographics data",
        
        # Customer Behavior & Needs
        f"{business_query} customer pain points needs analysis",
        f"{business_query} customer behavior purchasing patterns",
        
        # Professional & Industry Context
        f"{business_query} industry analysis target audience",
        f"{business_query} customer success stories case studies"
    ]
    
    scraped_content = []
    
    for query in search_queries:
        try:
            logging.info(f"\nSearching for: {query}")
            urls = list(search(query, num_results=3, lang="en"))
            
            for url in urls:
                content = scrape_with_retry(url)
                if content and len(content) > 200:
                    scraped_content.append({
                        'url': url,
                        'domain': extract_domain(url),
                        'section': 'ICP Analysis',
                        'date': datetime.now().strftime("%Y-%m-%d"),
                        'content': content[:2000]
                    })
            time.sleep(2)
            
        except Exception as e:
            logging.error(f"Error in search: {str(e)}")
            continue

    if scraped_content:
        try:
            enhanced_prompt = f"""
            Task: Analyze the provided content to create a detailed Ideal Customer Profile (ICP) for {business_query}.

            Content to analyze:
            {[item['content'] for item in scraped_content]}

            Provide a comprehensive ICP analysis with the following structure:

            Demographics:
            • Age Range: [Specific age range] (Inferred based on industry and product/service)
            • Income Level: [Income bracket] (Inferred based on product/service pricing)
            • Location: [Geographic region] (Inferred based on target market)
            • Education: [Educational level] (Inferred based on product/service complexity)

            Psychographics:
            • Values and Beliefs: [Core values] (Inferred based on industry and product/service)
            • Lifestyle: [Lifestyle preferences] (Inferred based on target audience)
            • Interests: [Relevant interests] (Inferred based on industry and product/service)
            • Behaviors: [Buying habits, decision-making processes] (Inferred based on industry)

            Professional Characteristics:
            • Industry: [Primary industries] (Inferred based on target market)
            • Company Size: [Company size categories] (Inferred based on target market)
            • Role/Position: [Job titles] (Inferred based on product/service)
            • Decision Making Authority: [Decision-making process] (Inferred based on complexity)

            Pain Points & Needs:
            • Key Challenges: [Specific problems] (Inferred based on industry)
            • Motivations: [Driving factors] (Inferred based on industry)
            • Goals: [Desired outcomes] (Inferred based on industry)
            • Purchase Triggers: [Factors influencing purchase] (Inferred based on industry)

            Additional Insights:
            • [Unique characteristic or behavior]
            • [Specific need or preference]
            • [Potential opportunity or challenge]

            Format each point with specific data where available and mark inferences clearly.
            Provide concrete examples and quantifiable metrics when possible.
            """
            
            response = model.generate_content(enhanced_prompt)
            analysis = response.text
            
            # Save to file with better organization
            output_file = os.path.join(output_folder, f'icp_analysis_{datetime.now().strftime("%Y%m%d_%H%M%S")}.txt')
            with open(output_file, 'w') as f:
                f.write(f"ICP Analysis for: {business_query}\n")
                f.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write("="*50 + "\n\n")
                f.write(analysis)
                
            # Process and structure the response
            sections = extract_meaningful_content(analysis)
            if sections:
                return {
                    **sections,
                    "sources": [{
                        'url': item['url'],
                        'domain': item['domain'],
                        'section': item['section'],
                        'date': item['date']
                    } for item in scraped_content]
                }
                
        except Exception as e:
            logging.error(f"Error in analysis: {str(e)}")
            
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
    """Enhanced content extraction with better structure"""
    sections = {
        "demographics": [],
        "psychographics": [],
        "professional": [],
        "pain_points": [],
        "additional_insights": []
    }
    
    current_section = None
    
    for line in text.split('\n'):
        line = line.strip()
        if not line:
            continue
            
        # Identify sections
        if "Demographics:" in line:
            current_section = "demographics"
        elif "Psychographics:" in line:
            current_section = "psychographics"
        elif "Professional Characteristics:" in line:
            current_section = "professional"
        elif "Pain Points & Needs:" in line:
            current_section = "pain_points"
        elif "Additional Insights:" in line:
            current_section = "additional_insights"
        elif current_section and line.startswith('•'):
            # Clean and add the insight
            insight = line[1:].strip()
            if insight and not insight.endswith(':'):
                sections[current_section].append(insight)
                
    return sections

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