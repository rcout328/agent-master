from flask import Flask, request, jsonify
from flask_cors import CORS
from main import get_questions_by_report_type
from market_analysis_crew import ReportGenerator, create_reports
import logging
import time
import os
import json

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize report generator
generator = ReportGenerator()

@app.route('/api/detail-levels', methods=['GET'])
def get_detail_levels():
    """Get available detail levels and their descriptions"""
    return jsonify({
        'status': 'success',
        'data': {
            'quick': {
                'name': 'Quick Analysis',
                'duration': '15-20 minutes',
                'features': [
                    '2-3 focused questions',
                    'Core metrics analysis',
                    'Key recommendations'
                ]
            },
            'detailed': {
                'name': 'Detailed Analysis',
                'duration': '45-60 minutes',
                'features': [
                    '4-5 comprehensive questions',
                    'In-depth market research',
                    'Detailed strategic insights'
                ]
            }
        }
    })

@app.route('/api/report-types', methods=['GET'])
def get_report_types():
    """Get available report types and their descriptions"""
    return jsonify({
        'status': 'success',
        'data': {
            'market_analysis': 'Overall market position and trends',
            'competitor_analysis': 'Detailed competitive landscape',
            'icp_report': 'Ideal Customer Profile analysis',
            'gap_analysis': 'Market opportunities and gaps',
            'market_assessment': 'Industry potential',
            'impact_assessment': 'Business impact analysis'
        }
    })

@app.route('/api/analyze-website', methods=['POST'])
def analyze_website():
    """Analyze company website"""
    try:
        data = request.json
        if not data:
            return jsonify({'status': 'error', 'message': 'No data provided'}), 400

        website_url = data.get('website_url')
        company_name = data.get('company_name')

        if not website_url or not company_name:
            return jsonify({'status': 'error', 'message': 'Website URL and company name are required'}), 400

        # Scrape and analyze website
        website_data = generator.scrape_company_website(website_url)
        if website_data:
            analysis = generator.analyze_website_content(website_data, company_name)
            return jsonify({
                'status': 'success',
                'data': {
                    'analysis': analysis,
                    'website_data': website_data
                }
            })
        else:
            return jsonify({'status': 'error', 'message': 'Failed to scrape website'}), 400

    except Exception as e:
        logger.error(f"Website analysis error: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/generate-questions', methods=['POST'])
def generate_questions():
    """Generate analysis questions"""
    try:
        data = request.json
        if not data:
            return jsonify({'status': 'error', 'message': 'No data provided'}), 400

        required_fields = ['report_type', 'detail_level', 'company_name', 'industry']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return jsonify({
                'status': 'error', 
                'message': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400

        questions = get_questions_by_report_type(
            report_type=data['report_type'],
            detail_level=data['detail_level'],
            company_name=data['company_name'],
            industry=data['industry'],
            website_data=data.get('website_data')
        )

        return jsonify({
            'status': 'success',
            'data': {'questions': questions}
        })

    except Exception as e:
        logger.error(f"Question generation error: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/generate-report', methods=['POST'])
def generate_report():
    """Generate final report"""
    try:
        data = request.json
        if not data:
            return jsonify({'status': 'error', 'message': 'No data provided'}), 400

        # Validate required data
        required_fields = ['company_info', 'report_type', 'detail_level', 'answers']
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            return jsonify({
                'status': 'error',
                'message': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400

        # Generate report
        result = generator.generate_report(data['report_type'], data)
        
        # Create report files
        validation_file, report_file = create_reports(result, data, data['report_type'])

        # Read report content
        with open(report_file, 'r') as f:
            report_content = f.read()

        return jsonify({
            'status': 'success',
            'data': {
                'report_content': report_content,
                'report_file': report_file,
                'validation_file': validation_file
            }
        })

    except Exception as e:
        logger.error(f"Report generation error: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """API health check endpoint"""
    return jsonify({
        'status': 'success',
        'message': 'Market Analysis API is running',
        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)