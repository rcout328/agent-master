from crewai_tools import FirecrawlSearchTool, FirecrawlApp  # Ensure both are imported
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Define FirecrawlApp (if necessary)
app = FirecrawlApp()  # This line may need to be adjusted based on actual usage

# Rebuild the FirecrawlSearchTool model
FirecrawlSearchTool.model_rebuild()  # Ensure this is called after defining the app

# Initialize the FirecrawlSearchTool with proper configuration
tool = FirecrawlSearchTool(
    api_key=os.getenv('FIRECRAWL_API_KEY'),
    query='what is firecrawl?',
    page_options={
        'onlyMainContent': True,
        'includeHtml': False,
        'fetchPageContent': True
    },
    search_options={
        'limit': 5
    }
)

# Test the tool
if __name__ == "__main__":
    try:
        result = tool.run()
        print("Search Results:")
        print(result)
    except Exception as e:
        print(f"Error occurred: {str(e)}")
