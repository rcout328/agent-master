import requests
import json

def test_sentiment_analysis():
    """Test the sentiment analysis endpoint"""
    test_companies = [
        "Amazon",
        "Netflix",
        "Tesla",
        "Microsoft",
        "Apple"
    ]
    
    url = "http://localhost:5000/api/competitor-sentiment"
    
    for company in test_companies:
        print(f"\nTesting sentiment analysis for: {company}")
        try:
            response = requests.post(
                url,
                json={"query": company},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                print("\nCompetitors:")
                for comp in data['competitors']:
                    print(f"- {comp['name']}")
                
                print("\nSentiment Analysis:")
                for sentiment in data['sentiment_analysis']:
                    print(f"\nCompany: {sentiment['company']}")
                    print(f"Sentiment: {sentiment['overall_sentiment']}")
                    print(f"Score: {sentiment['sentiment_score']}")
                    print("Key Themes:", sentiment['key_themes'])
                    
            else:
                print(f"Error: {response.status_code}")
                print(response.text)
                
        except Exception as e:
            print(f"Error testing {company}: {str(e)}")
            
        print("-" * 50)

if __name__ == "__main__":
    test_sentiment_analysis() 