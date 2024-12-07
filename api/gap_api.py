import logging
from datetime import datetime
from firecrawl import FirecrawlApp
import json
import os
import requests
import time
import google.generativeai as genai
from googlesearch import search  # Add this import at the top

# Initialize logging
logging.basicConfig(level=logging.DEBUG)

# Initialize Firecrawl
FIRECRAWL_API_KEY = "fc-43e5dcff501d4aef8cbccfa47b646f57"
firecrawl_app = FirecrawlApp(api_key=FIRECRAWL_API_KEY)
logging.info("Firecrawl initialized")

# Initialize Gemini
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

def get_gap_data(business_query):
    """Get gap analysis data using search and Firecrawl"""
    try:
        if not business_query:
            logging.error("No business query provided")
            return generate_fallback_response("Unknown Business")
            
        logging.info(f"\n{'='*50}\nGathering gap data for: {business_query}\n{'='*50}")
        
        # 5 focused search queries for comprehensive gap analysis
        search_queries = [
            # Current State Analysis
            f"{business_query} current performance metrics market position analysis",
            
            # Future Goals & Objectives
            f"{business_query} business goals target objectives future plans",
            
            # Resource & Capability Analysis
            f"{business_query} resources capabilities infrastructure assessment",
            
            # Market & Competition Gaps
            f"{business_query} market position competitive gaps challenges",
            
            # Strategic Improvements
            f"{business_query} strategic improvements implementation timeline"
        ]
        
        scraped_content = []
        use_custom_api = True
        
        for query in search_queries:
            try:
                logging.info(f"\nSearching for: {query}")
                search_results = perform_search(query, use_custom_api)
                
                if not search_results and use_custom_api:
                    use_custom_api = False
                    search_results = perform_search(query, use_custom_api=False)
                
                if search_results:
                    for url in search_results:
                        content = scrape_with_retry(url)
                        if content and len(content) > 200:
                            scraped_content.append({
                                'url': url,
                                'domain': extract_domain(url),
                                'section': 'Gap Analysis',
                                'date': datetime.now().strftime("%Y-%m-%d"),
                                'content': content[:2000]
                            })
                time.sleep(2)
                
            except Exception as e:
                logging.error(f"Error in search for query '{query}': {str(e)}")
                continue

        if not scraped_content:
            logging.warning("No content scraped, returning fallback response")
            return generate_fallback_response(business_query)

        if scraped_content:
            try:
                gap_prompt = f"""
                Task: Analyze the provided content to create a detailed gap analysis for {business_query}.

                Content to analyze:
                {[item['content'] for item in scraped_content]}

                Gap Analysis:
                Current State:
                Performance Metrics:
                • [List specific metrics, e.g., revenue, customer satisfaction, market share]
                • [Provide quantitative data where available]

                Available Resources:
                • [List key resources, such as employees, technology, financial resources]
                • [Identify any resource constraints or limitations]

                Market Position:
                • [Describe the company's current market position, including target market, brand perception]
                • [Analyze competitive landscape and market share]

                Desired State:
                Target Objectives:
                • [List specific goals, such as increased revenue, market share, or customer satisfaction]
                • [Specify timeframes for achieving these goals]

                Required Capabilities:
                • [Identify necessary skills, technologies, or partnerships]
                • [List infrastructure and resource requirements]

                Market Aspirations:
                • [Describe the company's long-term vision and target markets]
                • [Define desired brand positioning and market leadership]

                Identified Gaps:
                Performance Gaps:
                • [Identify discrepancies between current and desired performance]
                • [Quantify gaps where possible]

                Resource Gaps:
                • [Identify resource shortages or limitations]
                • [List missing capabilities or expertise]

                Market Position Gaps:
                • [Identify weaknesses in market positioning]
                • [Compare with competitor capabilities]

                Recommendations:
                Action Items:
                • [List specific actions to address identified gaps]
                • [Prioritize initiatives based on impact]

                Resource Needs:
                • [Identify required resources for implementation]
                • [Estimate budget and personnel requirements]

                Timeline Phases:
                • [Create implementation timeline with milestones]
                • [Define success metrics for each phase]

                Additional Considerations:
                • Data-Driven Analysis: Use data to quantify gaps
                • Prioritization: Focus on high-impact areas
                • Risk Assessment: Identify potential challenges
                • Continuous Monitoring: Define review process

                Format each point with specific data where available.
                Mark inferences with (Inferred).
                Prioritize recommendations based on impact and feasibility.
                """
                
                response = model.generate_content(gap_prompt)
                analysis = response.text
                
                # Save to file with timestamp
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_file = os.path.join(output_folder, f'gap_analysis_{timestamp}.txt')
                
                with open(output_file, 'w') as f:
                    f.write(f"Gap Analysis for: {business_query}\n")
                    f.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                    f.write("="*50 + "\n\n")
                    f.write(analysis + "\n\n")
                    f.write("Data Sources:\n")
                    for source in scraped_content:
                        f.write(f"- {source['domain']} ({source['date']})\n")
                
                # Process and structure the response
                result = {
                    "current_state": extract_section(analysis, "Current State"),
                    "desired_state": extract_section(analysis, "Desired State"),
                    "identified_gaps": extract_section(analysis, "Identified Gaps"),
                    "recommendations": extract_section(analysis, "Recommendations"),
                    "additional_considerations": extract_section(analysis, "Additional Considerations"),
                    "sources": [{
                        'url': item['url'],
                        'domain': item['domain'],
                        'section': item['section'],
                        'date': item['date']
                    } for item in scraped_content]
                }
                
                return result
                
            except Exception as e:
                logging.error(f"Error in analysis: {str(e)}")
                
    except Exception as e:
        logging.error(f"Error in gap analysis: {str(e)}")
        return generate_fallback_response(business_query)

def extract_section(text, section_name):
    """Extract content from a specific section"""
    try:
        lines = []
        in_section = False
        
        for line in text.split('\n'):
            if section_name + ":" in line:
                in_section = True
                continue
            elif any(s + ":" in line for s in ["CURRENT STATE", "DESIRED STATE", "IDENTIFIED GAPS", "RECOMMENDATIONS"]):
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
    """Generate basic gap analysis when no data is found"""
    return {
        "current_state": [
            f"Current market position of {business_query} (Inferred)",
            "Existing resources and capabilities (Inferred)",
            "Present performance metrics (Inferred)"
        ],
        "desired_state": [
            "Target market position (Inferred)",
            "Required capabilities and resources (Inferred)",
            "Desired performance levels (Inferred)"
        ],
        "identified_gaps": [
            "Performance improvement areas (Inferred)",
            "Resource and capability needs (Inferred)",
            "Market position enhancement requirements (Inferred)"
        ],
        "recommendations": [
            "Strategic initiatives needed (Inferred)",
            "Resource acquisition plan (Inferred)",
            "Implementation timeline suggestions (Inferred)"
        ],
        "sources": []
    } 

def perform_search(query, use_custom_api=True):
    """
    Perform search with fallback mechanism
    First tries Custom Search API, then falls back to googlesearch package
    """
    try:
        if use_custom_api:
            # Try Custom Search API first
            api_key = "AIzaSyAxeLlJ6vZxOl-TblUJg_dInBS3vNxaFVY"
            search_engine_id = "37793b12975da4e35"
            url = f"https://www.googleapis.com/customsearch/v1?key={api_key}&cx={search_engine_id}&q={query}&num=2"
            
            response = requests.get(url)
            if response.status_code == 200:
                search_results = response.json().get('items', [])
                if search_results:
                    return [item['link'] for item in search_results]
            logging.warning("Custom Search API failed, falling back to googlesearch")
        
        # Fallback to googlesearch package
        logging.info("Using googlesearch package")
        return list(search(query, num_results=2, lang="en"))
        
    except Exception as e:
        logging.error(f"Search error: {str(e)}")
        return []

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