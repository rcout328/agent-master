import os
import google.generativeai as genai
import logging

# Setup logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# API Keys
FIRECRAWL_API_KEY = "fc-5fadfeae30314d4ea8a3d9afaa75c493"
GOOGLE_API_KEY = "AIzaSyAE2SKBA38bOktQBdXS6mTK5Y1a-nKB3Mo"

# Initialize Gemini
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

# Output directory
output_dir = 'gemini_outputs'
os.makedirs(output_dir, exist_ok=True) 