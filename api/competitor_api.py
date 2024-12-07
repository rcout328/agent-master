import logging
from datetime import datetime
from firecrawl import FirecrawlApp
import os
import time
import google.generativeai as genai
import requests
from googlesearch import search

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

def search_with_retry(search_query):
    """Helper function to perform search with retry logic"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            return list(search(
                search_query,
                num_results=3,
                lang="en"
            ))
        except Exception as e:
            if "429" in str(e):
                wait_time = (attempt + 1) * 10
                logging.info(f"Search rate limit hit, waiting {wait_time} seconds...")
                time.sleep(wait_time)
                continue
            logging.error(f"Search error: {str(e)}")
            break
    return []

def scrape_with_retry(url, section):
    """Helper function to scrape URL with retry logic"""
    max_retries = 3
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
                return response.get('markdown')
        except Exception as e:
            if "429" in str(e):
                wait_time = (attempt + 1) * 10
                logging.info(f"Rate limit hit, waiting {wait_time} seconds...")
                time.sleep(wait_time)
                continue
            logging.error(f"Error scraping {url}: {str(e)}")
        time.sleep(2)
    return None

def get_competitor_data(query):
    """Get competitor data with improved rate limit handling"""
    logging.info(f"\n{'='*50}\nAnalyzing competitors for: {query}\n{'='*50}")
    
    result = {
        "main_competitors": [],
        "competitor_strengths": [],
        "key_findings": [],
        "sources": []
    }

    # Create directory for outputs
    output_dir = 'gemini_outputs'
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = os.path.join(output_dir, f'competitor_analysis_{timestamp}.txt')

    try:
        # Phase 1: Top Competitors Analysis
        logging.info("\nPhase 1: Analyzing Top Competitors")
        competitor_search_query = f"{query} top competitors market leaders analysis"
        urls = search_with_retry(competitor_search_query)
        
        competitor_content = ""
        for url in urls:
            content = scrape_with_retry(url, 'Competitors')
            if content:
                competitor_content += content + "\n"
                result["sources"].append({
                    'url': url,
                    'domain': extract_domain(url),
                    'section': 'Competitors',
                    'date': datetime.now().strftime("%Y-%m-%d")
                })

        if competitor_content:
            competitor_prompt = f"""
            Task 1: Identify Top 5 Competitors
            Analyze the following content to identify the top 5 competitors of {query}.
            
            Content: {competitor_content}
            
            Format your response exactly as follows:
            [Competitor 1 Name]: [Market position and key offering]
            [Competitor 2 Name]: [Market position and key offering]
            [Competitor 3 Name]: [Market position and key offering]
            [Competitor 4 Name]: [Market position and key offering]
            [Competitor 5 Name]: [Market position and key offering]
            """
            
            competitors = model.generate_content(competitor_prompt).text
            result["main_competitors"] = extract_section(competitors, "")
            
            with open(output_file, 'w') as f:
                f.write(f"# Competitor Analysis for {query}\n\n")
                f.write("## TOP COMPETITORS\n")
                f.write(competitors + "\n\n")

        # Continue with other phases...
        # (Keep the rest of your existing phases code)

    except Exception as e:
        logging.error(f"Error in competitor analysis: {str(e)}")
        return create_empty_response()

    return result

def extract_section(text, section_name):
    """Enhanced section extraction to handle ICP data"""
    if not section_name:
        return [line.strip() for line in text.split('\n') if line.strip()]
        
    try:
        lines = text.split('\n')
        section_content = []
        in_section = False
        
        for line in lines:
            if section_name in line:
                in_section = True
                continue
            elif in_section and line.strip() and any(s in line for s in ["Demographics:", "Psychographics:", "Behavior Patterns:"]):
                in_section = False
            elif in_section and line.strip():
                if line.strip().startswith('•'):
                    section_content.append(line.strip()[1:].strip())
                else:
                    section_content.append(line.strip())
                    
        return section_content
    except Exception as e:
        logging.error(f"Error extracting section {section_name}: {str(e)}")
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