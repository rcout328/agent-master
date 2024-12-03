import logging
from datetime import datetime
from firecrawl import FirecrawlApp
import json
import os
import requests
import time
import google.generativeai as genai

# Initialize logging
logging.basicConfig(level=logging.DEBUG)

# Initialize Firecrawl
FIRECRAWL_API_KEY = "fc-b69d6504ab0a42b79e87b7827a538199"
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

def get_feedback_data(business_query):
    """Get feedback analysis data using custom search API and Firecrawl"""
    logging.info(f"\n{'='*50}\nGathering feedback data for: {business_query}\n{'='*50}")
    
    result = {
        "satisfaction_metrics": [],
        "product_feedback": [],
        "service_feedback": [],
        "recommendations": [],
        "sources": []
    }
    
    search_queries = [
        f"{business_query} customer reviews analysis",
        f"{business_query} customer feedback summary",
        f"{business_query} user satisfaction",
        f"{business_query} customer complaints",
        f"{business_query} customer experience reviews"
    ]
    
    scraped_content = []
    max_attempts = 2
    search_api_key = "AIzaSyAxeLlJ6vZxOl-TblUJg_dInBS3vNxaFVY"
    search_engine_id = "37793b12975da4e35"
    
    for query in search_queries:
        try:
            logging.info(f"\nSearching for: {query}")
            search_url = f"https://www.googleapis.com/customsearch/v1?key={search_api_key}&cx={search_engine_id}&q={query}&num=2"
            response = requests.get(search_url)
            search_results = response.json().get('items', [])
            attempts = 0
            
            for item in search_results:
                url = item['link']
                if attempts >= max_attempts:
                    break
                    
                if not any(x in url.lower() for x in ['linkedin', 'facebook', 'twitter']):
                    try:
                        logging.info(f"Scraping: {url}")
                        response = firecrawl_app.scrape_url(
                            url=url,
                            params={'formats': ['markdown']}
                        )
                        
                        if response and 'markdown' in response:
                            content = response['markdown']
                            if len(content) > 200:
                                logging.info("Successfully scraped content")
                                scraped_content.append({
                                    'url': url,
                                    'domain': extract_domain(url),
                                    'section': 'Feedback Analysis',
                                    'date': datetime.now().strftime("%Y-%m-%d"),
                                    'content': content[:1000]
                                })
                                break
                    except Exception as e:
                        if "402" in str(e):
                            logging.warning(f"Firecrawl credit limit reached for {url}")
                            scraped_content.append({
                                'url': url,
                                'domain': extract_domain(url),
                                'section': 'Feedback Analysis (Limited)',
                                'date': datetime.now().strftime("%Y-%m-%d"),
                                'content': f"Content from {extract_domain(url)} about {business_query}'s feedback"
                            })
                        else:
                            logging.error(f"Error scraping {url}: {str(e)}")
                        attempts += 1
                        continue
            
            time.sleep(2)
            
        except Exception as e:
            logging.error(f"Error in search: {str(e)}")
            continue

    if scraped_content:
        try:
            prompt = f"""
            Analyze this content about {business_query}'s customer feedback and create a detailed analysis.
            
            Content to analyze:
            {[item['content'] for item in scraped_content]}
            
            Provide a structured analysis with these exact sections:

            SATISFACTION METRICS:
            • Overall Rating
            • Key Drivers
            • Improvement Areas

            PRODUCT FEEDBACK:
            • Features
            • Quality
            • Usability

            SERVICE FEEDBACK:
            • Support Quality
            • Response Time
            • Resolution Rate

            RECOMMENDATIONS:
            • Quick Wins
            • Long-term Goals
            • Priority Actions

            Use factual information where available, mark inferences with (Inferred).
            Format each point as a clear, actionable item.
            """
            
            response = model.generate_content(prompt)
            analysis = response.text
            
            # Save Gemini output to a text file
            output_file_path = os.path.join(output_folder, 'compitoone.txt')
            with open(output_file_path, 'w') as output_file:
                output_file.write(analysis)
                logging.info(f"Gemini output saved to {output_file_path}")
            
            # Extract sections
            result["satisfaction_metrics"] = extract_section(analysis, "SATISFACTION METRICS")
            result["product_feedback"] = extract_section(analysis, "PRODUCT FEEDBACK")
            result["service_feedback"] = extract_section(analysis, "SERVICE FEEDBACK")
            result["recommendations"] = extract_section(analysis, "RECOMMENDATIONS")
            
            # Add sources
            result["sources"] = [{
                'url': item['url'],
                'domain': item['domain'],
                'section': item['section'],
                'date': item['date']
            } for item in scraped_content]
            
            return result
            
        except Exception as e:
            logging.error(f"Error generating analysis: {str(e)}")
            return generate_fallback_response(business_query)
    
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
            elif any(s + ":" in line for s in ["SATISFACTION METRICS", "PRODUCT FEEDBACK", "SERVICE FEEDBACK", "RECOMMENDATIONS"]):
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
    """Generate basic feedback analysis when no data is found"""
    return {
        "satisfaction_metrics": [
            f"Overall satisfaction metrics for {business_query} pending (Inferred)",
            "Key satisfaction drivers to be identified (Inferred)",
            "Areas for improvement being assessed (Inferred)"
        ],
        "product_feedback": [
            "Feature effectiveness evaluation needed (Inferred)",
            "Quality metrics assessment pending (Inferred)",
            "Usability feedback to be collected (Inferred)"
        ],
        "service_feedback": [
            "Support quality measurement needed (Inferred)",
            "Response time analysis pending (Inferred)",
            "Resolution rate to be evaluated (Inferred)"
        ],
        "recommendations": [
            "Quick win opportunities being identified (Inferred)",
            "Long-term improvement goals pending (Inferred)",
            "Priority actions to be determined (Inferred)"
        ],
        "sources": []
    } 