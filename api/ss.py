# Install with pip install firecrawl-py
from firecrawl import FirecrawlApp
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)

app = FirecrawlApp(api_key='fc-b936b2eb6a3f4d2aaba86486180d41f1')

response = app.scrape_url(url='https://amzscout.net/blog/amazon-competitors/', params={
    'formats': ['markdown'],
})

# Log the response
logging.debug(f"Scraped Response: {response}")