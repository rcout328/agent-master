from flask import Flask
from flask_cors import CORS
from market_trends_api import market_trends

app = Flask(__name__)
CORS(app)

app.register_blueprint(market_trends)

if __name__ == '__main__':
    app.run(debug=True)