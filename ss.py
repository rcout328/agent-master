# test_app.py
import unittest
import json
from api.app import app  # Adjust the import based on your project structure

class MarketAnalysisTestCase(unittest.TestCase):
    def setUp(self):
        # Set up the Flask test client
        self.app = app.test_client()
        self.app.testing = True

    def test_analyze_market_success(self):
        # Test a successful market analysis request
        response = self.app.post('/api/market-analysis', 
                                  data=json.dumps({'query': 'scam'}),
                                  content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('market_size', data)
        self.assertIn('growth_rate', data)
        self.assertIn('competitors', data)
        self.assertIn('trends', data)
        self.assertIn('key_findings', data)

    def test_analyze_market_no_query(self):
        # Test the case where no query is provided
        response = self.app.post('/api/market-analysis', 
                                  data=json.dumps({}),
                                  content_type='application/json')
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertEqual(data['error'], 'No query provided')

    def test_analyze_market_invalid_query(self):
        # Test the case with an invalid query (you can customize this based on your API behavior)
        response = self.app.post('/api/market-analysis', 
                                  data=json.dumps({'query': 'invalid_query'}),
                                  content_type='application/json')
        
        self.assertEqual(response.status_code, 200)  # Assuming it still returns a 200 but with empty data
        data = json.loads(response.data)
        self.assertIn('market_size', data)
        self.assertIn('growth_rate', data)
        self.assertIn('competitors', data)
        self.assertIn('trends', data)
        self.assertIn('key_findings', data)

if __name__ == '__main__':
    unittest.main()