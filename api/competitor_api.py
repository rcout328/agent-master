import logging
from datetime import datetime
from firecrawl import FirecrawlApp
import google.generativeai as genai
import os
import time
from googlesearch import search
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import uuid  # Import uuid for unique file naming

# Initialize logging
logging.basicConfig(level=logging.DEBUG)

# Initialize Firecrawl and Gemini
FIRECRAWL_API_KEY = "fc-b69d6504ab0a42b79e87b7827a538199"
firecrawl_app = FirecrawlApp(api_key=FIRECRAWL_API_KEY)
logging.info("Firecrawl initialized")

GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY', '')
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
    logging.info("Gemini initialized")

def get_competitor_data(query):
    """
    Get competitor data with improved rate limit handling
    """
    logging.info(f"\n{'='*50}\nAnalyzing competitors for: {query}\n{'='*50}")
    
    result = {
        "main_competitors": [],
        "competitor_strengths": [],
        "key_findings": [],
        "sources": []
    }

    def scrape_with_retry(url, section):
        """Helper function to scrape URL with retry logic"""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = firecrawl_app.scrape_url(
                    url=url,
                    params={'formats': ['markdown']}
                )
                if response and response.get('markdown'):
                    result["sources"].append({
                        'url': url,
                        'domain': extract_domain(url),
                        'section': section,
                        'date': datetime.now().strftime("%Y-%m-%d")
                    })
                    return response.get('markdown')
            except Exception as e:
                if "429" in str(e):
                    wait_time = (attempt + 1) * 10  # Exponential backoff
                    logging.info(f"Rate limit hit, waiting {wait_time} seconds...")
                    time.sleep(wait_time)
                    continue
                logging.error(f"Error scraping {url}: {str(e)}")
            time.sleep(2)  # Basic delay between attempts
        return None

    def search_with_retry(search_query):
        """Helper function to perform search with retry logic"""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                return list(search(
                    search_query,
                    num_results=2,  # Reduced number
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

    # Create directory for output files
    output_dir = 'gemini_outputs'
    os.makedirs(output_dir, exist_ok=True)

    # Phase 1: Top Competitors
    logging.info("\nPhase 1: Getting Top Competitors")
    search_query = f"top competitors of {query} list"
    urls = search_with_retry(search_query)
    
    if urls:
        content = scrape_with_retry(urls[0], 'Top Competitors')
        if content:
            prompt = f"""
            Analyze this content and list the top 5 competitors of {query}.
            Format each competitor as: [Name] - [Brief description]
            Content: {content}
            """
            try:
                competitors = model.generate_content(prompt).text
                result["main_competitors"] = extract_section(competitors, "")
                logging.info(f"Found competitors: {result['main_competitors']}")
                
                # Create output file for competitors
                with open(os.path.join(output_dir, 'compitoone.txt'), 'w') as f:
                    f.write(competitors)
                    
            except Exception as e:
                logging.error(f"Error in Gemini analysis: {str(e)}")

    time.sleep(5)  # Delay between phases

    # Phase 2: Competitor Strengths
    logging.info("\nPhase 2: Getting Competitor Strengths")
    search_query = f"{query} competitors strengths advantages"
    urls = search_with_retry(search_query)
    
    if urls:
        content = scrape_with_retry(urls[0], 'Competitor Strengths')
        if content:
            prompt = f"""
            List the key strengths of {query}'s main competitors.
            Format as: [Competitor Name]: [Key strength]
            Content: {content}
            """
            try:
                strengths = model.generate_content(prompt).text
                result["competitor_strengths"] = extract_section(strengths, "")
                logging.info(f"Found strengths: {result['competitor_strengths']}")
                
                # Create output file for strengths
                with open(os.path.join(output_dir, 'compitoone.txt'), 'a') as f:
                    f.write(strengths)
                    
            except Exception as e:
                logging.error(f"Error in Gemini analysis: {str(e)}")

    time.sleep(5)  # Delay between phases

    # Phase 3: Key Findings
    logging.info("\nPhase 3: Getting Key Findings")
    search_query = f"{query} competitive landscape analysis"
    urls = search_with_retry(search_query)
    
    if urls:
        content = scrape_with_retry(urls[0], 'Key Findings')
        if content:
            prompt = f"""
            Provide 2-3 key insights about {query}'s competitive landscape.
            Format as numbered points.
            Content: {content}
            """
            try:
                findings = model.generate_content(prompt).text
                result["key_findings"] = extract_section(findings, "")
                logging.info(f"Found key findings: {findings}")
                
                # Create output file for findings
                with open(os.path.join(output_dir, 'compitoone.txt'), 'a') as f:
                    f.write(findings)
                    
            except Exception as e:
                logging.error(f"Error in Gemini analysis: {str(e)}")

    # Return fallback if no data found
    if not any([result["main_competitors"], result["competitor_strengths"], result["key_findings"]]):
        return create_empty_response()

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
        for section in ["TOP COMPETITORS:", "COMPETITOR STRENGTHS:", "KEY FINDINGS:"]:
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