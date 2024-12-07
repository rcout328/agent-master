import logging
from datetime import datetime
from firecrawl import FirecrawlApp
import os
import time
import google.generativeai as genai
import requests  # Import requests for making API calls
from googlesearch import search  # Add this import at the top
import json

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

def scrape_with_retry(url, max_retries=3, timeout=15):
    """Helper function to scrape URL with retry logic and improved timeout handling"""
    # List of problematic domains that often timeout
    problematic_domains = [
        'sparktoro.com',
        'j-jdis.com',
        'linkedin.com',
        'facebook.com', 
        'twitter.com',
        'reddit.com',
        '.pdf'
    ]
    
    # Skip problematic URLs immediately
    if any(domain in url.lower() for domain in problematic_domains):
        logging.info(f"Skipping known problematic URL: {url}")
        return None

    for attempt in range(max_retries):
        try:
            # Use shorter timeout for initial attempts
            current_timeout = timeout * (attempt + 1)  # Increase timeout with each retry
            
            logging.info(f"Attempting to scrape {url} (timeout: {current_timeout}s)")
            
            # Add timeout and rate limiting parameters
            response = firecrawl_app.scrape_url(
                url=url,
                params={
                    'formats': ['markdown'],
                    'timeout': current_timeout,
                    'wait': True,  # Enable rate limiting
                    'max_retries': 2  # Internal retries
                }
            )
            
            if response and response.get('markdown'):
                content = response.get('markdown')
                if len(content.strip()) > 200:  # Verify content quality
                    logging.info(f"Successfully scraped {url}")
                    return content
                else:
                    logging.warning(f"Content too short from {url}")
                    return None
                    
        except Exception as e:
            error_msg = str(e).lower()
            wait_time = (attempt + 1) * 5  # Reduced wait times
            
            if "timeout" in error_msg or "408" in error_msg:
                if attempt < max_retries - 1:
                    logging.warning(f"Timeout error for {url}, attempt {attempt + 1}")
                    logging.info(f"Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                    continue
                else:
                    logging.error(f"Final timeout for {url} after {max_retries} attempts")
                    break
                    
            elif "429" in error_msg:  # Rate limit
                logging.info(f"Rate limit hit, waiting {wait_time}s...")
                time.sleep(wait_time)
                continue
                
            else:
                logging.error(f"Error scraping {url}: {error_msg}")
                break
            
        time.sleep(1)  # Reduced basic delay
        
    return None

def get_trends_data(query):
    """Get market trends data with improved error handling"""
    try:
        if not query:
            logging.error("No query provided")
            return generate_fallback_response("Unknown Business")
            
        logging.info(f"\n{'='*50}\nGathering trends data for: {query}\n{'='*50}")
        
        # Define search queries
        search_queries = [
            # Market Overview
            f"{query} market size revenue statistics analysis",
            
            # Industry Trends
            f"{query} industry trends growth forecast analysis",
            
            # Competition Analysis
            f"{query} market share competitive landscape analysis",
            
            # Technology & Innovation
            f"{query} technology innovation disruption analysis",
            
            # Future Outlook
            f"{query} market future outlook predictions analysis"
        ]
        
        scraped_content = []
        use_custom_api = True
        successful_scrapes = 0
        min_required_content = 2
        max_attempts_per_url = 2
        
        for search_query in search_queries:
            if successful_scrapes >= min_required_content:
                break
                
            try:
                logging.info(f"\nSearching for: {search_query}")
                search_results = perform_search(search_query, use_custom_api)
                
                if not search_results and use_custom_api:
                    use_custom_api = False
                    search_results = perform_search(search_query, use_custom_api=False)
                
                if search_results:
                    attempts = 0
                    for url in search_results:
                        if successful_scrapes >= min_required_content or attempts >= max_attempts_per_url:
                            break
                            
                        content = scrape_with_retry(url, timeout=15)  # Reduced initial timeout
                        if content:
                            scraped_content.append({
                                'url': url,
                                'domain': extract_domain(url),
                                'section': 'Market Trends',
                                'date': datetime.now().strftime("%Y-%m-%d"),
                                'content': content[:2000]
                            })
                            successful_scrapes += 1
                        attempts += 1
                            
                time.sleep(1)  # Reduced delay between queries
                
            except Exception as e:
                logging.error(f"Error in search for query '{search_query}': {str(e)}")
                continue

        if not scraped_content:
            logging.warning("No content scraped, returning fallback response")
            return generate_fallback_response(query)

        try:
            result = process_scraped_content(scraped_content, query)
            
            # Save analysis to file
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = os.path.join('gemini_outputs', f'market_trends_{timestamp}.txt')
            
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(f"Market Trends Analysis for: {query}\n")
                f.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write("="*50 + "\n\n")
                f.write(json.dumps(result, indent=2))
                f.write("\n\nData Sources:\n")
                for source in scraped_content:
                    f.write(f"- {source['domain']} ({source['date']})\n")
            
            return result
            
        except Exception as e:
            logging.error(f"Error processing content: {str(e)}")
            return generate_fallback_response(query)
            
    except Exception as e:
        logging.error(f"Error during market trends analysis: {str(e)}")
        return generate_fallback_response(query)

def process_scraped_content(scraped_content, query):
    try:
        # Generate analysis using the scraped content
        analysis = generate_analysis(scraped_content, query)
        
        # Structure the response
        result = {
            "market_size_growth": {
                "total_market_value": extract_bullet_points(analysis, "Market Size"),
                "market_segments": extract_bullet_points(analysis, "Market Segments"),
                "regional_distribution": extract_bullet_points(analysis, "Regional Distribution")
            },
            "competitive_landscape": {
                "market_leaders": extract_bullet_points(analysis, "Market Leaders"),
                "market_differentiators": extract_bullet_points(analysis, "Market Differentiators"),
                "industry_dynamics": extract_bullet_points(analysis, "Industry Dynamics")
            },
            "consumer_analysis": {
                "segments": extract_bullet_points(analysis, "Consumer Segments"),
                "behavior_patterns": extract_bullet_points(analysis, "Behavior Patterns"),
                "pain_points": extract_bullet_points(analysis, "Pain Points")
            },
            "metrics": extract_metrics(scraped_content),
            "sources": [{
                'url': item['url'],
                'domain': item['domain'],
                'section': item['section'],
                'date': item['date']
            } for item in scraped_content]
        }
        
        return result
    except Exception as e:
        logging.error(f"Error processing scraped content: {str(e)}")
        return generate_fallback_response(query)

def extract_domain(url):
    """Extract domain name from URL"""
    try:
        from urllib.parse import urlparse
        domain = urlparse(url).netloc
        return domain.replace('www.', '')
    except:
        return url

def generate_fallback_response(query):
    """Generate fallback response when analysis fails"""
    return {
        "market_size_growth": {
            "total_market_value": [f"Market size analysis for {query} pending (Inferred)"],
            "market_segments": ["Market segmentation analysis needed (Inferred)"],
            "regional_distribution": ["Regional analysis to be conducted (Inferred)"]
        },
        "competitive_landscape": {
            "market_leaders": ["Market leader analysis pending (Inferred)"],
            "market_differentiators": ["Differentiator analysis needed (Inferred)"],
            "industry_dynamics": ["Industry dynamics to be evaluated (Inferred)"]
        },
        "consumer_analysis": {
            "segments": ["Consumer segmentation pending (Inferred)"],
            "behavior_patterns": ["Behavior analysis needed (Inferred)"],
            "pain_points": ["Pain point identification required (Inferred)"]
        },
        "metrics": {},
        "sources": []
    }

def process_analysis(analysis, scraped_content):
    """Process and structure the analysis for frontend consumption"""
    result = {
        "market_size_growth": {
            "total_market_value": [],
            "market_segments": [],
            "regional_distribution": [],
            "growth_drivers": []
        },
        "competitive_landscape": {
            "market_leaders": [],
            "market_differentiators": [],
            "industry_dynamics": [],
            "entry_barriers": []
        },
        "consumer_analysis": {
            "segments": [],
            "behavior_patterns": [],
            "pain_points": [],
            "decision_factors": []
        },
        "technology_innovation": {
            "current_trends": [],
            "emerging_tech": [],
            "digital_impact": [],
            "innovation_opportunities": []
        },
        "regulatory_environment": {
            "key_regulations": [],
            "compliance_requirements": [],
            "environmental_impact": [],
            "sustainability": []
        },
        "future_outlook": {
            "growth_forecast": [],
            "opportunities": [],
            "challenges": [],
            "evolution_scenarios": []
        },
        "strategic_recommendations": {
            "entry_strategies": [],
            "product_development": [],
            "tech_investments": [],
            "risk_mitigation": []
        },
        "metrics": extract_metrics(scraped_content),
        "sources": []
    }

    # Extract sections using more specific patterns
    for section in result.keys():
        if section != "metrics" and section != "sources":
            for subsection in result[section].keys():
                result[section][subsection] = extract_bullet_points(analysis, subsection.replace('_', ' ').title())

    return result

def extract_metrics(scraped_content):
    """Extract and structure metrics from scraped content"""
    metrics = {
        "market_share": {},
        "growth_rates": {},
        "revenue": {}
    }
    
    for item in scraped_content:
        if 'metrics' in item:
            # Process market share
            for i, share in enumerate(item['metrics'].get('market_share', [])):
                try:
                    value = float(share)
                    metrics['market_share'][f'Company {i+1}'] = value
                except ValueError:
                    continue
                    
            # Process growth rates
            for i, rate in enumerate(item['metrics'].get('growth_rates', [])):
                try:
                    value = float(rate)
                    metrics['growth_rates'][f'Period {i+1}'] = value
                except ValueError:
                    continue
                    
            # Process revenue figures
            for i, amount in enumerate(item['metrics'].get('money', [])):
                try:
                    value = float(amount)
                    metrics['revenue'][f'Entity {i+1}'] = value
                except ValueError:
                    continue
    
    return metrics

def extract_bullet_points(text, section_name):
    """Extract bullet points from a specific section"""
    try:
        lines = []
        in_section = False
        
        for line in text.split('\n'):
            if section_name in line:
                in_section = True
                continue
            elif any(s in line for s in [
                "Market Size", "Market Segments", "Regional Distribution",
                "Market Leaders", "Market Differentiators", "Industry Dynamics",
                "Consumer Segments", "Behavior Patterns", "Pain Points",
                "Current Trends", "Emerging Technologies", "Growth Forecast",
                "Opportunities", "Challenges"
            ]):
                in_section = False
            elif in_section and line.strip().startswith('•'):
                cleaned_line = line.strip('• ').strip()
                if cleaned_line and not cleaned_line.endswith(':'):
                    lines.append(cleaned_line)
        
        return lines if lines else [f"Analysis for {section_name} pending (Inferred)"]
        
    except Exception as e:
        logging.error(f"Error extracting bullet points for {section_name}: {str(e)}")
        return [f"Error extracting {section_name} data (Inferred)"]

def generate_analysis(scraped_content, query):
    """Generate market trends analysis using Gemini"""
    try:
        # Prepare content for analysis
        content_text = "\n\n".join([item['content'] for item in scraped_content])
        
        # Create the analysis prompt
        analysis_prompt = f"""
        Task: Analyze the provided content to create a detailed market trends analysis for {query}.

        Content to analyze:
        {content_text}

        Please provide a structured analysis covering these exact sections:

        Market Size & Growth:
        Market Size:
        • [Provide market size estimates with specific numbers where available]
        • [Include year-over-year growth rates]

        Market Segments:
        • [Identify key market segments]
        • [Provide segment-wise breakdown]

        Regional Distribution:
        • [Analyze geographical distribution]
        • [Identify key markets and growth regions]

        Competitive Landscape:
        Market Leaders:
        • [List top companies and their market positions]
        • [Include market share data where available]

        Market Differentiators:
        • [Identify key competitive advantages]
        • [Analyze unique selling propositions]

        Industry Dynamics:
        • [Analyze industry trends and changes]
        • [Identify market drivers and challenges]

        Consumer Analysis:
        Consumer Segments:
        • [Identify key customer segments]
        • [Analyze segment characteristics]

        Behavior Patterns:
        • [Analyze purchasing patterns]
        • [Identify decision factors]

        Pain Points:
        • [List key customer challenges]
        • [Identify unmet needs]

        Technology & Innovation:
        Current Trends:
        • [Identify current technology trends]
        • [Analyze adoption rates]

        Emerging Technologies:
        • [List emerging technologies]
        • [Assess potential impact]

        Future Outlook:
        Growth Forecast:
        • [Provide growth projections]
        • [Identify growth drivers]

        Opportunities:
        • [List market opportunities]
        • [Identify potential areas for expansion]

        Challenges:
        • [Identify market challenges]
        • [List potential risks]

        Format each point with specific data where available.
        Mark inferences with (Inferred).
        Prioritize insights based on confidence and impact.
        """
        
        # Generate analysis using Gemini
        response = model.generate_content(analysis_prompt)
        if not response or not response.text:
            raise Exception("No response from Gemini")
            
        analysis = response.text
        
        # Save raw analysis to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        raw_output_file = os.path.join('gemini_outputs', f'market_trends_raw_{timestamp}.txt')
        
        with open(raw_output_file, 'w', encoding='utf-8') as f:
            f.write(f"Raw Market Trends Analysis for: {query}\n")
            f.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("="*50 + "\n\n")
            f.write("Input Content:\n")
            f.write("-"*30 + "\n")
            f.write(content_text[:1000] + "...\n\n")
            f.write("Generated Analysis:\n")
            f.write("-"*30 + "\n")
            f.write(analysis)
        
        return analysis
        
    except Exception as e:
        logging.error(f"Error generating analysis: {str(e)}")
        raise