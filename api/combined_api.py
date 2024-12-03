from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import os
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor

# Initialize Flask app
app = Flask(__name__)
CORS(app)

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

@app.route('/api/competitor-analysis', methods=['POST', 'OPTIONS'])
def analyze_competitors():
    """Endpoint for competitor analysis"""
    if request.method == 'OPTIONS':
        return '', 204
        
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
        return '', 204
        
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
        return '', 204
        
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
        return '', 204
        
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
        return '', 204
        
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
        return '', 204
        
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'No query provided'}), 400

        # Run gap analysis in a separate thread
        future = executor.submit(get_gap_data, query)
        gap_info = future.result(timeout=60)

        # Save the gap analysis output to a text file
        with open(os.path.join(output_dir, 'compitoone.txt'), 'a') as f:
            f.write(str(gap_info))

        return jsonify(gap_info)

    except Exception as e:
        logging.error(f"Error during gap analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/impact-assessment', methods=['POST', 'OPTIONS'])
def analyze_impact():
    """Endpoint for impact assessment"""
    if request.method == 'OPTIONS':
        return '', 204
        
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
        return '', 204
        
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
        return '', 204
        
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

if __name__ == '__main__':
    try:
        # Start the Flask app
        app.run(port=5000, debug=True)
    finally:
        # Clean up resources
        executor.shutdown(wait=True) 