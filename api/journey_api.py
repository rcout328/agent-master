from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime
from firecrawl import FirecrawlApp
import json
import os
import requests
import time
from googlesearch import search

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

app = Flask(__name__)
CORS(app)

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
    """Scrape URL content with retries"""
    for attempt in range(max_retries):
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                return response.text
        except Exception as e:
            logging.warning(f"Attempt {attempt + 1} failed: {str(e)}")
            if attempt < max_retries - 1:
                time.sleep(2)
    return None

def get_journey_data(business_query):
    """
    Get customer journey data using enhanced search and analysis
    """
    logging.info(f"\n{'='*50}\nGathering journey data for: {business_query}\n{'='*50}")
    
    # Reduced to 5 most important search queries covering entire journey
    search_queries = [
        # Comprehensive Journey Overview
        f"{business_query} customer journey analysis experience touchpoints",
        
        # Pre-Purchase & Research
        f"{business_query} how customers discover research process marketing channels",
        
        # Purchase & Decision Making
        f"{business_query} purchase decision factors checkout experience",
        
        # Post-Purchase Experience
        f"{business_query} customer support delivery satisfaction reviews",
        
        # Optimization & Improvements
        f"{business_query} customer pain points improvements optimization"
    ]
    
    scraped_content = []
    
    for query in search_queries:
        try:
            logging.info(f"\nSearching for: {query}")
            # Use googlesearch package instead of custom search API
            search_results = list(search(query, num_results=2))
            
            for url in search_results:
                content = scrape_with_retry(url)
                if content and len(content) > 200:
                    scraped_content.append({
                        'url': url,
                        'domain': extract_domain(url),
                        'section': 'Journey Analysis',
                        'date': datetime.now().strftime("%Y-%m-%d"),
                        'content': content[:2000]
                    })
            time.sleep(2)
            
        except Exception as e:
            logging.error(f"Error in search: {str(e)}")
            continue

    if scraped_content:
        try:
            journey_prompt = f"""
            Task: Create a detailed customer journey analysis for {business_query}.

            Content to analyze:
            {[item['content'] for item in scraped_content]}

            Analysis:
            Pre-Purchase Journey
            Awareness Phase:
            • How do customers first learn about {business_query}? (e.g., organic search, social media, referrals)
            • What marketing channels are most effective in reaching the target audience?

            Research Phase:
            • What information do customers seek before making a purchase? (e.g., product reviews, pricing, features)
            • Which websites or platforms do customers use to research?

            Consideration Phase:
            • What factors influence customers' decision-making process? (e.g., brand reputation, product quality, price)
            • What are the main competitors and how does {business_query} differentiate itself?

            Purchase Experience
            Decision Making:
            • What factors influence the final purchase decision? (e.g., promotions, discounts, limited-time offers)
            • How can we simplify the decision-making process?

            Checkout Process:
            • How smooth is the checkout process? (e.g., number of steps, payment options)
            • What can be done to reduce cart abandonment?

            Payment Options:
            • Are the payment options convenient and secure?
            • Can we offer additional payment methods to cater to different customer preferences?

            Post-Purchase Journey
            Order Confirmation:
            • How quickly do customers receive order confirmation?
            • Is the confirmation email clear and informative?

            Delivery Experience:
            • How timely and reliable is the delivery process?
            • Is the packaging adequate and environmentally friendly?

            Product Usage:
            • How easy is it for customers to use the product or service?
            • Is there adequate support available for customers?

            Optimization Opportunities
            Pain Points:
            • Identify specific pain points in the customer journey (e.g., slow website load times, confusing navigation, poor customer support)

            Improvement Areas:
            • Propose solutions to address the identified pain points (e.g., optimize website performance, simplify checkout process, improve customer support)

            Enhancement Suggestions:
            • Implement strategies to enhance the overall customer experience (e.g., personalized recommendations, loyalty programs, gamification)

            Additional Considerations:
            • Data-Driven Insights: Utilize customer data and analytics to identify trends and opportunities for improvement
            • Customer Feedback: Actively seek and analyze customer feedback through surveys, reviews, and social media
            • Competitive Analysis: Benchmark {business_query}'s customer journey against competitors to identify best practices
            • A/B Testing: Experiment with different approaches to optimize the customer journey

            Format each point with specific data where available.
            Mark inferences with (Inferred).
            Provide actionable insights and recommendations.
            """
            
            response = model.generate_content(journey_prompt)
            analysis = response.text
            
            # Save analysis to file with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = os.path.join(output_folder, f'journey_analysis_{timestamp}.txt')
            
            with open(output_file, 'w') as f:
                f.write(f"Customer Journey Analysis for: {business_query}\n")
                f.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write("="*50 + "\n\n")
                f.write(analysis + "\n\n")
                f.write("\nAdditional Considerations:\n")
                f.write("="*30 + "\n")
                f.write("Data Sources:\n")
                for source in scraped_content:
                    f.write(f"- {source['domain']} ({source['date']})\n")
            
            logging.info(f"Analysis saved to: {output_file}")
            
            # Process and structure the response
            result = {
                "pre_purchase": extract_section(analysis, "Pre-Purchase Journey"),
                "purchase": extract_section(analysis, "Purchase Experience"),
                "post_purchase": extract_section(analysis, "Post-Purchase Journey"),
                "optimization": extract_section(analysis, "Optimization Opportunities"),
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
            
    return generate_fallback_journey(business_query)

def extract_section(text, section_name):
    """Extract content from a specific section"""
    try:
        lines = []
        in_section = False
        
        for line in text.split('\n'):
            if section_name + ":" in line:
                in_section = True
                continue
            elif any(s + ":" in line for s in ["PRE-PURCHASE JOURNEY", "PURCHASE EXPERIENCE", "POST-PURCHASE JOURNEY", "OPTIMIZATION OPPORTUNITIES"]):
                in_section = False
            elif in_section and line.strip():
                cleaned_line = line.strip('- *').strip()
                if cleaned_line and not cleaned_line.endswith(':'):
                    lines.append(cleaned_line)
        
        return lines
    except Exception as e:
        logging.error(f"Error extracting section {section_name}: {str(e)}")
        return []

def generate_fallback_journey(business_query):
    """Generate basic journey data when no content is found"""
    return {
        "pre_purchase": [
            f"Customers discover {business_query} through various channels (Inferred)",
            "Research phase includes product comparisons (Inferred)",
            "Decision influenced by reviews and ratings (Inferred)"
        ],
        "purchase": [
            "Customer selects desired products (Inferred)",
            "Multiple payment options available (Inferred)",
            "Secure checkout process (Inferred)"
        ],
        "post_purchase": [
            "Order confirmation and tracking (Inferred)",
            "Delivery and fulfillment process (Inferred)",
            "Customer support available (Inferred)"
        ],
        "optimization": [
            "Streamline checkout process (Inferred)",
            "Improve product discovery (Inferred)",
            "Enhance customer support (Inferred)"
        ],
        "sources": []
    }

@app.route('/api/journey-analysis', methods=['POST', 'OPTIONS'])
def analyze_journey():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.json
        business_query = data.get('query')
        
        if not business_query:
            return jsonify({'error': 'No business query provided'}), 400

        journey_data = get_journey_data(business_query)
        return jsonify(journey_data)

    except Exception as e:
        logging.error(f"Error during journey analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5003, debug=True) 