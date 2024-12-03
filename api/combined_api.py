from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime
import os
from dotenv import load_dotenv
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Logging configuration
logging.basicConfig(level=logging.DEBUG)

# Create thread pool for parallel execution
executor = ThreadPoolExecutor(max_workers=10)

# Import the analysis functions
from market_trends_api import get_trends_data
from competitor_api import get_competitor_data, create_empty_response
from icp_api import analyze_icp  # Import the new function

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

if __name__ == '__main__':
    try:
        # Start the Flask app
        app.run(port=5000, debug=True)
    finally:
        # Clean up resources
        executor.shutdown(wait=True) 