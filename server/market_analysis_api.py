import sys
import os

print("Python Path:", sys.executable)
print("Current Directory:", os.getcwd())
print("PYTHONPATH:", os.environ.get('PYTHONPATH'))

from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from pathlib import Path
from market_analysis_crew import get_market_analysis_crew, create_reports
import time

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Create logs directory if it doesn't exist
LOGS_DIR = Path(__file__).parent / 'logs'
LOGS_DIR.mkdir(exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOGS_DIR / f'market_analysis_{time.strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@app.route('/api/market-analysis', methods=['POST', 'OPTIONS'])
def analyze_market():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.json
        if not data or not data.get('company_name'):
            return jsonify({
                'status': 'error',
                'message': 'Company name is required'
            }), 400

        user_inputs = {
            "company_name": data.get('company_name'),
            "industry": data.get('industry', ''),
            "focus_areas": data.get('focus_areas', []),
            "time_period": data.get('time_period', 'current')
        }

        logger.info(f"Starting market analysis for {user_inputs['company_name']}")
        
        # Get the crew and start analysis
        crew = get_market_analysis_crew(user_inputs)
        result = crew.kickoff()
        
        # Generate reports
        validation_file, analysis_file = create_reports(result, user_inputs)
        
        try:
            # Read the reports
            with open(validation_file, 'r') as f:
                validation_report = f.read()
            
            with open(analysis_file, 'r') as f:
                analysis_report = f.read()
                
            return jsonify({
                'status': 'success',
                'validation_report': validation_report,
                'analysis_report': analysis_report,
                'summary': {
                    'company': user_inputs['company_name'],
                    'industry': user_inputs['industry'],
                    'focus_areas': user_inputs['focus_areas'],
                    'time_period': user_inputs['time_period']
                }
            })
        except FileNotFoundError as e:
            logger.error(f"Report file not found: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': 'Error reading report files'
            }), 500

    except Exception as e:
        logger.error(f"Error in market analysis: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True) 