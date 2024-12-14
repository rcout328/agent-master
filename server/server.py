from market_analysis_api import app
import os

if __name__ == "__main__":
    # Get port from environment variable or use default
    port = int(os.environ.get('PORT', 5001))
    
    print(f"""
=== Market Analysis API Server ===
Server running on: http://localhost:{port}
Press Ctrl+C to stop the server
    """)
    
    # Run the Flask app
    app.run(
        host='0.0.0.0',
        port=port,
        debug=True
    ) 