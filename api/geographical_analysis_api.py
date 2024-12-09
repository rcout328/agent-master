import logging
from datetime import datetime
import json
import os
import google.generativeai as genai

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Gemini
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY', '')
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
    logging.info("Gemini initialized")
else:
    logging.warning("No Gemini API key found")


def analyze_geographical_data(snapshot_data):
    """Analyze geographical distribution and trends from snapshot data"""
    try:
        logger.info("Starting geographical analysis")

        # Prepare the prompt for Gemini
        analysis_prompt = f"""
        Analyze this market data for geographical insights:
        {json.dumps(snapshot_data, indent=2)}

        Create a detailed geographical analysis with these components:

        1. Regional Distribution:
        - Analyze company distribution across regions
        - Calculate percentages and company counts
        - Identify major business hubs

        2. Industry Clusters:
        - Identify dominant industries by region
        - Find regional specializations
        - Note emerging industry trends

        3. Growth Trends:
        - Calculate regional growth rates
        - Identify high-growth areas
        - Provide insights on market dynamics

        Return the analysis in this JSON format:
        {{
            "regional_distribution": [
                {{
                    "name": "Region name",
                    "company_count": number,
                    "percentage": number,
                    "major_hubs": ["city1", "city2"]
                }}
            ],
            "industry_clusters": [
                {{
                    "region": "Region name",
                    "industries": ["industry1", "industry2"],
                    "specializations": ["spec1", "spec2"],
                    "emerging_trends": ["trend1", "trend2"]
                }}
            ],
            "growth_trends": [
                {{
                    "region": "Region name",
                    "growth_rate": number,
                    "insight": "Growth insight description",
                    "key_drivers": ["driver1", "driver2"]
                }}
            ],
            "market_opportunities": [
                {{
                    "region": "Region name",
                    "opportunity": "Description",
                    "potential_impact": "High/Medium/Low",
                    "timeframe": "Short/Medium/Long term"
                }}
            ]
        }}
        """

        # Get analysis from Gemini
        response = model.generate_content(analysis_prompt)
        if not response or not response.text:
            raise Exception("Empty response from Gemini")

        # Parse response
        analysis_text = response.text.strip()
        if '```json' in analysis_text:
            analysis_text = analysis_text.split('```json')[1].split('```')[0]
            
        analysis = json.loads(analysis_text)

        # Save analysis to file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'geographical_analysis_{timestamp}.json'
        
        with open(os.path.join('gemini_outputs', filename), 'w') as f:
            json.dump({
                'timestamp': timestamp,
                'snapshot_data': snapshot_data,
                'analysis': analysis
            }, f, indent=2)

        return analysis

    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        return generate_fallback_response()

def generate_fallback_response():
    """Generate basic response when analysis fails"""
    return {
        "regional_distribution": [
            {
                "name": "North America",
                "company_count": 0,
                "percentage": 0,
                "major_hubs": ["Data unavailable"]
            }
        ],
        "industry_clusters": [
            {
                "region": "Global",
                "industries": ["Analysis unavailable"],
                "specializations": ["Analysis unavailable"],
                "emerging_trends": ["Analysis unavailable"]
            }
        ],
        "growth_trends": [
            {
                "region": "Global",
                "growth_rate": 0,
                "insight": "Analysis unavailable",
                "key_drivers": ["Analysis unavailable"]
            }
        ],
        "market_opportunities": [
            {
                "region": "Global",
                "opportunity": "Analysis unavailable",
                "potential_impact": "Unknown",
                "timeframe": "Unknown"
            }
        ]
    } 