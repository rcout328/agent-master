from flask import Blueprint, request, jsonify
import google.generativeai as genai
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create Blueprint
keyword_analysis = Blueprint('keyword_analysis', __name__)

# Initialize Gemini
GOOGLE_API_KEY = "AIzaSyAE2SKBA38bOktQBdXS6mTK5Y1a-nKB3Mo"
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

@keyword_analysis.route('/api/analyze-keywords', methods=['POST'])
def analyze_keywords():
    """API endpoint for keyword analysis"""
    try:
        logger.info("Received keyword analysis request")
        data = request.json
        description = data.get('description')
        
        if not description:
            logger.warning("No description provided")
            return jsonify({'error': 'No description provided'}), 400

        prompt = f"""
        Task: Convert the user's startup description into a list of relevant keywords.

        Example 1:
        User Input: "An AI-powered e-commerce platform for personalized clothing recommendations."
        Keywords: ["AI", "e-commerce", "personalized clothing", "fashion", "recommendation system", "online shopping"]

        Example 2:
        User Input: "A blockchain-based FinTech company revolutionizing cross-border payments."
        Keywords: ["blockchain", "FinTech", "cross-border payments", "digital currency", "financial technology"]

        Now your task:
        Convert the following startup description into relevant keywords:

        User Input: {description}
        Keywords:
        """

        response = model.generate_content(prompt)
        
        # Extract keywords from response
        keywords_text = response.text.strip()
        try:
            keywords_list = eval(keywords_text) if '[' in keywords_text else keywords_text.split(', ')
        except:
            keywords_list = keywords_text.replace('[', '').replace(']', '').split(', ')
        
        logger.info(f"Generated keywords for: {description[:50]}...")
        logger.info(f"Keywords: {keywords_list}")

        return jsonify({
            'success': True,
            'data': {
                'keywords': keywords_list
            }
        })

    except Exception as e:
        logger.error(f"Error analyzing keywords: {str(e)}")
        return jsonify({'error': str(e)}), 500 