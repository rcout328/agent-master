from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI
from langchain.tools import Tool
from langchain_community.tools import WriteFileTool
from crewai_tools import SerperDevTool
import os
import time
from pathlib import Path

# Initialize tools and models
openai_model = ChatOpenAI(
    model_name="gpt-4o",
    temperature=0.7
)

class ReportGenerator:
    def __init__(self):
        self.search_tool = SerperDevTool(
            search_url="https://google.serper.dev/search",
            n_results=10,
        )
        
        self.write_file_tool = Tool(
            name="Write File",
            description="Write content to a file. Input should be a dictionary with 'file_path' and 'text' keys.",
            func=self.write_file_tool_wrapper
        )

    def enhanced_search(self, query):
        """Enhanced search using SerperDevTool"""
        try:
            formatted_query = f"{query} analysis OR {query} insights 2024"
            search_results = self.search_tool.run(formatted_query)
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
        analyst = Agent(
            role='ICP Research Analyst',
            goal=f'Create detailed Ideal Customer Profile for {inputs["company_name"]}',
            backstory="""Expert in customer profiling, market segmentation, and buyer persona development. 
            Skilled at identifying and analyzing ideal customer characteristics and behaviors.""",
            tools=[self.search_tool],
            verbose=True
        )

        writer = Agent(
            role='ICP Report Writer',
            goal='Create comprehensive ICP analysis reports',
            backstory="""Professional report writer specializing in customer profile documentation 
            and actionable insights for business strategy.""",
            tools=[self.write_file_tool],
            verbose=True
        )

        tasks = [
            Task(
                description=f"""Analyze and create Ideal Customer Profile for {inputs["company_name"]}
                Industry: {inputs['industry']}
                Business Model: {inputs.get('business_model', 'B2B')}
                Target Market: {inputs.get('target_market', 'Global')}
                Company Size: {inputs.get('company_size', 'All')}
                
                Provide detailed analysis including:
                1. Customer Demographics
                2. Firmographics (for B2B)
                3. Behavioral Patterns
                4. Pain Points
                5. Decision Making Process
                6. Value Propositions
                7. Buying Criteria
                
                Focus on creating actionable customer insights.""",
                expected_output="""A comprehensive ICP analysis containing:
                - Detailed customer characteristics
                - Market segment analysis
                - Behavioral insights
                - Purchase patterns
                - Decision factors
                The analysis should be data-driven and actionable.""",
                agent=analyst
            ),
            Task(
                description=f"""Create a detailed ICP report including:
                1. Executive Summary
                2. Ideal Customer Profile Overview
                3. Detailed Customer Characteristics
                4. Market Segment Analysis
                5. Customer Journey Mapping
                6. Engagement Strategies
                7. Implementation Recommendations
                
                Use insights from the analysis to create a clear, actionable report.""",
                expected_output="""A well-structured markdown report containing:
                - Executive summary
                - Detailed ICP analysis
                - Market insights
                - Strategic recommendations
                The report should be clear, professional, and ready for executive review.""",
                agent=writer
            )
        ]

        return Crew(
            agents=[analyst, writer],
            tasks=tasks,
            verbose=True
        )

    def create_gap_analysis_crew(self, inputs):
        analyst = Agent(
            role='Gap Analysis Specialist',
            goal=f'Analyze gaps and opportunities for {inputs["company_name"]}',
            backstory="""Expert in identifying and analyzing organizational gaps, market gaps, 
            and strategic opportunities. Skilled at providing actionable recommendations.""",
            tools=[self.search_tool],
            verbose=True
        )

        writer = Agent(
            role='Gap Analysis Report Writer',
            goal='Create comprehensive gap analysis reports',
            backstory="""Professional report writer specializing in gap analysis documentation 
            and strategic recommendations.""",
            tools=[self.write_file_tool],
            verbose=True
        )

        tasks = [
            Task(
                description=f"""Conduct gap analysis for {inputs["company_name"]} in {inputs["industry"]}
                Focus Areas: {', '.join(inputs['focus_areas'])}
                Time Period: {inputs['timeframe']}
                Analysis Depth: {inputs['analysis_depth']}
                Market Region: {inputs['market_region']}
                
                Provide detailed analysis including:
                1. Current State Assessment
                2. Desired Future State
                3. Gap Identification
                4. Root Cause Analysis
                5. Impact Assessment
                6. Recommendations
                
                Focus on the selected areas and provide actionable insights.""",
                expected_output="""A comprehensive gap analysis containing:
                - Current state evaluation
                - Future state definition
                - Gap identification and analysis
                - Strategic recommendations
                The analysis should be data-driven and actionable.""",
                agent=analyst
            ),
            Task(
                description=f"""Create a detailed gap analysis report including:
                1. Executive Summary
                2. Current State Analysis
                3. Future State Vision
                4. Gap Identification
                5. Impact Analysis
                6. Strategic Recommendations
                7. Implementation Roadmap
                
                Use insights from the analysis to create a clear, actionable report.""",
                expected_output="""A well-structured markdown report containing:
                - Executive summary
                - Detailed gap analysis
                - Strategic recommendations
                - Implementation plan
                The report should be clear, professional, and ready for executive review.""",
                agent=writer
            )
        ]

        return Crew(
            agents=[analyst, writer],
            tasks=tasks,
            verbose=True
        )

    def create_market_assessment_crew(self, inputs):
        """Create crew for market assessment reports"""
        analyst = Agent(
            role='Market Assessment Analyst',
            goal=f'Analyze market position and opportunities for {inputs["company_name"]}',
            backstory="""Expert in market assessment and analysis. Skilled at evaluating 
            market conditions, competitive landscapes, and growth opportunities.""",
            tools=[self.search_tool],
            verbose=True
        )

        writer = Agent(
            role='Market Assessment Writer',
            goal='Create comprehensive market assessment reports',
            backstory="""Professional report writer specializing in market assessment documentation 
            and strategic insights.""",
            tools=[self.write_file_tool],
            verbose=True
        )

        tasks = [
            Task(
                description=f"""Conduct market assessment for {inputs["company_name"]} in {inputs["industry"]}
                Assessment Type: {inputs["market_type"]}
                Focus Areas: {', '.join(inputs['focus_areas'])}
                Market Region: {inputs['market_region']}
                Timeframe: {inputs['timeframe']}
                Key Metrics: {', '.join(inputs['metrics'])}
                
                Provide detailed analysis including:
                1. Market Overview
                2. Competitive Position
                3. Growth Opportunities
                4. Market Trends
                5. Risk Assessment
                6. Strategic Recommendations
                
                Focus on the selected areas and metrics to provide actionable insights.""",
                expected_output="""A comprehensive market assessment containing:
                - Market overview and size
                - Competitive analysis
                - Growth opportunities
                - Strategic recommendations
                The analysis should be data-driven and actionable.""",
                agent=analyst
            ),
            Task(
                description=f"""Create a detailed market assessment report including:
                1. Executive Summary
                2. Market Analysis
                3. Competitive Position
                4. Growth Opportunities
                5. Risk Assessment
                6. Strategic Recommendations
                7. Implementation Guidelines
                
                Use insights from the analysis to create a clear, actionable report.""",
                expected_output="""A well-structured markdown report containing:
                - Executive summary
                - Detailed market assessment
                - Strategic recommendations
                - Implementation guidelines
                The report should be clear, professional, and ready for executive review.""",
                agent=writer
            )
        ]

        return Crew(
            agents=[analyst, writer],
            tasks=tasks,
            verbose=True
        )

    def create_impact_assessment_crew(self, inputs):
        """Create crew for impact assessment reports"""
        analyst = Agent(
            role='Impact Assessment Analyst',
            goal=f'Analyze business impact for {inputs["company_name"]}',
            backstory="""Expert in impact analysis and assessment. Skilled at evaluating 
            social, economic, and environmental impacts of business operations.""",
            tools=[self.search_tool],
            verbose=True
        )

        writer = Agent(
            role='Impact Assessment Writer',
            goal='Create comprehensive impact assessment reports',
            backstory="""Professional report writer specializing in impact assessment documentation 
            and strategic recommendations.""",
            tools=[self.write_file_tool],
            verbose=True
        )

        tasks = [
            Task(
                description=f"""Analyze impact for {inputs["company_name"]} in {inputs["industry"]}
                Impact Areas: {', '.join(inputs['impact_areas'])}
                Timeframe: {inputs['timeframe']}
                Region: {inputs['market_region']}
                
                Provide detailed analysis including:
                1. Social Impact Analysis
                2. Economic Impact Assessment
                3. Environmental Impact
                4. Stakeholder Impact
                5. Long-term Sustainability
                6. Risk Assessment
                7. Recommendations
                
                Focus on quantifiable metrics and actionable insights.""",
                expected_output="""A comprehensive impact assessment containing:
                - Social impact metrics
                - Economic impact analysis
                - Environmental sustainability measures
                - Stakeholder analysis
                - Strategic recommendations
                The analysis should be data-driven and actionable.""",
                agent=analyst
            ),
            Task(
                description=f"""Create a detailed impact assessment report including:
                1. Executive Summary
                2. Impact Analysis Overview
                3. Social Impact Assessment
                4. Economic Impact Analysis
                5. Environmental Impact Evaluation
                6. Stakeholder Analysis
                7. Risk Assessment
                8. Strategic Recommendations
                9. Implementation Guidelines
                
                Use insights from the analysis to create a clear, actionable report.""",
                expected_output="""A well-structured markdown report containing:
                - Executive summary
                - Detailed impact assessment
                - Key metrics and findings
                - Strategic recommendations
                The report should be clear, professional, and ready for executive review.""",
                agent=writer
            )
        ]

        return Crew(
            agents=[analyst, writer],
            tasks=tasks,
            verbose=True
        )

    def generate_report(self, report_type, inputs):
        # Convert report type to match the crew creator function names
        report_type = report_type.lower().replace(' ', '_')
        
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
        if crew is None:
            raise ValueError(f"Failed to create crew for report type: {report_type}")
        
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