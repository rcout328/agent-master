import os
import warnings
import logging
from market_analysis_crew import get_market_analysis_crew

# Disable all warnings and telemetry
warnings.filterwarnings('ignore')
os.environ["ANONYMIZED_TELEMETRY"] = "False"
os.environ["OPENTELEMETRY_ENABLED"] = "False"
os.environ["DISABLE_TELEMETRY"] = "True"

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def run_analysis(company_name=None):
    crew = get_market_analysis_crew(company_name)
    result = crew.kickoff()
    return result

if __name__ == "__main__":
    run_analysis() 