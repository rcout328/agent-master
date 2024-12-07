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

def get_feedback_data(business_query):
    """Get feedback analysis data using search and Firecrawl"""
    try:
        if not business_query:
            logging.error("No business query provided")
            return generate_fallback_response("Unknown Business")
            
        logging.info(f"\n{'='*50}\nGathering feedback data for: {business_query}\n{'='*50}")
        
        # 5 focused search queries for comprehensive feedback analysis
        search_queries = [
            # Overall Satisfaction & Metrics
            f"{business_query} customer satisfaction ratings reviews analysis",
            
            # Product & Features Feedback
            f"{business_query} product features quality usability feedback",
            
            # Service & Support Experience
            f"{business_query} customer service support response time reviews",
            
            # Customer Pain Points
            f"{business_query} customer complaints issues problems analysis",
            
            # Improvement Suggestions
            f"{business_query} customer suggestions improvements recommendations"
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
                                'section': 'Feedback Analysis',
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
            feedback_prompt = f"""
            Task: Analyze the provided content about {business_query}'s customer feedback to create a detailed analysis.

            Content to analyze:
            {[item['content'] for item in scraped_content]}

            Customer Feedback Analysis:
            Satisfaction Metrics:
            Overall Rating:
            • [Summarize overall customer satisfaction]
            • [Provide rating metrics where available]

            Key Drivers of Satisfaction:
            • [Identify key factors contributing to positive experiences]
            • [List specific strengths and advantages]

            Areas for Improvement:
            • [Identify areas where satisfaction is lower]
            • [List specific pain points and challenges]

            Product Feedback:
            Features:
            • [Evaluate feedback on specific features]
            • [Assess feature effectiveness and usage]

            Quality:
            • [Assess feedback on product quality]
            • [Evaluate durability and reliability]

            Usability:
            • [Evaluate user experience feedback]
            • [Assess ease of use and accessibility]

            Service Feedback:
            Support Quality:
            • [Evaluate customer support satisfaction]
            • [Assess support team effectiveness]

            Response Time:
            • [Assess support response speed]
            • [Evaluate communication efficiency]

            Resolution Rate:
            • [Evaluate issue resolution success]
            • [Assess problem-solving effectiveness]

            Recommendations:
            Quick Wins:
            • [List immediately actionable improvements]
            • [Identify easy-to-implement changes]

            Long-Term Goals:
            • [Outline strategic improvements]
            • [Define long-term objectives]

            Priority Actions:
            • [List specific action items]
            • [Prioritize based on impact and urgency]

            Format each point with specific data where available.
            Mark inferences with (Inferred).
            Prioritize recommendations based on impact and feasibility.
            """
            
            response = model.generate_content(feedback_prompt)
            analysis = response.text
            
            # Save to file with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = os.path.join(output_folder, f'feedback_analysis_{timestamp}.txt')
            
            with open(output_file, 'w') as f:
                f.write(f"Customer Feedback Analysis for: {business_query}\n")
                f.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write("="*50 + "\n\n")
                f.write(analysis + "\n\n")
                f.write("Data Sources:\n")
                for source in scraped_content:
                    f.write(f"- {source['domain']} ({source['date']})\n")
            
            # Process and structure the response
            result = {
                "satisfaction_metrics": extract_section(analysis, "Satisfaction Metrics"),
                "product_feedback": extract_section(analysis, "Product Feedback"),
                "service_feedback": extract_section(analysis, "Service Feedback"),
                "recommendations": extract_section(analysis, "Recommendations"),
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
        logging.error(f"Error in feedback analysis: {str(e)}")
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