import logging
from datetime import datetime
from firecrawl import FirecrawlApp
import json
import os
import requests  # Import requests for making API calls
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

def get_market_data(business_query):
    """Get market assessment data using search and Firecrawl"""
    try:
        if not business_query:
            logging.error("No business query provided")
            return generate_fallback_response("Unknown Business")
            
        logging.info(f"\n{'='*50}\nGathering market data for: {business_query}\n{'='*50}")
        
        # 5 focused search queries for comprehensive market assessment
        search_queries = [
            # Market Size & Growth
            f"{business_query} market size revenue growth rate analysis",
            
            # Competition & Market Share
            f"{business_query} market share competitors key players analysis",
            
            # Market Dynamics & Trends
            f"{business_query} market dynamics demand supply chain trends",
            
            # Growth & Opportunities
            f"{business_query} market opportunities future growth potential",
            
            # Risks & Technology Impact
            f"{business_query} market risks technology impact challenges"
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
                                'section': 'Market Analysis',
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

        try:
            market_prompt = f"""
            Task: Analyze the provided content to create a detailed market assessment for {business_query}.

            Content to analyze:
            {[item['content'] for item in scraped_content]}

            Market Assessment:
            Market Overview:
            Market Size:
            • [Estimate overall market size in revenue/units]
            • [Identify market segments and sizes]

            Growth Rate:
            • [Analyze historical and forecast growth]
            • [Identify key growth drivers and trends]

            Key Players:
            • [Identify major competitors and market share]
            • [Assess competitive landscape and opportunities]

            Market Dynamics:
            Demand Factors:
            • [Analyze customer needs and preferences]
            • [Identify demand influencing factors]

            Supply Chain:
            • [Evaluate supply chain efficiency]
            • [Identify key suppliers and impact]

            Pricing Trends:
            • [Analyze pricing strategies]
            • [Identify pricing influence factors]

            Competitive Landscape:
            Market Share:
            • [Assess key players' market share]
            • [Identify emerging players and impact]

            Competitor Analysis:
            • [Analyze competitor strengths/weaknesses]
            • [Identify competitive advantages]

            Entry Barriers:
            • [Evaluate barriers to entry]
            • [Assess market access challenges]

            Future Outlook:
            Growth Opportunities:
            • [Identify growth areas and potential]
            • [Assess emerging trends impact]

            Risk Factors:
            • [Identify potential risks/challenges]
            • [Assess market threats]

            Technology Impact:
            • [Analyze technology impact]
            • [Identify tech opportunities]

            Additional Considerations:
            • Data Sources: [List key data sources]
            • Assumptions: [State key assumptions]
            • Recommendations: [Provide actionable insights]

            Format each point with specific data where available.
            Mark inferences with (Inferred).
            Prioritize insights based on impact and reliability.
            """
            
            response = model.generate_content(market_prompt)
            analysis = response.text
            
            # Save to file with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = os.path.join(output_folder, f'market_analysis_{timestamp}.txt')
            
            with open(output_file, 'w') as f:
                f.write(f"Market Assessment for: {business_query}\n")
                f.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write("="*50 + "\n\n")
                f.write(analysis + "\n\n")
                f.write("Data Sources:\n")
                for source in scraped_content:
                    f.write(f"- {source['domain']} ({source['date']})\n")
            
            # Process and structure the response
            result = {
                "market_overview": extract_section(analysis, "Market Overview"),
                "market_dynamics": extract_section(analysis, "Market Dynamics"),
                "competitive_landscape": extract_section(analysis, "Competitive Landscape"),
                "future_outlook": extract_section(analysis, "Future Outlook"),
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
            return generate_fallback_response(business_query)
            
    except Exception as e:
        logging.error(f"Error in market assessment: {str(e)}")
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
            elif any(s + ":" in line for s in ["MARKET OVERVIEW", "MARKET DYNAMICS", "COMPETITIVE LANDSCAPE", "FUTURE OUTLOOK"]):
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
    """Generate basic market assessment when no data is found"""
    return {
        "market_overview": [
            f"Market size estimation for {business_query} pending (Inferred)",
            "Growth rate analysis in progress (Inferred)",
            "Key player identification ongoing (Inferred)"
        ],
        "market_dynamics": [
            "Demand factor analysis needed (Inferred)",
            "Supply chain assessment pending (Inferred)",
            "Pricing trend evaluation required (Inferred)"
        ],
        "competitive_landscape": [
            "Market share analysis in progress (Inferred)",
            "Competitor assessment ongoing (Inferred)",
            "Entry barrier evaluation needed (Inferred)"
        ],
        "future_outlook": [
            "Growth opportunity identification pending (Inferred)",
            "Risk factor assessment needed (Inferred)",
            "Technology impact analysis required (Inferred)"
        ],
        "sources": []
    } 