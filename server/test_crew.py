from market_analysis_crew import get_report_generator

def test_market_analysis():
    # Create test inputs
    inputs = {
        "company_name": "Test Company",
        "industry": "Technology",
        "detail_level": "quick",
        "website_url": "https://example.com",
        "time_period": "2024"
    }
    
    # Get generator and run report
    generator = get_report_generator()
    result = generator.generate_report('market_analysis', inputs)
    
    print("=== Analysis Result ===")
    print(result)

if __name__ == "__main__":
    test_market_analysis() 