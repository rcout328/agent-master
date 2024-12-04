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
        target_company = data.get('target_company')
        
        if not snapshot_id or not target_company:
            logger.warning("Missing required parameters")
            return jsonify({'error': 'Snapshot ID and target company required'}), 400

        logger.info(f"Analyzing competitors for {target_company} using snapshot: {snapshot_id}")
        
        # Get data from Brightdata
        url = f"https://api.brightdata.com/datasets/v3/snapshot/{snapshot_id}?format=json"
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        
        logger.info("Fetching data from Brightdata API")
        response = requests.get(url, headers=headers)
        
        if not response.ok:
            logger.error(f"Brightdata API error: {response.status_code} - {response.text}")
            return jsonify({'error': 'Failed to fetch data'}), response.status_code
            
        try:
            raw_data = response.json()
            if isinstance(raw_data, str):
                raw_data = json.loads(raw_data)
            if 'results' in raw_data:
                raw_data = raw_data['results']
            
            logger.info(f"Successfully retrieved {len(raw_data)} records")
            
            if not isinstance(raw_data, list):
                raise ValueError("Expected list of companies in data")
            
            # Find target company and competitors
            target_data = next((company for company in raw_data 
                              if company.get('name', '').lower() == target_company.lower()), None)
            
            if not target_data:
                return jsonify({'error': 'Target company not found in dataset'}), 404
            
            # Find top competitors
            competitors = find_competitors(raw_data, target_data)
            
            # Generate analysis
            analysis_report = generate_competitor_analysis(target_data, competitors)
            
            processed_data = {
                'target_company': {
                    'name': target_data.get('name'),
                    'about': target_data.get('about'),
                    'metrics': extract_company_metrics(target_data)
                },
                'main_competitors': [
                    {
                        'name': comp.get('name'),
                        'about': comp.get('about'),
                        'metrics': extract_company_metrics(comp)
                    } for comp in competitors[:4]
                ],
                'competitive_analysis': {
                    'strengths': extract_strengths(target_data, competitors),
                    'weaknesses': extract_weaknesses(target_data, competitors),
                    'opportunities': extract_opportunities(target_data, competitors),
                    'threats': extract_threats(target_data, competitors)
                },
                'analysis_report': analysis_report
            }

            # Save analysis
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f'competitor_analysis_{target_company}_{timestamp}.json'
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

def find_competitors(data, target):
    """Find relevant competitors based on various metrics"""
    competitors = []
    target_industries = set(ind.get('value', '') for ind in target.get('industries', []))
    
    for company in data:
        if company.get('name') == target.get('name'):
            continue
            
        score = calculate_similarity_score(company, target, target_industries)
        if score > 0:
            competitors.append({
                'company': company,
                'score': score
            })
    
    sorted_competitors = sorted(competitors, key=lambda x: x['score'], reverse=True)
    return [comp['company'] for comp in sorted_competitors[:4]]

def calculate_similarity_score(company, target, target_industries):
    """Calculate similarity score between companies"""
    score = 0
    
    # Industry overlap
    company_industries = set(ind.get('value', '') for ind in company.get('industries', []))
    industry_overlap = len(target_industries.intersection(company_industries))
    score += industry_overlap * 10
    
    # Size similarity
    if company.get('num_employees') == target.get('num_employees'):
        score += 5
    
    # Region match
    if company.get('region') == target.get('region'):
        score += 3
    
    # Technology overlap
    target_tech = set(tech.get('name', '') for tech in target.get('builtwith_tech', []))
    company_tech = set(tech.get('name', '') for tech in company.get('builtwith_tech', []))
    tech_overlap = len(target_tech.intersection(company_tech))
    score += tech_overlap * 2
    
    return score

def generate_competitor_analysis(target, competitors):
    """Generate detailed competitor analysis using Gemini"""
    try:
        summary = {
            'target': {
                'name': target.get('name'),
                'industry': [ind.get('value') for ind in target.get('industries', [])],
                'size': target.get('num_employees'),
                'region': target.get('region'),
                'tech_count': len(target.get('builtwith_tech', [])),
                'funding': len(target.get('funding_rounds', []))
            },
            'competitors': [{
                'name': comp.get('name'),
                'industry': [ind.get('value') for ind in comp.get('industries', [])],
                'size': comp.get('num_employees'),
                'region': comp.get('region'),
                'tech_count': len(comp.get('builtwith_tech', [])),
                'funding': len(comp.get('funding_rounds', []))
            } for comp in competitors]
        }

        prompt = f"""
        Create a detailed competitor analysis report for {summary['target']['name']}.
        
        Target Company:
        - Industries: {', '.join(summary['target']['industry'])}
        - Size: {summary['target']['size']}
        - Region: {summary['target']['region']}
        - Technology Stack: {summary['target']['tech_count']} technologies
        - Funding Rounds: {summary['target']['funding']}
        
        Top Competitors:
        {json.dumps(summary['competitors'], indent=2)}
        
        Please provide a comprehensive analysis covering:
        1. Competitive Position
        2. Key Strengths & Weaknesses
        3. Market Share Analysis
        4. Technology Comparison
        5. Growth Metrics
        6. Key Differentiators
        7. Strategic Recommendations
        
        Format the analysis in a clear, structured way with sections and bullet points.
        """

        response = model.generate_content(prompt)
        return response.text

    except Exception as e:
        logger.error(f"Error generating competitor analysis: {str(e)}")
        return "Error generating competitor analysis report"

def extract_company_metrics(company):
    """Extract key metrics for a company"""
    return {
        'employees': company.get('num_employees', 'Unknown'),
        'founded': company.get('founded_date', 'Unknown'),
        'region': company.get('region', 'Unknown'),
        'tech_count': len(company.get('builtwith_tech', [])),
        'monthly_visits': company.get('monthly_visits', 0),
        'funding_rounds': len(company.get('funding_rounds', [])),
        'industries': [ind.get('value') for ind in company.get('industries', [])]
    }

def extract_strengths(target, competitors):
    """Extract company strengths"""
    strengths = []
    if int(target.get('monthly_visits', 0)) > sum(int(c.get('monthly_visits', 0)) for c in competitors) / len(competitors):
        strengths.append("Higher website traffic than competitors")
    if len(target.get('builtwith_tech', [])) > sum(len(c.get('builtwith_tech', [])) for c in competitors) / len(competitors):
        strengths.append("Strong technology adoption")
    if len(target.get('funding_rounds', [])) > sum(len(c.get('funding_rounds', [])) for c in competitors) / len(competitors):
        strengths.append("Well-funded")
    return strengths

def extract_weaknesses(target, competitors):
    """Extract company weaknesses"""
    weaknesses = []
    if int(target.get('monthly_visits', 0)) < sum(int(c.get('monthly_visits', 0)) for c in competitors) / len(competitors):
        weaknesses.append("Lower website traffic than competitors")
    if len(target.get('builtwith_tech', [])) < sum(len(c.get('builtwith_tech', [])) for c in competitors) / len(competitors):
        weaknesses.append("Lower technology adoption")
    if len(target.get('funding_rounds', [])) < sum(len(c.get('funding_rounds', [])) for c in competitors) / len(competitors):
        weaknesses.append("Less funded than competitors")
    return weaknesses

def extract_opportunities(target, competitors):
    """Extract market opportunities"""
    opportunities = []
    competitor_regions = set(c.get('region') for c in competitors)
    target_region = target.get('region')
    if target_region and len(competitor_regions - {target_region}) > 0:
        opportunities.append("Geographic expansion potential")
    
    competitor_industries = set(ind.get('value') for c in competitors for ind in c.get('industries', []))
    target_industries = set(ind.get('value') for ind in target.get('industries', []))
    if len(competitor_industries - target_industries) > 0:
        opportunities.append("Industry diversification potential")
    return opportunities

def extract_threats(target, competitors):
    """Extract market threats"""
    threats = []
    if any(len(c.get('funding_rounds', [])) > len(target.get('funding_rounds', [])) * 2 for c in competitors):
        threats.append("Well-funded competitors")
    if any(int(c.get('monthly_visits', 0)) > int(target.get('monthly_visits', 0)) * 2 for c in competitors):
        threats.append("Competitors with higher market reach")
    return threats

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