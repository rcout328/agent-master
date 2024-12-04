from flask import Flask
from flask_cors import CORS
from market_trends_api import market_trends
from keyword_api import keyword_analysis

# Initialize Flask app
app = Flask(__name__)

# Configure CORS
CORS(app, 
    resources={
        r"/api/*": {
            "origins": ["http://localhost:3002"],
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Accept"],
            "expose_headers": ["Content-Type"],
            "allow_credentials": True,
            "max_age": 120
        }
    }
)

# Register blueprints
app.register_blueprint(market_trends)
app.register_blueprint(keyword_analysis)

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5002, debug=True)