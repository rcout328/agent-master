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

def get_feature_data(business_query):
    """Get feature priority data using search and Firecrawl"""
    try:
        if not business_query:
            logging.error("No business query provided")
            return generate_fallback_response("Unknown Business")
            
        logging.info(f"\n{'='*50}\nGathering feature data for: {business_query}\n{'='*50}")
        
        # 5 focused search queries for comprehensive feature analysis
        search_queries = [
            # Overall Impact & Benefits
            f"{business_query} product features social economic environmental impact analysis",
            
            # Community & Social Value
            f"{business_query} community benefits employment impact social value",
            
            # Revenue & Market Growth
            f"{business_query} feature revenue potential market growth analysis",
            
            # Sustainability & Resources
            f"{business_query} sustainability resource usage environmental benefits",
            
            # Implementation & Timeline
            f"{business_query} feature implementation timeline resources success metrics"
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
                                'section': 'Feature Analysis',
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
            feature_prompt = f"""
            Task: Analyze the provided content to create a detailed feature prioritization analysis for {business_query}.

            Content to analyze:
            {[item['content'] for item in scraped_content]}

            Feature Prioritization Analysis:
            Social Impact:
            Community Benefits:
            • [Identify how the feature can positively impact the community]
            • [List specific community engagement opportunities]

            Employment Impact:
            • [Assess potential job creation or skill enhancement]
            • [Evaluate indirect employment benefits]

            Social Value:
            • [Evaluate broader societal benefits]
            • [Assess accessibility and inclusivity impact]

            Economic Impact:
            Revenue Potential:
            • [Identify potential revenue streams]
            • [Quantify revenue opportunities where possible]

            Market Growth:
            • [Assess market expansion potential]
            • [Evaluate customer acquisition impact]

            Cost Benefits:
            • [Evaluate cost-saving potential]
            • [Analyze efficiency improvements]

            Environmental Impact:
            Sustainability:
            • [Assess environmental sustainability impact]
            • [Evaluate carbon footprint reduction]

            Resource Usage:
            • [Evaluate resource consumption]
            • [Identify resource optimization opportunities]

            Environmental Benefits:
            • [List positive environmental impacts]
            • [Quantify environmental benefits where possible]

            Implementation Priority:
            Timeline:
            • [Develop phased implementation timeline]
            • [Define specific milestones]

            Resources:
            • [List required resources and capabilities]
            • [Identify potential constraints]

            Success Metrics:
            • [Define key performance indicators]
            • [Outline monitoring and evaluation plan]

            Additional Considerations:
            • Customer Impact: [Assess customer experience effects]
            • Competitive Advantage: [Evaluate market differentiation]
            • Long-Term Vision: [Align with strategic goals]
            • Risk Assessment: [Identify and mitigate risks]

            Format each point with specific data where available.
            Mark inferences with (Inferred).
            Prioritize based on impact and feasibility.
            """
            
            response = model.generate_content(feature_prompt)
            analysis = response.text
            
            # Save to file with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = os.path.join(output_folder, f'feature_analysis_{timestamp}.txt')
            
            with open(output_file, 'w') as f:
                f.write(f"Feature Prioritization Analysis for: {business_query}\n")
                f.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write("="*50 + "\n\n")
                f.write(analysis + "\n\n")
                f.write("Data Sources:\n")
                for source in scraped_content:
                    f.write(f"- {source['domain']} ({source['date']})\n")
            
            # Process and structure the response
            result = {
                "social_impact": extract_section(analysis, "Social Impact"),
                "economic_impact": extract_section(analysis, "Economic Impact"),
                "environmental_impact": extract_section(analysis, "Environmental Impact"),
                "implementation_priority": extract_section(analysis, "Implementation Priority"),
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
        logging.error(f"Error in feature analysis: {str(e)}")
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
            elif any(s + ":" in line for s in ["SOCIAL IMPACT", "ECONOMIC IMPACT", "ENVIRONMENTAL IMPACT", "IMPLEMENTATION PRIORITY"]):
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
    """Generate basic feature priority analysis when no data is found"""
    return {
        "social_impact": [
            f"Community impact assessment for {business_query} pending (Inferred)",
            "Employment effects to be evaluated (Inferred)",
            "Social value contribution potential (Inferred)"
        ],
        "economic_impact": [
            "Revenue potential being assessed (Inferred)",
            "Market growth opportunities pending analysis (Inferred)",
            "Innovation impact to be determined (Inferred)"
        ],
        "environmental_impact": [
            "Sustainability initiatives to be evaluated (Inferred)",
            "Resource usage assessment pending (Inferred)",
            "Carbon footprint analysis needed (Inferred)"
        ],
        "implementation_priority": [
            "Timeline development in progress (Inferred)",
            "Resource requirements being assessed (Inferred)",
            "Success metrics to be defined (Inferred)"
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