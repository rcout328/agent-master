import requests
import json
import logging
import google.generativeai as genai
from datetime import datetime

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Gemini
GOOGLE_API_KEY = "AIzaSyAE2SKBA38bOktQBdXS6mTK5Y1a-nKB3Mo"  # Your Gemini API key
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

AUTH_TOKEN = "55784713bbfc32152f470b5c6d053626c1cd49e124ea9d4aa461789632a0ee1b"

def get_market_data(snapshot_id):
    """Get market data from Brightdata snapshot and analyze with Gemini"""
    logger.info(f"Fetching market data for snapshot: {snapshot_id}")
    
    url = f"https://api.brightdata.com/datasets/v3/snapshot/{snapshot_id}?format=json"
    headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}

    try:
        # Get data from Brightdata
        response = requests.get(url, headers=headers)
        logger.info(f"API Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Save raw data
            with open(f'raw_data_{snapshot_id}.json', 'w') as f:
                json.dump(data, f, indent=2)
            
            # Process with Gemini
            analysis = analyze_with_gemini(data)
            
            # Save analysis to text file
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            with open(f'market_analysis_{snapshot_id}_{timestamp}.txt', 'w') as f:
                f.write(analysis)
            
            # Save detailed extracted data to a separate text file
            detailed_data = extract_detailed_data(data)
            with open(f'detailed_data_{snapshot_id}_{timestamp}.txt', 'w') as f:
                f.write(detailed_data)
            
            logger.info("Analysis and detailed data saved")
            return analysis
            
        else:
            logger.error(f"API Error: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"Error fetching data: {str(e)}")
        return None

def analyze_with_gemini(data):
    """Analyze market data using Gemini AI"""
    try:
        # Extract key information for analysis
        companies = data if isinstance(data, list) else []
        
        # Prepare data summary for Gemini
        summary = {
            "total_companies": len(companies),
            "industries": extract_unique_industries(companies),
            "regions": extract_unique_regions(companies),
            "company_sizes": extract_company_sizes(companies),
            "top_companies": extract_top_companies(companies),
            "technologies": extract_technologies(companies)
        }
        
        # Create prompt for Gemini
        prompt = f"""
        Analyze this market data and create a comprehensive market analysis report.
        
        Data Summary:
        - Total Companies: {summary['total_companies']}
        - Industries: {', '.join(summary['industries'][:5])}
        - Regions: {', '.join(summary['regions'][:5])}
        - Company Sizes: {summary['company_sizes']}
        - Top Companies: {', '.join(summary['top_companies'])}
        - Key Technologies: {', '.join(summary['technologies'][:5])}
        
        Please provide a detailed analysis covering:
        1. Market Overview
        2. Competitive Landscape
        3. Industry Trends
        4. Regional Distribution
        5. Technology Adoption
        6. Growth Opportunities
        7. Key Recommendations
        
        Format the analysis in a clear, structured way with headers and bullet points.
        """
        
        # Get analysis from Gemini
        response = model.generate_content(prompt)
        analysis = response.text
        
        # Add metadata
        final_report = f"""
        MARKET ANALYSIS REPORT
        Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
        Data Source: Brightdata
        Companies Analyzed: {len(companies)}
        
        {analysis}
        
        Note: This analysis was generated using AI and should be reviewed by domain experts.
        """
        
        return final_report
        
    except Exception as e:
        logger.error(f"Error in Gemini analysis: {str(e)}")
        return "Error generating analysis"

def extract_detailed_data(data):
    """Extract detailed information from the snapshot data"""
    details = []
    for company in data:
        name = company.get('name', 'Unknown')
        cb_rank = company.get('cb_rank', 'Unknown')
        region = company.get('region', 'Unknown')
        industries = ', '.join(industry.get('value', 'Unknown') for industry in company.get('industries', []))
        num_employees = company.get('num_employees', 'Unknown')
        technologies = ', '.join(tech.get('name', 'Unknown') for tech in company.get('builtwith_tech', []))
        
        details.append(f"Company: {name}\nCB Rank: {cb_rank}\nRegion: {region}\nIndustries: {industries}\nNumber of Employees: {num_employees}\nTechnologies: {technologies}\n")
    
    return "\n".join(details)

def extract_unique_industries(companies):
    """Extract unique industries from companies"""
    industries = set()
    for company in companies:
        for industry in company.get('industries', []):
            industries.add(industry.get('value', ''))
    return list(industries)

def extract_unique_regions(companies):
    """Extract unique regions from companies"""
    return list(set(company.get('region', '') for company in companies if company.get('region')))

def extract_company_sizes(companies):
    """Extract company size distribution"""
    sizes = {}
    for company in companies:
        size = company.get('num_employees', 'Unknown')
        sizes[size] = sizes.get(size, 0) + 1
    return sizes

def extract_top_companies(companies):
    """Extract top companies by rank"""
    sorted_companies = sorted(companies, key=lambda x: x.get('cb_rank', float('inf')))
    return [company.get('name', '') for company in sorted_companies[:5]]

def extract_technologies(companies):
    """Extract technologies used by companies"""
    technologies = set()
    for company in companies:
        for tech in company.get('builtwith_tech', []):
            technologies.add(tech.get('name', ''))
    return list(technologies)

if __name__ == "__main__":
    # Get snapshot ID from user
    snapshot_id = input("Enter snapshot ID: ").strip()
    
    # Get and analyze data
    analysis = get_market_data(snapshot_id)
    
    if analysis:
        print("\nAnalysis completed successfully!")
        print("Check the output files for detailed report.")
    else:
        print("Failed to generate analysis")