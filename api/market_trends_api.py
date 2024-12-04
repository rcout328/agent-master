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

# Create Blueprint first
market_trends = Blueprint('market_trends', __name__)

AUTH_TOKEN = "55784713bbfc32152f470b5c6d053626c1cd49e124ea9d4aa461789632a0ee1b"

# Initialize Gemini
GOOGLE_API_KEY = "AIzaSyAE2SKBA38bOktQBdXS6mTK5Y1a-nKB3Mo"
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

@market_trends.route('/api/market-trends', methods=['POST'])
def analyze_market_trends():
    """API endpoint for market trends analysis"""
    try:
        logger.info("Received market trends analysis request")
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
            
            # Validate data structure
            if not isinstance(raw_data, list):
                raise ValueError("Expected list of companies in data")
                
            # Generate Gemini analysis
            analysis_report = generate_market_analysis(raw_data)
            
            # Process the data
            processed_data = {
                'market_size_growth': {
                    'total_market_value': [
                        f"Total Companies: {len(raw_data)}",
                        f"Average Size: {calculate_company_size(raw_data)}",
                        f"Market Stage: {determine_market_stage(raw_data)}"
                    ],
                    'market_segments': get_market_segments(raw_data),
                    'regional_distribution': get_regional_distribution(raw_data)
                },
                'competitive_landscape': {
                    'market_leaders': get_market_leaders(raw_data),
                    'industry_dynamics': get_industry_dynamics(raw_data)
                },
                'metrics': {
                    'market_share': calculate_market_share(raw_data)
                },
                'analysis_report': analysis_report
            }

            # Save analysis results
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f'market_analysis_{snapshot_id}_{timestamp}.json'
            with open(filename, 'w') as f:
                json.dump(processed_data, f, indent=2)
            
            logger.info(f"Analysis saved to {filename}")
            
            return jsonify({
                'success': True,
                'data': processed_data
            })

        except json.JSONDecodeError as e:
            logger.error(f"Error parsing JSON response: {str(e)}")
            return jsonify({'error': 'Invalid data format from Brightdata'}), 500

    except Exception as e:
        logger.error(f"Error processing request: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

def generate_market_analysis(data):
    """Generate detailed market analysis using Gemini"""
    try:
        if not data:
            return "No data available for analysis"

        # Prepare data summary for Gemini
        summary = {
            "total_companies": len(data),
            "industries": list(set(
                ind.get('value', '') 
                for company in data 
                for ind in company.get('industries', [])
                if isinstance(ind, dict)
            )),
            "regions": list(set(
                company.get('region', '') 
                for company in data 
                if company.get('region')
            )),
            "market_leaders": [
                company.get('name', 'Unknown') 
                for company in sorted(
                    data, 
                    key=lambda x: x.get('cb_rank', float('inf'))
                )[:5]
            ],
            "avg_company_size": calculate_company_size(data),
            "market_stage": determine_market_stage(data)
        }

        prompt = f"""
        Analyze this market data and create a comprehensive market analysis report.
        
        Market Summary:
        - Total Companies: {summary['total_companies']}
        - Top Industries: {', '.join(summary['industries'][:5]) if summary['industries'] else 'N/A'}
        - Regions: {', '.join(summary['regions']) if summary['regions'] else 'N/A'}
        - Market Leaders: {', '.join(summary['market_leaders']) if summary['market_leaders'] else 'N/A'}
        - Average Company Size: {summary['avg_company_size']}
        - Market Stage: {summary['market_stage']}
        
        Please provide a detailed analysis covering:
        1. Market Overview
        2. Industry Analysis
        3. Competitive Landscape
        4. Regional Distribution
        5. Growth Opportunities
        6. Key Trends
        7. Strategic Recommendations
        
        Format the analysis in a clear, structured way with sections and bullet points.
        """

        response = model.generate_content(prompt)
        return response.text

    except Exception as e:
        logger.error(f"Error generating Gemini analysis: {str(e)}")
        return "Error generating market analysis report"

# Helper functions
def calculate_company_size(data):
    sizes = []
    for company in data:
        if company.get('num_employees'):
            try:
                size = company['num_employees'].split('-')[0].replace('+', '')
                sizes.append(int(size))
            except:
                continue
    return f"{sum(sizes) // len(sizes) if sizes else 0} employees"

def determine_market_stage(data):
    founded_years = []
    current_year = datetime.now().year
    for company in data:
        if company.get('founded_date'):
            try:
                year = int(company['founded_date'][:4])
                founded_years.append(current_year - year)
            except:
                continue
    avg_age = sum(founded_years) / len(founded_years) if founded_years else 0
    return "Emerging Market" if avg_age < 5 else "Growth Market" if avg_age < 10 else "Mature Market"

def get_market_segments(data):
    segments = {}
    for company in data:
        for industry in company.get('industries', []):
            name = industry.get('value')
            if name:
                segments[name] = segments.get(name, 0) + 1
    return [f"{k}: {v}" for k, v in sorted(segments.items(), key=lambda x: x[1], reverse=True)[:5]]

def get_regional_distribution(data):
    regions = {}
    for company in data:
        region = company.get('region')
        if region:
            regions[region] = regions.get(region, 0) + 1
    return [f"{k}: {v}" for k, v in sorted(regions.items(), key=lambda x: x[1], reverse=True)]

def get_market_leaders(data):
    sorted_companies = sorted(data, key=lambda x: x.get('cb_rank', float('inf')))
    return [f"{company['name']}: {company.get('about', '')[:100]}..." 
            for company in sorted_companies[:5]]

def get_industry_dynamics(data):
    total = len(data)
    funded = len([c for c in data if c.get('funding_rounds')])
    public = len([c for c in data if c.get('ipo_status') == 'public'])
    return [
        f"Total Companies: {total}",
        f"Funded Companies: {funded}",
        f"Public Companies: {public}"
    ]

def calculate_market_share(data):
    total_visits = sum(c.get('monthly_visits', 0) for c in data)
    if total_visits == 0:
        return {}
    return {
        company['name']: (company.get('monthly_visits', 0) / total_visits * 100)
        for company in sorted(data, key=lambda x: x.get('monthly_visits', 0), reverse=True)[:5]
    }

def create_app():
    """Create and configure the Flask app"""
    app = Flask(__name__)
    CORS(app)
    app.register_blueprint(market_trends)
    return app

if __name__ == "__main__":
    logger.info("Starting Market Trends API server...")
    app = create_app()
    app.run(host='0.0.0.0', port=5002, debug=True)
