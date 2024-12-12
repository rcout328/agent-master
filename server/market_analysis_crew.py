from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI
from langchain.tools import Tool
from langchain_community.tools import WriteFileTool
from langchain_community.utilities.serpapi import SerpAPIWrapper
import os
import time
from pathlib import Path

# Initialize tools and models
openai_model = ChatOpenAI(
    model_name="gpt-4o-mini",
    temperature=0.7
)
search = SerpAPIWrapper()

class ReportGenerator:
    def __init__(self):
        self.search_tool = Tool(
            name="Search the internet",
            description="Search the web for comprehensive analysis",
            func=self.enhanced_search
        )
        
        self.write_file_tool = Tool(
            name="Write File",
            description="Write content to a file. Input should be a dictionary with 'file_path' and 'text' keys.",
            func=self.write_file_tool_wrapper
        )

    def enhanced_search(self, query):
        try:
            formatted_query = f"{query} analysis OR {query} insights 2024"
            search_results = search.run(query=formatted_query, kwargs={
                "num": 10,
                "time": "y",
            })
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

    def write_file_tool_wrapper(self, file_input):
        try:
            if isinstance(file_input, str):
                file_input = {"file_path": "report.md", "text": file_input}
            return WriteFileTool().run(file_input)
        except Exception as e:
            return {
                "error": f"File write failed: {str(e)}",
                "timestamp": time.strftime('%Y-%m-%d %H:%M:%S')
            }

    def create_market_analysis_crew(self, inputs):
        analyst = Agent(
            role='Market Research Analyst',
            goal=f'Analyze {inputs["company_name"]} market position and trends',
            backstory="""Expert in market research and analysis. Skilled at identifying trends 
            and opportunities in various markets.""",
            tools=[self.search_tool],
            verbose=True
        )

        writer = Agent(
            role='Business Report Writer',
            goal='Create comprehensive market analysis reports',
            backstory="""Professional business writer specializing in creating clear, 
            actionable market analysis reports.""",
            tools=[self.write_file_tool],
            verbose=True
        )

        tasks = [
            Task(
                description=f"""Analyze market trends and position for {inputs["company_name"]}
                Focus on: {', '.join(inputs['focus_areas'])}
                Industry: {inputs['industry']}
                Time Period: {inputs['time_period']}""",
                expected_output="""A comprehensive market analysis containing:
                - Market size and growth trends
                - Industry analysis
                - Key market drivers
                - Competitive landscape
                - Market opportunities and challenges""",
                agent=analyst
            ),
            Task(
                description="Create a detailed market analysis report with findings",
                expected_output="""A well-structured markdown report containing:
                - Executive summary
                - Market overview
                - Detailed analysis
                - Key findings
                - Strategic recommendations""",
                agent=writer
            )
        ]

        return Crew(
            agents=[analyst, writer],
            tasks=tasks,
            verbose=True
        )

    def create_competitor_tracking_crew(self, inputs):
        analyst = Agent(
            role='Competitive Intelligence Analyst',
            goal=f'Track and analyze competitors of {inputs["company_name"]}',
            backstory="Expert in competitive analysis and market intelligence.",
            tools=[self.search_tool],
            verbose=True
        )

        writer = Agent(
            role='Competition Report Writer',
            goal='Create detailed competitor analysis reports',
            backstory="Specialist in competitive intelligence reporting.",
            tools=[self.write_file_tool],
            verbose=True
        )

        tasks = [
            Task(
                description=f"""Analyze competitors for {inputs['company_name']} in {inputs['industry']}
                Competitors to analyze: {', '.join(inputs['competitors'])}
                Metrics to track: {', '.join(inputs['metrics'])}
                Time Period: {inputs['timeframe']}
                Analysis Depth: {inputs['analysis_depth']}
                Market Region: {inputs['market_region']}
                Analysis Scope: {inputs['analysis_scope']}
                
                Provide detailed analysis including:
                1. Competitor Overview
                2. Market Position
                3. Strengths and Weaknesses
                4. Competitive Advantages
                5. Market Strategy
                6. Future Outlook
                
                Focus on the selected metrics and provide actionable insights.""",
                expected_output="""A comprehensive competitor analysis document containing:
                - Detailed analysis of each competitor
                - Market positioning comparison
                - Strengths and weaknesses analysis
                - Strategic recommendations
                The analysis should be data-driven and actionable.""",
                agent=analyst
            ),
            Task(
                description=f"""Create a comprehensive competitor analysis report including:
                1. Executive Summary
                2. Detailed Analysis of Each Competitor
                3. Comparative Analysis
                4. Strategic Recommendations
                5. Future Considerations
                
                Use data and insights from the analysis to create a clear, actionable report.""",
                expected_output="""A well-structured markdown report containing:
                - Executive summary
                - Competitor profiles and analysis
                - Market positioning
                - Strategic insights
                - Actionable recommendations
                The report should be clear, professional, and ready for executive review.""",
                agent=writer
            )
        ]

        return Crew(
            agents=[analyst, writer],
            tasks=tasks,
            verbose=True
        )

    def create_icp_report_crew(self, inputs):
        # Similar structure for ICP Report
        pass

    def create_gap_analysis_crew(self, inputs):
        # Similar structure for Gap Analysis
        pass

    def create_market_assessment_crew(self, inputs):
        # Similar structure for Market Assessment
        pass

    def create_impact_assessment_crew(self, inputs):
        # Similar structure for Impact Assessment
        pass

    def generate_report(self, report_type, inputs):
        crew_creators = {
            'market_analysis': self.create_market_analysis_crew,
            'competitor_tracking': self.create_competitor_tracking_crew,
            'icp_report': self.create_icp_report_crew,
            'gap_analysis': self.create_gap_analysis_crew,
            'market_assessment': self.create_market_assessment_crew,
            'impact_assessment': self.create_impact_assessment_crew
        }

        if report_type not in crew_creators:
            raise ValueError(f"Invalid report type: {report_type}")

        crew = crew_creators[report_type](inputs)
        return crew.kickoff()

def create_reports(result, inputs, report_type):
    timestamp = time.strftime('%Y%m%d_%H%M%S')
    base_name = f"{inputs['company_name']}_{report_type}_{timestamp}"
    
    validation_file = f"{base_name}_validation.txt"
    report_file = f"{base_name}_report.md"

    # Create validation report
    with open(validation_file, 'w') as f:
        f.write(f"Validation Report for {inputs['company_name']}\n")
        f.write(f"Report Type: {report_type}\n")
        f.write(f"Generated on: {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write(str(result))

    # Create main report
    with open(report_file, 'w') as f:
        f.write(f"# {report_type.replace('_', ' ').title()} Report\n\n")
        f.write(f"## Overview\n")
        f.write(f"Company: {inputs['company_name']}\n")
        # Add report-specific content
        f.write(str(result))

    return validation_file, report_file

def get_report_generator():
    return ReportGenerator()

def get_market_analysis_crew(user_inputs):
    """Backward compatibility function for existing code"""
    generator = ReportGenerator()
    return generator.create_market_analysis_crew(user_inputs)