from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import logging
import os
from pathlib import Path
from market_analysis_crew import get_report_generator, create_reports
import time

app = Flask(__name__)

# CORS configuration
CORS(app, resources={
    r"/api/*": {
        "origins": "http://localhost:3000",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"],
        "max_age": 3600
    }
})

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/api/report-content/<filename>', methods=['GET', 'OPTIONS'])
def get_report_content(filename):
    """Get content of a specific report"""
    if request.method == 'OPTIONS':
        response = make_response()
        return response

    try:
        # Security check to prevent directory traversal
        if '..' in filename or filename.startswith('/'):
            return jsonify({
                'status': 'error',
                'message': 'Invalid filename'
            }), 400
            
        # Look for the file in both the current directory and reports directory
        file_path = os.path.join(os.getcwd(), filename)
        reports_dir = os.path.join(os.getcwd(), 'reports')
        
        if os.path.exists(file_path):
            target_path = file_path
        elif os.path.exists(os.path.join(reports_dir, filename)):
            target_path = os.path.join(reports_dir, filename)
        else:
            return jsonify({
                'status': 'error',
                'message': 'Report not found'
            }), 404
            
        with open(target_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        response = jsonify({
            'status': 'success',
            'content': content,
            'filename': filename
        })
        
        # Add CORS headers
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response
        
    except Exception as e:
        logger.error(f"Error reading report content: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/reports', methods=['GET', 'OPTIONS'])
def get_reports():
    """Get all generated reports"""
    if request.method == 'OPTIONS':
        response = make_response()
        return response

    try:
        # Get all report files from the directory
        report_files = []
        current_dir = os.getcwd()
        
        # Function to process files in a directory
        def process_directory(directory):
            for file in os.listdir(directory):
                if file.endswith('_report.md'):
                    # Parse filename to get metadata
                    parts = file.replace('_report.md', '').split('_')
                    company_name = parts[0]
                    report_type = '_'.join(parts[1:-2]) if len(parts) > 3 else parts[1]
                    timestamp = '_'.join(parts[-2:])
                    
                    report_files.append({
                        'company_name': company_name,
                        'report_type': report_type,
                        'timestamp': timestamp,
                        'filename': file
                    })
        
        # Check both current directory and reports directory
        process_directory(current_dir)
        reports_dir = os.path.join(current_dir, 'reports')
        if os.path.exists(reports_dir):
            process_directory(reports_dir)
        
        response = jsonify({
            'status': 'success',
            'reports': sorted(report_files, key=lambda x: x['timestamp'], reverse=True)
        })
        
        # Add CORS headers
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response
        
    except Exception as e:
        logger.error(f"Error fetching reports: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/generate-report', methods=['POST', 'OPTIONS'])
def generate_report():
    """New endpoint for generating any type of report"""
    if request.method == 'OPTIONS':
        response = make_response()
        return response

    try:
        data = request.json
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided'
            }), 400

        report_type = data.get('report_type')
        inputs = data.get('inputs', {})

        # Validate inputs
        if not report_type:
            return jsonify({
                'status': 'error',
                'message': 'Report type is required'
            }), 400

        if not inputs.get('company_name'):
            return jsonify({
                'status': 'error',
                'message': 'Company name is required'
            }), 400

        logger.info(f"Starting {report_type} for {inputs['company_name']}")
        
        # Generate report
        generator = get_report_generator()
        result = generator.generate_report(report_type, inputs)
        
        # Create report files
        validation_file, report_file = create_reports(result, inputs, report_type)
        
        try:
            with open(validation_file, 'r') as f:
                validation_report = f.read()
            
            with open(report_file, 'r') as f:
                analysis_report = f.read()
            
            return jsonify({
                'status': 'success',
                'validation_report': validation_report,
                'analysis_report': analysis_report,
                'summary': {
                    'company': inputs['company_name'],
                    'report_type': report_type,
                    'industry': inputs.get('industry', ''),
                    'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
                }
            })
        except FileNotFoundError as e:
            logger.error(f"Report file not found: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': 'Error reading report files'
            }), 500

    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/market-analysis', methods=['POST', 'OPTIONS'])
def analyze_market():
    """Legacy endpoint for market analysis"""
    if request.method == 'OPTIONS':
        response = make_response()
        return response

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
        generator = get_report_generator()
        result = generator.generate_report('market_analysis', user_inputs)
        
        # Generate reports
        validation_file, report_file = create_reports(result, user_inputs, 'market_analysis')
        
        try:
            # Read the reports
            with open(validation_file, 'r') as f:
                validation_report = f.read()
            
            with open(report_file, 'r') as f:
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
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)