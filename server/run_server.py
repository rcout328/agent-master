import os
from market_analysis_api import app

if __name__ == '__main__':
    # Get port from environment variable or use default
    port = int(os.environ.get('PORT', 5001))
    
    print("\n=== Market Analysis API Server ===")
    print(f"Server running on: http://localhost:{port}")
    print("Press Ctrl+C to stop the server")
    
    # Run the server
    app.run(
        host='0.0.0.0',
        port=port,
        debug=True
    ) 