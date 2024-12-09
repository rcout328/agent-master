from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import os
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor
import json
import google.generativeai as genai
import time
from datetime import datetime
from googlesearch import search
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from competitor_news_api import get_competitor_insights
from feedback_validation_api import FeedbackAnalyzer, process_feedback_validation
from pain_points_api import analyze_pain_points
from journey_mapping_api import journey_mapping_endpoint
from product_suggestions_api import analyze_product_suggestions
from geographical_analysis_api import analyze_geographical_data
from customer_impact_api import analyze_customer_impact

# Initialize Gemini
GOOGLE_API_KEY = "AIzaSyAE2SKBA38bOktQBdXS6mTK5Y1a-nKB3Mo"
genai.configure(api_key=GOOGLE_API_KEY)

# Initialize Flask app
app = Flask(__name__)
# Configure CORS to allow all origins and methods
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "expose_headers": ["Content-Type"]
    }
})

# Logging configuration
logging.basicConfig(level=logging.DEBUG)

# Create thread pool for parallel execution
executor = ThreadPoolExecutor(max_workers=10)

# Create a directory to store Gemini outputs
output_dir = 'gemini_outputs'
os.makedirs(output_dir, exist_ok=True)

# Import the analysis functions
from market_trends_api import get_trends_data
from competitor_api import get_competitor_data, create_empty_response
from icp_api import analyze_icp
from journey_api import get_journey_data
from feature_api import get_feature_data
from feedback_api import get_feedback_data
from gap_api import get_gap_data
from impact_api import get_impact_data
from market_assessment_api import get_market_data
from swot_api import get_swot_data
from competitor_sentiment_api import analyze_competitor_sentiment

# Add a custom logger setup
def setup_logging():
    logger = logging.getLogger('competitor_analysis')
    logger.setLevel(logging.DEBUG)
    
    # Create file handler
    fh = logging.FileHandler('competitor_analysis.log')
    fh.setLevel(logging.DEBUG)
    
    # Create console handler
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    
    # Create formatter
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    fh.setFormatter(formatter)
    ch.setFormatter(formatter)
    
    # Add handlers
    logger.addHandler(fh)
    logger.addHandler(ch)
    
    return logger

logger = setup_logging()

# Add Google Custom Search API credentials
GOOGLE_API_KEY = "YOUR_GOOGLE_API_KEY"
CUSTOM_SEARCH_ENGINE_ID = "YOUR_SEARCH_ENGINE_ID"

def get_competitor_news_from_google(competitor_name):
    """Get latest news about competitor using Google Custom Search"""
    try:
        # Build the Google Custom Search API service
        service = build("customsearch", "v1", developerKey=GOOGLE_API_KEY)

        # Execute the search
        result = service.cse().list(
            q=f"{competitor_name} company news",
            cx=CUSTOM_SEARCH_ENGINE_ID,
            num=4,  # Get 4 news items
            dateRestrict='m1',  # Last month
            sort='date'  # Sort by date
        ).execute()

        news_items = []
        if 'items' in result:
            for item in result['items']:
                try:
                    # Get article content using BeautifulSoup
                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                    response = requests.get(item['link'], headers=headers, timeout=10)
                    soup = BeautifulSoup(response.text, 'html.parser')
                    
                    # Extract article content
                    article_text = ""
                    article = soup.find('article') or soup.find('main') or soup.find('body')
                    if article:
                        paragraphs = article.find_all('p')
                        article_text = ' '.join([p.get_text().strip() for p in paragraphs])
                    
                    news_items.append({
                        'title': item.get('title', ''),
                        'link': item.get('link', ''),
                        'snippet': item.get('snippet', ''),
                        'date': item.get('pagemap', {}).get('metatags', [{}])[0].get('article:published_time', ''),
                        'source': item.get('displayLink', ''),
                        'content': article_text[:1000]  # Limit content length
                    })
                except Exception as e:
                    logger.error(f"Error processing news item: {str(e)}")
                    continue

        return news_items
    except HttpError as e:
        logger.error(f"Error searching Google News: {str(e)}")
        return []
    except Exception as e:
        logger.error(f"Error in get_competitor_news: {str(e)}")
        return []

def analyze_news_with_gemini(competitor_name, news_items):
    """Analyze news items using Gemini"""
    try:
        if not news_items:
            return None

        news_prompt = f"""
        Analyze these recent news items about {competitor_name}:

        {json.dumps(news_items, indent=2)}

        Provide analysis in this JSON format:
        {{
            "key_developments": [
                {{
                    "title": "Development title",
                    "description": "Brief description",
                    "impact": "Potential market impact"
                }}
            ],
            "market_trends": ["trend1", "trend2"],
            "competitive_moves": ["move1", "move2"],
            "overall_sentiment": "positive/negative/neutral",
            "summary": "Brief analysis summary"
        }}
        """

        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(news_prompt)
        
        if response.parts and response.parts[0].text:
            analysis = json.loads(response.parts[0].text)
            return analysis
        
        return None
    except Exception as e:
        logger.error(f"Error analyzing news with Gemini: {str(e)}")
        return None

def get_competitor_prompt(query):
    return f"""
    Analyze and provide detailed information about the top 5 direct competitors for {query}.
    Return the response in valid JSON format without any markdown formatting.
    
    For each competitor, provide:
    1. Company Name: Full official name
    2. Brief Description: 2-3 sentences about their main business
    3. Key Strengths: 3-4 main competitive advantages
    4. Market Position: Their position in the market relative to {query}
    5. Target Market: Their primary customer segments
    6. Unique Features: What distinguishes them from others

    The response must be a JSON object with this exact structure:
    {{
        "competitors": [
            {{
                "name": "Company Name",
                "description": "Detailed description",
                "strengths": ["Strength 1", "Strength 2", "Strength 3"],
                "market_position": "Market position details",
                "target_market": "Primary customer segments",
                "unique_features": ["Feature 1", "Feature 2"]
            }}
        ],
        "analysis_summary": "Brief overview of competitive landscape"
    }}

    Focus on direct competitors in the same market segment as {query}.
    Ensure all arrays are properly formatted with square brackets and all strings are properly quoted.
    """

@app.route('/api/competitor-analysis', methods=['POST', 'OPTIONS'])
def analyze_competitors():
    """Endpoint for competitor analysis"""
    if request.method == 'OPTIONS':
        # Add required CORS headers for preflight requests
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response, 204
        
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        # Use the analyze_icp function here
        icp_result, status_code = analyze_icp(query)
        if status_code != 200:
            return jsonify(icp_result), status_code

        # Run competitor analysis in a separate thread
        future = executor.submit(get_competitor_data, query)
        competitor_info = future.result(timeout=60)

        # Save the competitor analysis output to a text file
        with open(os.path.join(output_dir, 'compitoone.txt'), 'w') as f:
            f.write(str(competitor_info))

        return jsonify(competitor_info)

    except Exception as e:
        logging.error(f"Error during competitor analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/market-trends', methods=['POST', 'OPTIONS'])
def analyze_market_trends():
    """Endpoint for market trends analysis"""
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response, 204
        
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        # Run market trends analysis in a separate thread
        future = executor.submit(get_trends_data, query)
        trends_info = future.result(timeout=60)

        # Save the market trends output to a text file
        with open(os.path.join(output_dir, 'compitoone.txt'), 'a') as f:
            f.write(str(trends_info))

        return jsonify(trends_info)

    except Exception as e:
        logging.error(f"Error during market trends analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/icp-analysis', methods=['POST'])
def analyze_icp_endpoint():
    """Endpoint for ICP analysis"""
    data = request.json
    query = data.get('query')
    
    if not query:
        return jsonify({'error': 'No query provided'}), 400

    # Call the analyze_icp function
    icp_result, status_code = analyze_icp(query)
    return jsonify(icp_result), status_code

@app.route('/api/journey-analysis', methods=['POST', 'OPTIONS'])
def analyze_journey():
    """Endpoint for journey analysis"""
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response, 204
        
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        # Run journey analysis in a separate thread
        future = executor.submit(get_journey_data, query)
        journey_info = future.result(timeout=60)

        # Save the journey analysis output to a text file
        with open(os.path.join(output_dir, 'compitoone.txt'), 'a') as f:
            f.write(str(journey_info))

        return jsonify(journey_info)

    except Exception as e:
        logging.error(f"Error during journey analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/feature-priority', methods=['POST', 'OPTIONS'])
def analyze_features():
    """Endpoint for feature priority analysis"""
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response, 204
        
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        # Run feature analysis in a separate thread
        future = executor.submit(get_feature_data, query)
        feature_info = future.result(timeout=60)

        # Save the feature analysis output to a text file
        with open(os.path.join(output_dir, 'compitoone.txt'), 'a') as f:
            f.write(str(feature_info))

        return jsonify(feature_info)

    except Exception as e:
        logging.error(f"Error during feature analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/feedback-analysis', methods=['POST', 'OPTIONS'])
def analyze_feedback():
    """Endpoint for feedback analysis"""
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response, 204
        
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        # Run feedback analysis in a separate thread
        future = executor.submit(get_feedback_data, query)
        feedback_info = future.result(timeout=60)

        # Save the feedback analysis output to a text file
        with open(os.path.join(output_dir, 'compitoone.txt'), 'a') as f:
            f.write(str(feedback_info))

        return jsonify(feedback_info)

    except Exception as e:
        logging.error(f"Error during feedback analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/gap-analysis', methods=['POST', 'OPTIONS'])
def analyze_gap():
    """Endpoint for gap analysis"""
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response, 204
        
    try:
        data = request.json
        if not data or 'query' not in data:
            return jsonify({'error': 'No query provided'}), 400

        query = data.get('query')
        if not query.strip():
            return jsonify({'error': 'Empty query provided'}), 400

        # Run gap analysis in a separate thread with timeout
        try:
            future = executor.submit(get_gap_data, query)
            gap_info = future.result(timeout=60)  # 60 second timeout
            
            if not gap_info:
                return jsonify({'error': 'No analysis results available'}), 404

            # Save the gap analysis output to a text file
            try:
                with open(os.path.join(output_dir, 'compitoone.txt'), 'a') as f:
                    f.write(f"\nGap Analysis for {query}:\n")
                    f.write("="*50 + "\n")
                    f.write(str(gap_info))
                    f.write("\n" + "="*50 + "\n")
            except Exception as file_error:
                logging.error(f"Error saving gap analysis output: {str(file_error)}")
                # Continue even if file saving fails

            return jsonify(gap_info)

        except TimeoutError:
            return jsonify({'error': 'Analysis timed out'}), 504
        except Exception as analysis_error:
            logging.error(f"Error in gap analysis execution: {str(analysis_error)}")
            return jsonify({'error': 'Analysis failed', 'details': str(analysis_error)}), 500

    except Exception as e:
        logging.error(f"Error in gap analysis endpoint: {str(e)}")
        return jsonify({
            'error': 'Failed to process request',
            'details': str(e)
        }), 500

@app.route('/api/impact-assessment', methods=['POST', 'OPTIONS'])
def analyze_impact():
    """Endpoint for impact assessment"""
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response, 204
        
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        # Run impact analysis in a separate thread
        future = executor.submit(get_impact_data, query)
        impact_info = future.result(timeout=60)

        # Save the impact assessment output to a text file
        with open(os.path.join(output_dir, 'compitoone.txt'), 'a') as f:
            f.write(str(impact_info))

        return jsonify(impact_info)

    except Exception as e:
        logging.error(f"Error during impact assessment: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/market-assessment', methods=['POST', 'OPTIONS'])
def analyze_market():
    """Endpoint for market assessment"""
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response, 204
        
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        # Run market assessment in a separate thread
        future = executor.submit(get_market_data, query)
        market_info = future.result(timeout=60)

        # Save the market assessment output to a text file
        with open(os.path.join(output_dir, 'compitoone.txt'), 'a') as f:
            f.write(str(market_info))

        return jsonify(market_info)

    except Exception as e:
        logging.error(f"Error during market assessment: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/swot-analysis', methods=['POST', 'OPTIONS'])
def analyze_swot():
    """Endpoint for SWOT analysis"""
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response, 204
        
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        # Run SWOT analysis in a separate thread
        future = executor.submit(get_swot_data, query)
        swot_info = future.result(timeout=60)

        # Save the SWOT analysis output to a text file
        with open(os.path.join(output_dir, 'compitoone.txt'), 'a') as f:
            f.write(str(swot_info))

        return jsonify(swot_info)

    except Exception as e:
        logging.error(f"Error during SWOT analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/competitor-sentiment', methods=['POST', 'OPTIONS'])
def competitor_sentiment():
    """Endpoint for competitor sentiment analysis"""
    if request.method == 'OPTIONS':
        logger.debug('Handling OPTIONS request for sentiment analysis')
        response = jsonify({})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response, 204
        
    try:
        start_time = time.time()
        logger.info('Starting sentiment analysis process')
        
        data = request.get_json()
        if not data:
            logger.error('No data provided in request')
            return jsonify({'error': 'No data provided'}), 400
            
        query = data.get('query')
        if not query:
            logger.error('No query provided in request data')
            return jsonify({'error': 'No query provided'}), 400

        logger.info(f'Analyzing sentiment for: {query}')

        # Run sentiment analysis
        result = analyze_competitor_sentiment(query)
        if not result:
            logger.error('Sentiment analysis failed to produce results')
            return jsonify({'error': 'Failed to analyze sentiment'}), 500

        # Save sentiment analysis to file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        sentiment_file = f'sentiment_analysis_{timestamp}.json'
        with open(os.path.join(output_dir, sentiment_file), 'w') as f:
            json.dump({
                'query': query,
                'timestamp': timestamp,
                'execution_time': time.time() - start_time,
                'results': result
            }, f, indent=2)
        
        logger.info(f'Sentiment analysis saved to {sentiment_file}')
        logger.info(f'Sentiment analysis completed in {time.time() - start_time:.2f} seconds')

        response = jsonify(result)
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response

    except Exception as e:
        logger.error(f'Error during sentiment analysis: {str(e)}', exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    response = jsonify({'status': 'healthy'})
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response

# Add error handling middleware
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# Add request logging middleware
@app.before_request
def log_request_info():
    logging.info('Headers: %s', request.headers)
    logging.info('Body: %s', request.get_data())

@app.route('/api/search-competitors', methods=['POST', 'OPTIONS'])
def search_competitors():
    """Endpoint to search for competitors"""
    if request.method == 'OPTIONS':
        logger.debug('Handling OPTIONS request')
        response = jsonify({})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response, 204

    try:
        start_time = time.time()
        logger.info('Starting competitor search process')
        
        data = request.get_json()
        if not data or 'query' not in data:
            return jsonify({'error': 'No query provided'}), 400
            
        query = data['query']
        logger.info(f'Analyzing competitors for: {query}')

        # First, get competitor list from Gemini
        competitor_prompt = f"""
        Analyze and list exactly 5 main competitors for {query}.
        Return only a JSON object in this exact format:
        {{
            "competitors": [
                {{
                    "name": "Competitor Name",
                    "description": "2-3 sentence description",
                    "strengths": ["strength1", "strength2", "strength3"],
                    "market_position": "Brief market position",
                    "target_market": "Target audience",
                    "unique_features": ["feature1", "feature2"]
                }}
            ],
            "analysis_summary": "Brief market overview"
        }}
        """

        # Get competitors from Gemini
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(
            contents=competitor_prompt,
            generation_config={
                "temperature": 0.7,
                "top_p": 1,
                "max_output_tokens": 2048,
            }
        )

        if not response.parts or not response.parts[0].text:
            return jsonify({'error': 'Failed to generate competitor list'}), 500

        # Parse competitor data
        try:
            text = response.parts[0].text.strip()
            if '```' in text:
                text = text.split('```')[1].strip()
            result = json.loads(text)
        except Exception as e:
            logger.error(f'Error parsing competitor data: {e}')
            return jsonify({'error': 'Failed to parse competitor data'}), 500

        # For each competitor, get recent news and analyze
        for competitor in result['competitors']:
            try:
                # Get recent news
                news_prompt = f"""
                Analyze recent developments and news for {competitor['name']}.
                Focus on:
                1. Recent business developments
                2. Market performance
                3. New initiatives
                4. Industry impact
                
                Return a JSON object with:
                {{
                    "recent_developments": ["development1", "development2"],
                    "market_updates": ["update1", "update2"],
                    "key_initiatives": ["initiative1", "initiative2"]
                }}
                """
                
                news_response = model.generate_content(
                    contents=news_prompt,
                    generation_config={"temperature": 0.7, "top_p": 1}
                )
                
                if news_response.parts and news_response.parts[0].text:
                    try:
                        news_text = news_response.parts[0].text.strip()
                        if '```' in news_text:
                            news_text = news_text.split('```')[1].strip()
                        news_data = json.loads(news_text)
                        competitor['news'] = news_data
                    except:
                        competitor['news'] = {
                            "recent_developments": [],
                            "market_updates": [],
                            "key_initiatives": []
                        }
                
            except Exception as e:
                logger.error(f'Error getting news for {competitor["name"]}: {e}')
                competitor['news'] = {
                    "recent_developments": [],
                    "market_updates": [],
                    "key_initiatives": []
                }

        # Save complete analysis
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        analysis_file = f'competitor_analysis_{timestamp}.json'
        with open(os.path.join(output_dir, analysis_file), 'w') as f:
            json.dump({
                'query': query,
                'timestamp': timestamp,
                'execution_time': time.time() - start_time,
                'results': result
            }, f, indent=2)
        
        logger.info(f'Analysis completed in {time.time() - start_time:.2f} seconds')
        return jsonify(result)

    except Exception as e:
        logger.error(f'Error in competitor search: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/competitor-news', methods=['POST', 'OPTIONS'])
def get_competitor_news_endpoint():
    """Endpoint to get competitor news and analysis"""
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response, 204

    try:
        data = request.get_json()
        competitor_name = data.get('competitor')
        
        if not competitor_name:
            return jsonify({'error': 'No competitor name provided'}), 400

        # Get complete competitor insights
        insights = get_competitor_insights(competitor_name)
        
        if not insights:
            return jsonify({'error': 'Failed to get competitor insights'}), 500

        # Save analysis to file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'competitor_news_{timestamp}.json'
        with open(os.path.join(output_dir, filename), 'w') as f:
            json.dump(insights, f, indent=2)

        return jsonify(insights)

    except Exception as e:
        logger.error(f"Error getting competitor news: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/feedback-validation', methods=['POST', 'OPTIONS'])
def feedback_validation_endpoint():
    """Endpoint to validate and analyze customer feedback"""
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response, 204

    try:
        data = request.json
        query = data.get('query')
        platforms = data.get('platforms', ['google reviews'])
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        # Use process_feedback_validation with fallback
        result = process_feedback_validation(query, platforms)
        
        if not result or (isinstance(result, tuple) and result[1] == 404):
            # If no data found, return empty structure instead of 404
            return jsonify({
                'query': query,
                'timestamp': datetime.now().isoformat(),
                'feedback_count': 0,
                'analysis': {
                    'sentiment_analysis': {
                        'overall_sentiment': 'neutral',
                        'sentiment_score': 0,
                        'distribution': {'positive': 0, 'neutral': 100, 'negative': 0}
                    },
                    'key_themes': [],
                    'recommendations': []
                },
                'sources': []
            }), 200

        return jsonify(result)

    except Exception as e:
        logger.error(f"Error in feedback validation: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/pain-points', methods=['POST', 'OPTIONS'])
def pain_points_endpoint():
    """Endpoint to analyze customer pain points"""
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response, 204

    try:
        data = request.json
        query = data.get('query')
        market_segment = data.get('market_segment')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        # Analyze pain points
        results = analyze_pain_points(query, market_segment)
        if not results:
            return jsonify({'error': 'Analysis failed'}), 500

        # Save analysis to file with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'pain_points_{timestamp}.json'
        
        with open(os.path.join(output_dir, filename), 'w') as f:
            json.dump({
                'query': query,
                'market_segment': market_segment,
                'timestamp': timestamp,
                'results': results
            }, f, indent=2)

        return jsonify(results)

    except Exception as e:
        logger.error(f"Error in pain points analysis: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/journey-mapping', methods=['POST', 'OPTIONS'])
def analyze_journey_mapping():
    """Endpoint for journey mapping analysis"""
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response, 204
        
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        # Call the journey mapping endpoint
        result = journey_mapping_endpoint()
        return result

    except Exception as e:
        logger.error(f"Error in journey mapping analysis: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

# Add this route for journey simulation
@app.route('/api/journey-mapping', methods=['POST', 'OPTIONS'])
def journey_simulation_endpoint():
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response, 204
        
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        # Get journey data using existing function
        result = get_journey_data(query)
        return jsonify(result)

    except Exception as e:
        logger.error(f"Error in journey simulation: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/product-suggestions', methods=['POST', 'OPTIONS'])
def product_suggestions_endpoint():
    """Endpoint for product enhancement suggestions"""
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response, 204
        
    try:
        data = request.json
        if not data or not data.get('name'):
            return jsonify({'error': 'Product details required'}), 400

        # Log the incoming request
        logger.info(f"Analyzing product: {data.get('name')}")
        
        # Get product suggestions
        result = analyze_product_suggestions(data)
        
        # Save analysis to file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'product_suggestions_{timestamp}.json'
        
        with open(os.path.join(output_dir, filename), 'w') as f:
            json.dump({
                'product_details': data,
                'timestamp': timestamp,
                'analysis': result
            }, f, indent=2)
            
        logger.info(f"Analysis saved to {filename}")

        return jsonify(result)

    except Exception as e:
        logger.error(f"Error in product suggestions: {str(e)}", exc_info=True)
        return jsonify({
            'error': str(e),
            'suggestions': [],
            'market_insights': {
                'trends': [],
                'competitor_activities': [],
                'customer_needs': []
            },
            'sources': []
        }), 500

@app.route('/api/geographical-analysis', methods=['POST', 'OPTIONS'])
def geographical_analysis_endpoint():
    """Endpoint for geographical analysis"""
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response, 204
        
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Analyze geographical data
        result = analyze_geographical_data(data)
        return jsonify(result)

    except Exception as e:
        logger.error(f"Error in geographical analysis: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/customer-impact', methods=['POST', 'OPTIONS'])
def analyze_customer_impact_endpoint():
    """Endpoint for customer impact analysis"""
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response, 204

    try:
        data = request.json
        company_name = data.get('company_name')

        if not company_name:
            return jsonify({'error': 'No company name provided'}), 400

        # Run customer impact analysis in a separate thread
        future = executor.submit(analyze_customer_impact, company_name)
        impact_info = future.result(timeout=60)  # Adjust timeout as needed

        # Save the impact analysis output to a JSON file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'customer_impact_{timestamp}.json'
        with open(os.path.join(output_dir, filename), 'w') as f:
            json.dump(impact_info, f, indent=2)

        return jsonify(impact_info)

    except Exception as e:
        logging.error(f"Error during customer impact analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    try:
        # Use port 5001 instead of 5000
        app.run(host='0.0.0.0', port=5001, debug=True)
    finally:
        # Clean up resources
        executor.shutdown(wait=True) 