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
GOOGLE_API_KEY = "AIzaSyAE2SKBA38bOktQBdXS6mTK5Y1a-nKB3Mo"
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

AUTH_TOKEN = "55784713bbfc32152f470b5c6d053626c1cd49e124ea9d4aa461789632a0ee1b"

def get_competitor_analysis(snapshot_id, target_company):
    """Get competitor analysis for a specific company"""
    logger.info(f"Analyzing competitors for {target_company} using snapshot: {snapshot_id}")
    
    url = f"https://api.brightdata.com/datasets/v3/snapshot/{snapshot_id}?format=json"
    headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}

    try:
        response = requests.get(url, headers=headers)
        logger.info(f"API Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Find target company and competitors
            competitors = find_top_competitors(data, target_company)
            
            if competitors:
                # Generate analysis using Gemini
                analysis = analyze_competitors(target_company, competitors)
                
                # Save analysis
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f'competitor_analysis_{target_company}_{timestamp}.txt'
                
                with open(filename, 'w') as f:
                    f.write(analysis)
                
                logger.info(f"Analysis saved to {filename}")
                return analysis
            else:
                return "No competitors found"
                
        else:
            logger.error(f"API Error: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"Error in competitor analysis: {str(e)}")
        return None

def find_top_competitors(data, target_company):
    """Find top 4 competitors based on various metrics"""
    try:
        # Find target company data
        target = next((company for company in data if company.get('name', '').lower() == target_company.lower()), None)
        
        if not target:
            logger.error("Target company not found in dataset")
            return None
            
        # Get target company industries
        target_industries = set(ind.get('value', '') for ind in target.get('industries', []))
        
        # Score and rank competitors
        competitors = []
        for company in data:
            if company.get('name') == target_company:
                continue
                
            score = calculate_competitor_score(company, target, target_industries)
            if score > 0:
                competitors.append({
                    'company': company,
                    'score': score
                })
        
        # Sort by score and get top 4
        competitors.sort(key=lambda x: x['score'], reverse=True)
        return [comp['company'] for comp in competitors[:4]]
        
    except Exception as e:
        logger.error(f"Error finding competitors: {str(e)}")
        return None

def calculate_competitor_score(company, target, target_industries):
    """Calculate competitor relevance score"""
    score = 0
    
    # Industry overlap
    company_industries = set(ind.get('value', '') for ind in company.get('industries', []))
    industry_overlap = len(target_industries.intersection(company_industries))
    score += industry_overlap * 10
    
    # Size similarity
    if company.get('num_employees') == target.get('num_employees'):
        score += 5
    
    # Region match
    if company.get('region') == target.get('region'):
        score += 3
    
    # Technology overlap
    target_tech = set(tech.get('name', '') for tech in target.get('builtwith_tech', []))
    company_tech = set(tech.get('name', '') for tech in company.get('builtwith_tech', []))
    tech_overlap = len(target_tech.intersection(company_tech))
    score += tech_overlap * 2
    
    # Funding stage similarity
    if company.get('ipo_status') == target.get('ipo_status'):
        score += 3
    
    return score

def analyze_competitors(target_company, competitors):
    """Generate detailed competitor analysis using Gemini"""
    try:
        competitor_data = []
        for comp in competitors:
            data = {
                'name': comp.get('name', ''),
                'about': comp.get('about', ''),
                'industries': [ind.get('value') for ind in comp.get('industries', [])],
                'employees': comp.get('num_employees', 'Unknown'),
                'founded': comp.get('founded_date', 'Unknown'),
                'region': comp.get('region', 'Unknown'),
                'tech_count': comp.get('active_tech_count', 0),
                'monthly_visits': comp.get('monthly_visits', 0),
                'funding_rounds': len(comp.get('funding_rounds_list', [])),
                'products': comp.get('total_active_products', 0)
            }
            competitor_data.append(data)
        
        prompt = f"""
        Create a detailed competitor analysis report for {target_company} comparing it with these competitors:
        
        Competitor Data:
        {json.dumps(competitor_data, indent=2)}
        
        Please provide a comprehensive analysis including:
        1. Competitive Positioning
        2. Strengths and Weaknesses of each competitor
        3. Market Share Analysis
        4. Technology Stack Comparison
        5. Growth Metrics
        6. Key Differentiators
        7. Strategic Recommendations
        
        Format the analysis with clear sections and bullet points.
        """
        
        response = model.generate_content(prompt)
        analysis = response.text
        
        final_report = f"""
        COMPETITOR ANALYSIS REPORT
        Target Company: {target_company}
        Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
        
        {analysis}
        
        Note: This analysis was generated using AI and should be reviewed by domain experts.
        """
        
        return final_report
        
    except Exception as e:
        logger.error(f"Error in Gemini analysis: {str(e)}")
        return "Error generating competitor analysis"

if __name__ == "__main__":
    snapshot_id = input("Enter snapshot ID: ").strip()
    target_company = input("Enter target company name: ").strip()
    
    analysis = get_competitor_analysis(snapshot_id, target_company)
    
    if analysis:
        print("\nCompetitor analysis completed successfully!")
        print("Check the output file for detailed report.")
    else:
        print("Failed to generate competitor analysis")