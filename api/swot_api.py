import logging
from datetime import datetime
from firecrawl import FirecrawlApp
import json
import os
import requests
import time
import google.generativeai as genai
from googlesearch import search  # Add this import

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

def perform_search(query, use_custom_api=True):
    """
    Perform search with fallback mechanism
    First tries Custom Search API, then falls back to googlesearch package
    """
    try:
        if use_custom_api:
            # Try Custom Search API first
            search_results = custom_search_api(query)
            if search_results:
                return search_results
            logging.warning("Custom Search API returned no results, falling back to googlesearch")
        
        # Fallback to googlesearch package
        logging.info("Using googlesearch package")
        return list(search(query, num_results=2, lang="en"))
        
    except Exception as e:
        logging.error(f"Search error: {str(e)}")
        return []

def get_swot_data(business_query):
    """Get SWOT analysis data using search and Firecrawl"""
    logging.info(f"\n{'='*50}\nGathering SWOT data for: {business_query}\n{'='*50}")
    
    # 5 focused search queries for comprehensive SWOT analysis
    search_queries = [
        # Overall Analysis & Market Position
        f"{business_query} SWOT analysis market position strengths weaknesses",
        
        # Internal Capabilities & Resources
        f"{business_query} core competencies resources capabilities analysis",
        
        # Market & Competition Analysis
        f"{business_query} competitive analysis market share industry position",
        
        # Growth & Innovation
        f"{business_query} growth opportunities innovation market trends",
        
        # Risks & Challenges
        f"{business_query} market risks industry challenges competitive threats"
    ]
    
    scraped_content = []
    use_custom_api = True  # Start with Custom Search API
    
    for query in search_queries:
        try:
            logging.info(f"\nSearching for: {query}")
            search_results = perform_search(query, use_custom_api)
            
            if not search_results and use_custom_api:
                # If Custom Search API fails, switch to googlesearch for remaining queries
                use_custom_api = False
                search_results = perform_search(query, use_custom_api=False)
            
            for url in search_results:
                if not any(x in url.lower() for x in ['linkedin', 'facebook', 'twitter']):
                    content = scrape_with_retry(url)
                    if content and len(content) > 200:
                        scraped_content.append({
                            'url': url,
                            'domain': extract_domain(url),
                            'section': 'SWOT Analysis',
                            'date': datetime.now().strftime("%Y-%m-%d"),
                            'content': content[:2000]
                        })
            time.sleep(2)
            
        except Exception as e:
            logging.error(f"Error in search: {str(e)}")
            if use_custom_api:
                # If Custom Search API fails, try googlesearch
                use_custom_api = False
                try:
                    search_results = perform_search(query, use_custom_api=False)
                    # ... continue with scraping ...
                except Exception as inner_e:
                    logging.error(f"Fallback search also failed: {str(inner_e)}")
            continue

    if scraped_content:
        try:
            swot_prompt = f"""
            Task: Analyze the provided content to create a detailed SWOT analysis for {business_query}.

            Content to analyze:
            {[item['content'] for item in scraped_content]}

            SWOT Analysis:
            Strengths:
            Core Competencies:
            • [Identify unique capabilities and advantages based on the content]
            • [List specific strengths with examples]

            Market Position:
            • [Identify competitive advantages, such as strong brand reputation, customer loyalty, or market leadership]
            • [Provide market position metrics where available]

            Resources:
            • [Identify valuable assets and capabilities, such as intellectual property, skilled workforce, or strong financial position]
            • [List key resource advantages]

            Weaknesses:
            Internal Limitations:
            • [Identify internal challenges, such as operational inefficiencies, lack of skilled talent, or outdated technology]
            • [List specific operational weaknesses]

            Competitive Disadvantages:
            • [Identify areas where competitors have a stronger position, such as lower costs, better product features, or stronger distribution channels]
            • [Compare with competitor capabilities]

            Resource Gaps:
            • [Identify missing capabilities or resources, such as lack of marketing expertise, inadequate funding, or insufficient R&D investment]
            • [List specific resource needs]

            Opportunities:
            Market Trends:
            • [Identify emerging trends that can be leveraged, such as increased demand for sustainable products, digital transformation, or globalization]
            • [List specific market opportunities]

            Growth Potential:
            • [Identify potential growth areas, such as new markets, product lines, or partnerships]
            • [Quantify growth opportunities where possible]

            Innovation Areas:
            • [Identify areas for innovation, such as product development, process improvement, or business model innovation]
            • [List specific innovation opportunities]

            Threats:
            Market Risks:
            • [Identify external factors that could negatively impact the business, such as economic downturns, natural disasters, or political instability]
            • [List specific market risks]

            Competitive Pressures:
            • [Identify competitive threats, such as new entrants, price wars, or aggressive marketing campaigns]
            • [Analyze competitor actions and potential impacts]

            Industry Changes:
            • [Identify potential disruptions, such as technological advancements, regulatory changes, or shifts in consumer preferences]
            • [List specific industry challenges]

            Format each point with specific data where available.
            Mark inferences with (Inferred).
            Prioritize factors based on their potential impact.
            Provide actionable insights and recommendations.
            """
            
            response = model.generate_content(swot_prompt)
            analysis = response.text
            
            # Save to file with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = os.path.join(output_folder, f'swot_analysis_{timestamp}.txt')
            
            with open(output_file, 'w') as f:
                f.write(f"SWOT Analysis for: {business_query}\n")
                f.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write("="*50 + "\n\n")
                f.write(analysis + "\n\n")
                f.write("Data Sources:\n")
                for source in scraped_content:
                    f.write(f"- {source['domain']} ({source['date']})\n")
            
            # Process and structure the response
            result = {
                "strengths": extract_section(analysis, "Strengths"),
                "weaknesses": extract_section(analysis, "Weaknesses"),
                "opportunities": extract_section(analysis, "Opportunities"),
                "threats": extract_section(analysis, "Threats"),
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
            
    return generate_fallback_response(business_query)

def custom_search_api(query):
    """Perform a custom search using the Google Custom Search API"""
    api_key = "AIzaSyAxeLlJ6vZxOl-TblUJg_dInBS3vNxaFVY"
    search_engine_id = "37793b12975da4e35"
    url = f"https://www.googleapis.com/customsearch/v1?key={api_key}&cx={search_engine_id}&q={query}&num=2"
    
    response = requests.get(url)
    if response.status_code == 200:
        search_results = response.json().get('items', [])
        return [item['link'] for item in search_results]
    else:
        logging.error(f"Error in custom search API: {response.status_code} - {response.text}")
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
            f"Core competencies of {business_query} pending analysis (Inferred)",
            "Market position assessment needed (Inferred)",
            "Resource evaluation in progress (Inferred)"
        ],
        "weaknesses": [
            "Internal limitations being identified (Inferred)",
            "Competitive disadvantages under review (Inferred)",
            "Resource gaps to be assessed (Inferred)"
        ],
        "opportunities": [
            "Market trend analysis pending (Inferred)",
            "Growth potential being evaluated (Inferred)",
            "Innovation opportunities to be identified (Inferred)"
        ],
        "threats": [
            "Market risk assessment needed (Inferred)",
            "Competitive pressure analysis pending (Inferred)",
            "Industry change impact to be evaluated (Inferred)"
        ],
        "sources": []
    } 

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