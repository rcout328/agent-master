from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI
from langchain.tools import Tool
from langchain_community.tools import WriteFileTool
from langchain_community.utilities.serpapi import SerpAPIWrapper
import os
import argparse
import time

# Set API keys in environment
os.environ["OPENAI_API_KEY"] = "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"
os.environ["SERPAPI_API_KEY"] = "ab5994a0325d006f6567d50536425e38ed348e96bb7db92be50c07adb92e7dd3"

def get_user_input():
    """Get detailed input from user"""
    print("\n=== Market Analysis Configuration ===")
    print("Please provide the following information:\n")
    
    # Get company name
    while True:
        company_name = input("Enter company name to analyze: ").strip()
        if company_name:
            break
        print("Company name cannot be empty. Please try again.")
    
    # Get industry sector (optional)
    industry = input("Enter industry sector (optional, press Enter to skip): ").strip()
    
    # Get specific focus areas
    print("\nSelect focus areas (enter numbers separated by commas, e.g., 1,2,3):")
    focus_areas = [
        "Market Size and Growth",
        "Competitor Analysis",
        "Customer Demographics",
        "Technology Trends",
        "Financial Analysis",
        "Geographic Expansion",
        "Product Development"
    ]
    
    for i, area in enumerate(focus_areas, 1):
        print(f"{i}. {area}")
    
    while True:
        try:
            selected = input("\nEnter your selections: ").strip()
            if not selected:
                selected_areas = focus_areas  # Select all if none specified
                break
            
            indices = [int(x.strip()) for x in selected.split(",")]
            selected_areas = [focus_areas[i-1] for i in indices if 1 <= i <= len(focus_areas)]
            if selected_areas:
                break
            print("Please select at least one valid focus area.")
        except ValueError:
            print("Please enter valid numbers separated by commas.")
    
    # Get time period
    time_period = input("\nEnter analysis time period (e.g., '2024' or '2023-2024', press Enter for current): ").strip()
    if not time_period:
        time_period = "current"
    
    return {
        "company_name": company_name,
        "industry": industry,
        "focus_areas": selected_areas,
        "time_period": time_period
    }

# Initialize the OpenAI model
openai_model = ChatOpenAI(
    model_name="gpt-4o-mini",
    temperature=0.7
)

# Initialize tools
search = SerpAPIWrapper()

def enhanced_search(query):
    try:
        # Format query to target specific company and market data
        formatted_query = f"{query} market analysis OR {query} industry trends 2024"
        search_results = search.run(query=formatted_query, kwargs={
            "num": 10,
            "time": "y",
        })
        
        # Format the results as a dictionary
        return {
            "query": formatted_query,
            "results": search_results,
            "timestamp": time.strftime('%Y-%m-%d %H:%M:%S')
        }
    except Exception as e:
        return {
            "error": f"Search failed: {str(e)}",
            "timestamp": time.strftime('%Y-%m-%d %H:%M:%S')
        }

def write_file_tool_wrapper(file_input):
    """Wrapper for write file tool to ensure proper input format"""
    try:
        if isinstance(file_input, str):
            file_input = {"file_path": "report.md", "text": file_input}
        return WriteFileTool().run(file_input)
    except Exception as e:
        return {
            "error": f"File write failed: {str(e)}",
            "timestamp": time.strftime('%Y-%m-%d %H:%M:%S')
        }

# Update tool definitions
search_tool = Tool(
    name="Search the internet",
    description="Search the web using Serp API for comprehensive market analysis. Returns results as a structured dictionary.",
    func=enhanced_search
)

write_file_tool = Tool(
    name="Write File",
    description="Write content to a file. Input should be a dictionary with 'file_path' and 'text' keys.",
    func=write_file_tool_wrapper
)

def create_market_analysis_crew(user_inputs):
    """Create crew with user-specified parameters"""
    company_name = user_inputs["company_name"]
    industry = user_inputs["industry"]
    focus_areas = user_inputs["focus_areas"]
    time_period = user_inputs["time_period"]
    
    # Create the CEO Agent with updated backstory
    genesis_ceo = Agent(
        role='Chief Executive Officer',
        goal=f'Analyze {company_name} market trends and opportunities',
        backstory=f"""You are the CEO of Genesis Market Analysis, specializing in market research.
        Your expertise lies in analyzing market trends and business opportunities.
        When using tools, always provide input as structured dictionaries.
        For searches, provide clear search terms.
        For file operations, always specify both file path and content.""",
        tools=[search_tool, write_file_tool],
        allow_delegation=True,
        verbose=True
    )

    # Create the Data Collection Agent
    data_collector = Agent(
        role='Market Research Analyst',
        goal=f'Collect and analyze market data for {company_name}',
        backstory="""You are an expert Market Research Analyst with years of experience in 
        data collection and analysis.""",
        tools=[search_tool],
        verbose=True
    )

    # Create the Report Generator Agent
    report_generator = Agent(
        role='Business Report Writer',
        goal=f'Create comprehensive market analysis report for {company_name}',
        backstory="""You are a professional Business Report Writer who specializes in creating 
        comprehensive market analysis reports with actionable insights.""",
        tools=[write_file_tool],
        verbose=True
    )

    # Create Tasks
    data_collection_task = Task(
        description=f"""Collect comprehensive market data about {company_name}.
        Industry Focus: {industry if industry else 'All relevant industries'}
        Time Period: {time_period}
        
        Focus Areas:
        {chr(10).join(f'- {area}' for area in focus_areas)}
        
        Additional Analysis:
        - Market size and growth rates
        - Competitor analysis
        - Industry trends
        - Market challenges and opportunities""",
        expected_output="""A detailed market analysis document containing:
        1. Market size and growth metrics
        2. Competitor landscape analysis
        3. Industry trend analysis
        4. Market opportunities and challenges
        5. Supporting data and sources""",
        agent=data_collector
    )

    report_creation_task = Task(
        description=f"""Create a market analysis report for {company_name}.
        Include:
        - Market positioning strategy
        - Competitive advantages
        - Growth opportunities
        - Target audience analysis""",
        expected_output="""A comprehensive market analysis report in markdown format containing:
        1. Executive Summary
        2. Market Position Analysis
        3. Competitive Landscape
        4. Growth Strategy Recommendations
        5. Target Market Analysis
        6. Risk Assessment
        7. Future Outlook""",
        agent=report_generator
    )

    validation_task = Task(
        description=f"""Review and validate the {company_name} market analysis report.
        Ensure:
        - Accuracy of market insights
        - Completeness of competitive analysis
        - Validity of growth recommendations""",
        expected_output="""A validation report containing:
        1. Accuracy assessment
        2. Completeness check
        3. Recommendations for improvements
        4. Final approval or revision requests""",
        agent=genesis_ceo
    )

    # Create the Crew
    crew = Crew(
        agents=[genesis_ceo, data_collector, report_generator],
        tasks=[data_collection_task, report_creation_task, validation_task],
        process=Process.sequential,
        verbose=True,
        max_rpm=50,
        memory=True
    )

    return crew

def get_market_analysis_crew(company_name=None):
    """Get a configured market analysis crew"""
    if not company_name:
        user_inputs = get_user_input()
    else:
        user_inputs = {
            "company_name": company_name,
            "industry": "",
            "focus_areas": [
                "Market Size and Growth",
                "Competitor Analysis",
                "Customer Demographics",
                "Technology Trends",
                "Financial Analysis",
                "Geographic Expansion",
                "Product Development"
            ],
            "time_period": "current"
        }
    
    return create_market_analysis_crew(user_inputs)

# Export the crew function
market_analysis_crew = get_market_analysis_crew

def create_reports(result, user_inputs):
    """Create both validation and final market analysis reports"""
    timestamp = time.strftime('%Y%m%d_%H%M%S')
    
    # Create validation report
    validation_file = f"validation_report_{user_inputs['company_name']}_{timestamp}.txt"
    with open(validation_file, 'w') as f:
        f.write(f"Validation Report for {user_inputs['company_name']}\n")
        f.write(f"Generated on: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("="*50 + "\n\n")
        if isinstance(result, dict):
            for section, content in result.items():
                f.write(f"\n{section}:\n")
                if isinstance(content, list):
                    for item in content:
                        f.write(f"- {item}\n")
                else:
                    f.write(f"{content}\n")
        else:
            f.write(str(result))

    # Create final market analysis report
    analysis_file = f"market_analysis_{user_inputs['company_name']}_{timestamp}.md"
    with open(analysis_file, 'w') as f:
        f.write(f"# Market Analysis Report: {user_inputs['company_name']}\n\n")
        f.write(f"## Analysis Overview\n")
        f.write(f"- Company: {user_inputs['company_name']}\n")
        f.write(f"- Industry: {user_inputs['industry']}\n")
        f.write(f"- Analysis Period: {user_inputs['time_period']}\n")
        f.write(f"- Generated on: {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        f.write("## Focus Areas\n")
        for area in user_inputs['focus_areas']:
            f.write(f"- {area}\n")
        f.write("\n")

        f.write("## Executive Summary\n")
        f.write("This comprehensive market analysis provides insights into the company's market position, competitive landscape, and growth opportunities.\n\n")
        
        f.write("## Detailed Analysis\n")
        if isinstance(result, dict):
            for section, content in result.items():
                f.write(f"### {section}\n")
                if isinstance(content, list):
                    for item in content:
                        f.write(f"- {item}\n")
                else:
                    f.write(f"{content}\n")
                f.write("\n")
        else:
            f.write(str(result))
            
        f.write("\n## Recommendations\n")
        f.write("Based on the analysis, the following recommendations are provided:\n")
        # Add recommendations based on the analysis
        if isinstance(result, dict) and 'Recommendations' in result:
            for rec in result['Recommendations']:
                f.write(f"- {rec}\n")
                
        f.write("\n## Conclusion\n")
        f.write(f"This analysis provides a comprehensive overview of {user_inputs['company_name']}'s market position and opportunities for growth in {user_inputs['time_period']}.")
    
    return validation_file, analysis_file

def main():
    print("\n=== Market Analysis Tool ===")
    print("This tool will help you analyze any company's market position and opportunities.")
    
    try:
        # Get user inputs
        user_inputs = get_user_input()
        
        print("\nInitializing analysis...")
        print(f"Company: {user_inputs['company_name']}")
        print(f"Industry: {user_inputs['industry'] or 'Not specified'}")
        print("Focus Areas:")
        for area in user_inputs['focus_areas']:
            print(f"- {area}")
        print(f"Time Period: {user_inputs['time_period']}")
        
        # Confirmation
        confirm = input("\nProceed with analysis? (y/n): ").lower().strip()
        if confirm != 'y':
            print("Analysis cancelled.")
            return
        
        print("\nStarting market analysis...")
        print("=" * 50)
        
        # Create and run the crew with user inputs
        crew = create_market_analysis_crew(user_inputs)
        
        # Show progress
        print("\nAnalysis in progress...")
        result = crew.kickoff()
        
        # Create both reports
        validation_file, analysis_file = create_reports(result, user_inputs)
        
        print("\n" + "="*50)
        print("ANALYSIS COMPLETE")
        print("="*50)
        print(f"\nReports generated:")
        print(f"1. Validation Report: {validation_file}")
        print(f"2. Market Analysis Report: {analysis_file}")
        print("\nKey Findings Summary:")
        print("-"*30)
        
        # Display summary of key findings
        if isinstance(result, dict):
            for section, content in result.items():
                if section in ['Key Findings', 'Summary', 'Recommendations']:
                    print(f"\n{section}:")
                    if isinstance(content, list):
                        for item in content:
                            print(f"- {item}")
                    else:
                        print(content)
        
        print("\n" + "="*50)
            
    except KeyboardInterrupt:
        print("\nAnalysis cancelled by user.")
    except Exception as e:
        print(f"\nError during analysis: {str(e)}")
    finally:
        print("\nThank you for using the Market Analysis Tool!")

if __name__ == "__main__":
    main()