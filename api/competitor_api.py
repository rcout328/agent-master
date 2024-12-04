from flask import Blueprint, request, jsonify, Flask
from flask_cors import CORS
import requests
import logging
from datetime import datetime
import json
import google.generativeai as genai

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create Blueprint
competitor_tracking = Blueprint('competitor_tracking', __name__)

AUTH_TOKEN = "55784713bbfc32152f470b5c6d053626c1cd49e124ea9d4aa461789632a0ee1b"

# Initialize Gemini
GOOGLE_API_KEY = "AIzaSyAE2SKBA38bOktQBdXS6mTK5Y1a-nKB3Mo"
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

@competitor_tracking.route('/api/competitor-analysis', methods=['POST'])
def analyze_competitors():
    """API endpoint for competitor analysis"""
    try:
        logger.info("Received competitor analysis request")
        data = request.json
        snapshot_id = data.get('snapshot_id')
        
        if not snapshot_id:
            logger.warning("No snapshot ID provided")
            return jsonify({'error': 'No snapshot ID provided'}), 400

        logger.info(f"Processing snapshot ID: {snapshot_id}")
        
        # Get data from Brightdata
        url = f"https://api.brightdata.com/datasets/v3/snapshot/{snapshot_id}?format=json"
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        
        logger.info("Fetching data from Brightdata API")
        response = requests.get(url, headers=headers)
        
        if not response.ok:
            logger.error(f"Brightdata API error: {response.status_code} - {response.text}")
            return jsonify({'error': 'Failed to fetch data'}), response.status_code
            
        # Parse JSON response
        try:
            raw_data = response.json()
            if isinstance(raw_data, str):
                raw_data = json.loads(raw_data)
            if 'results' in raw_data:
                raw_data = raw_data['results']
            
            logger.info(f"Successfully retrieved {len(raw_data)} records")
            
            # Process the data
            processed_data = {
                'target_company': raw_data[0],
                'competitors': raw_data[1:6],
                'metrics': {
                    'market_presence': calculate_market_presence(raw_data),
                    'technology_stack': analyze_technology_stack(raw_data),
                    'funding_comparison': compare_funding(raw_data),
                    'growth_metrics': calculate_growth_metrics(raw_data)
                }
            }
            
            return jsonify({
                'success': True,
                'data': processed_data
            })
            
        except Exception as e:
            logger.error(f"Error processing data: {str(e)}")
            return jsonify({'error': str(e)}), 500
            
    except Exception as e:
        logger.error(f"Error during competitor analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

def calculate_market_presence(data):
    return [{
        'name': company.get('name'),
        'monthly_visits': company.get('monthly_visits', 0),
        'social_presence': len(company.get('social_media_links', [])),
        'regions': company.get('region', 'Unknown')
    } for company in data]

def analyze_technology_stack(data):
    return [{
        'name': company.get('name'),
        'tech_count': company.get('active_tech_count', 0),
        'key_technologies': [
            tech.get('name') for tech in (company.get('builtwith_tech', []))[:5]
        ]
    } for company in data]

def compare_funding(data):
    return [{
        'name': company.get('name'),
        'funding_rounds': company.get('funding_rounds', {}).get('num_funding_rounds', 0),
        'total_funding': company.get('funding_rounds', {}).get('value', {}).get('value_usd', 0),
        'investors': company.get('num_investors', 0)
    } for company in data]

def calculate_growth_metrics(data):
    return [{
        'name': company.get('name'),
        'employee_growth': company.get('num_employees', 'Unknown'),
        'monthly_growth': company.get('monthly_visits_growth', 0),
        'news_mentions': company.get('num_news', 0)
    } for company in data]

def create_app():
    """Create and configure the Flask app"""
    app = Flask(__name__)
    CORS(app)
    app.register_blueprint(competitor_tracking)
    return app

if __name__ == "__main__":
    logger.info("Starting Competitor Analysis API server...")
    app = create_app()
    app.run(host='0.0.0.0', port=5002, debug=True)