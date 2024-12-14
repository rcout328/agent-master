from crewai import Agent, Task, Crew, Process
from langchain_openai import ChatOpenAI
from langchain.tools import Tool
from langchain_community.tools import WriteFileTool
from crewai_tools import SerperDevTool, ScrapeWebsiteTool
import os
import time
from pathlib import Path
import json

# Initialize tools and models
openai_model = ChatOpenAI(
    model_name="gpt-4o-mini",
    temperature=0.7
)

class ReportGenerator:
    def __init__(self):
        self.search_tool = SerperDevTool(
            search_url="https://google.serper.dev/search",
            n_results=10,
        )
        
        self.scrape_tool = ScrapeWebsiteTool()
        
        self.write_file_tool = Tool(
            name="Write File",
            description="Write content to a file. Input should be a dictionary with 'file_path' and 'text' keys.",
            func=self.write_file_tool_wrapper
        )
        
        # Initialize ChatOpenAI with higher temperature for more creative inference
        self.question_generator = ChatOpenAI(
            model_name="gpt-4-turbo-preview",
            temperature=0.7
        )
        
        # Add default values for common fields
        self.default_values = {
            'time_period': '2024',
            'market_region': 'global',
            'analysis_depth': 'detailed',
            'focus_areas': ['Market Size', 'Competition', 'Growth Trends']
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

    def log_input_data(self, inputs):
        """Common method to log input data for all report types"""
        print("\n=== DATA PASSED TO AGENTS ===")
        print("\n1. Basic Information:")
        print(f"Company Name: {inputs.get('company_name')}")
        print(f"Industry: {inputs.get('industry')}")
        print(f"Time Period: {inputs.get('time_period')}")
        print(f"Detail Level: {inputs.get('detail_level')}")
        
        print("\n2. Website Analysis:")
        website_context = self.format_website_data(inputs.get('website_content', ''))
        print(f"Website Content Length: {len(inputs.get('website_content', ''))} characters")
        print("Structured Website Data:")
        print(website_context[:500] + "..." if len(website_context) > 500 else website_context)
        
        print("\n3. User Question Responses:")
        for key, value in inputs.items():
            if key.startswith('q') and key[1:].isdigit():
                print(f"Question {key[1:]}: {value}")
        
        print("\n4. Additional Context:")
        print(f"Focus Areas: {', '.join(inputs.get('focus_areas', ['Market Size', 'Competition', 'Growth Trends']))}")
        
        if inputs.get('competitors'):
            print(f"Competitors: {', '.join(inputs['competitors'])}")
        
        print("\n=== END OF INPUT DATA ===\n")
        return website_context

    def create_market_analysis_crew(self, inputs):
        # Set up logging
        print("\n=== DATA PASSED TO AGENTS ===")
        print("\n1. Basic Information:")
        print(f"Company Name: {inputs.get('company_name')}")
        print(f"Industry: {inputs.get('industry')}")
        print(f"Time Period: {inputs.get('time_period')}")
        print(f"Detail Level: {inputs.get('detail_level')}")
        
        print("\n2. Website Analysis:")
        website_context = self.format_website_data(inputs.get('website_content', ''))
        print(f"Website Content Length: {len(inputs.get('website_content', ''))} characters")
        print("Structured Website Data:")
        print(website_context[:500] + "..." if len(website_context) > 500 else website_context)
        
        print("\n3. User Question Responses:")
        for key, value in inputs.items():
            if key.startswith('q') and key[1:].isdigit():
                print(f"Question {key[1:]}: {value}")
        
        # Format user responses and insights
        user_insights = self.format_user_responses(inputs)
        
        print("\n4. Additional Context:")
        print(f"Focus Areas: {', '.join(inputs.get('focus_areas', ['Market Size', 'Competition', 'Growth Trends']))}")
        
        print("\n=== END OF INPUT DATA ===\n")
        
        # Create analysis context as before
        analysis_context = f"""
        COMPANY ANALYSIS CONTEXT
        =======================
        
        1. COMPANY INFORMATION
        ---------------------
        Company Name: {inputs["company_name"]}
        Industry: {inputs["industry"]}
        Time Period: {inputs["time_period"]}
        
        2. WEBSITE ANALYSIS
        ------------------
        {website_context}
        
        3. USER INSIGHTS
        ---------------
        {user_insights}
        
        4. FOCUS AREAS
        -------------
        {', '.join(inputs.get('focus_areas', ['Market Size', 'Competition', 'Growth Trends']))}
        """
        
        analyst = Agent(
            role='Market Research Analyst',
            goal=f'Analyze {inputs["company_name"]} market position and trends',
            backstory="""Expert in market research and analysis with 15+ years of experience. 
            Specialized in data-driven market analysis, competitive intelligence, and strategic recommendations.""",
            tools=[self.search_tool, self.scrape_tool],
            verbose=True,
            system_prompt=f"""You are an expert market research analyst analyzing {inputs['company_name']}.
            
            ANALYSIS CONTEXT:
            {analysis_context}
            
            REQUIRED ANALYSIS COMPONENTS:
            1. Market Size and Growth Analysis
               - Global and regional market size
               - Growth rates and projections
               - Market segmentation
            
            2. Competitive Analysis
               - Key competitors identification
               - Market share analysis
               - Competitive advantages/disadvantages
            
            3. Industry Trends
               - Current market trends
               - Emerging technologies
               - Consumer behavior patterns
            
            4. Market Drivers & Inhibitors
               - Growth catalysts
               - Market challenges
               - Regulatory factors
            
            5. Opportunities & Threats
               - Market opportunities
               - Potential threats
               - Risk assessment
            
            Use the search and scrape tools to gather data from at least 5 different authoritative sources.
            Include specific metrics, statistics, and data points to support all findings."""
        )

        writer = Agent(
            role='Business Report Writer',
            goal='Create comprehensive market analysis reports',
            backstory="""Professional business writer with expertise in creating clear, actionable market analysis 
            reports. Skilled at synthesizing complex data into compelling narratives that drive decision-making.""",
            tools=[self.write_file_tool],
            verbose=True,
            allow_delegation=False,
            system_prompt=f"""You are a professional business report writer creating a market analysis report for {inputs['company_name']}.

Create a detailed market analysis report following this structure:

1. Executive Summary
   - Key findings and recommendations
   - Market overview and size
   - Critical trends and opportunities

2. Market Overview
   - Current market size and growth trends
   - Market segmentation analysis
   - Industry structure and dynamics

3. Competitive Analysis
   - Key competitors and market shares
   - Competitive advantages and disadvantages
   - Strategic positioning analysis

4. Market Drivers and Inhibitors
   - Growth drivers and market opportunities
   - Challenges and potential threats
   - Regulatory and economic factors

5. Strategic Recommendations
   - Market entry or expansion strategies
   - Competitive positioning recommendations
   - Risk mitigation strategies

Format the report in clear, professional markdown with appropriate headers, bullet points, and emphasis."""
        )

        tasks = [
            Task(
                description=f"""Analyze market trends and position for {inputs["company_name"]}
                Focus Areas: {', '.join(inputs.get('focus_areas', ['Market Size', 'Competition', 'Growth Trends']))}
                Industry: {inputs['industry']}
                Time Period: {inputs['time_period']}
                
                Required Analysis Components:
                1. Market size and growth analysis with specific metrics
                2. Detailed competitive landscape assessment
                3. Industry trend analysis with supporting data
                4. Market driver and inhibitor identification
                5. Opportunity and threat analysis
                
                Ensure all findings are:
                - Data-driven with credible sources
                - Current and relevant
                - Actionable for business decisions
                
                You must scrape at least 5 different websites and compile their data before passing to the report writer.""",
                expected_output="""A comprehensive market analysis containing:
                1. Detailed market size and growth metrics
                2. Competitive landscape analysis
                3. Industry trend assessment
                4. Market driver analysis
                5. Strategic recommendations
                
                Format: Structured markdown with clear sections and supporting data from at least 5 scraped websites""",
                agent=analyst
            ),
            Task(
                description="""Create a detailed market analysis report that synthesizes all findings into a clear, 
                actionable document. Include:
                1. Executive summary with key insights
                2. Detailed market analysis with supporting data
                3. Competitive landscape assessment
                4. Strategic recommendations
                5. Risk analysis and mitigation strategies
                
                Format Requirements:
                - Professional markdown formatting
                - Clear section headers and subheaders
                - Bullet points for key findings
                - Tables or lists for data presentation
                - Emphasis on actionable insights""",
                expected_output="""A well-structured markdown report containing:
                - Executive summary
                - Market overview
                - Detailed analysis
                - Key findings
                - Strategic recommendations
                
                Format: Professional markdown with clear hierarchy and organization""",
                agent=writer
            )
        ]

        return Crew(
            agents=[analyst, writer],
            tasks=tasks,
            verbose=True,
            process=Process.sequential
        )

    def format_website_data(self, content):
        """Format website content into structured analysis"""
        try:
            if not content:
                return """
                No website content available for analysis.
                Using basic company information and user inputs for analysis.
                """
            
            analysis_prompt = f"""Analyze this website content and provide a structured analysis in the following format:

            1. Company Overview
            - Main business focus
            - Core offerings
            - Company positioning

            2. Products/Services
            - Key offerings
            - Features/capabilities
            - Target solutions

            3. Target Market
            - Primary audience
            - Market segments
            - Geographic focus

            4. Value Proposition
            - Key differentiators
            - Main benefits
            - Unique advantages

            5. Key Technologies/Solutions
            - Core technologies
            - Technical capabilities
            - Platform features

            6. Market Position
            - Industry focus
            - Competitive stance
            - Market approach

            Website Content:
            {content[:3000]}
            """
            
            response = self.question_generator.predict(analysis_prompt)
            
            # Validate the response has actual content
            if len(response.strip()) < 50:
                raise ValueError("Insufficient analysis generated")
            
            return response.strip()
            
        except Exception as e:
            print(f"Notice: Using structured default format due to analysis error: {e}")
            
            # Provide a structured default analysis
            return f"""
            1. Company Overview
            Based on available information, the company operates in the {inputs.get('industry', 'technology')} sector.
            
            2. Products/Services
            Analysis will be based on user inputs and market research.
            
            3. Target Market
            Market analysis will be conducted using industry standards and user responses.
            
            4. Value Proposition
            Will be derived from market research and competitive analysis.
            
            5. Key Technologies/Solutions
            Technology assessment will be based on industry trends and company focus.
            
            6. Market Position
            Position analysis will use market research and competitive intelligence.
            """

    def format_user_responses(self, inputs):
        """Format user responses into structured insights"""
        insights = []
        
        # Format question responses
        question_responses = []
        for key, value in inputs.items():
            if key.startswith('q') and key[1:].isdigit():
                question_responses.append(f"Q{key[1:]}: {value}")
        
        if question_responses:
            insights.append("USER RESPONSES TO ANALYSIS QUESTIONS:")
            insights.extend(question_responses)
        
        # Add additional insights
        if inputs.get('additional_insights'):
            insights.append("\nADDITIONAL INSIGHTS:")
            insights.append(inputs['additional_insights'])
        
        # Add market focus
        if inputs.get('market_focus'):
            insights.append("\nMARKET FOCUS:")
            insights.append(inputs['market_focus'])
        
        return "\n".join(insights) if insights else "No additional user insights provided."

    def create_competitor_tracking_crew(self, inputs):
        """Create crew for competitor tracking"""
        try:
            # Log input data
            website_context = self.log_input_data(inputs)
            
            # Format user responses
            user_insights = self.format_user_responses(inputs)
            
            # Ensure competitors list exists
            if 'competitors' not in inputs or not inputs['competitors']:
                inputs['competitors'] = ['Competitors will be identified through market research']
            
            analysis_context = f"""
            COMPETITOR ANALYSIS CONTEXT
            =======================
            
            1. COMPANY INFORMATION
            ---------------------
            Company Name: {inputs.get('company_name', 'Unknown')}
            Industry: {inputs.get('industry', 'Technology')}
            Time Period: {inputs.get('time_period', '2024')}
            
            2. WEBSITE ANALYSIS
            ------------------
            {website_context}
            
            3. USER INSIGHTS
            ---------------
            {user_insights}
            
            4. COMPETITORS
            -------------
            {', '.join(inputs['competitors'])}
            """
            
            analyst = Agent(
                role='Competitive Intelligence Analyst',
                goal=f'Track and analyze competitors of {inputs.get("company_name", "the company")}',
                backstory="Expert in competitive analysis and market intelligence.",
                tools=[self.search_tool, self.scrape_tool],
                verbose=True
            )
            
            writer = Agent(
                role='Business Report Writer',
                goal='Create comprehensive competitor analysis reports',
                backstory="""Professional business writer specializing in competitive intelligence reports.""",
                tools=[self.write_file_tool],
                verbose=True,
                allow_delegation=False
            )
            
            tasks = [
                Task(
                    description=f"""Analyze the competitive landscape for {inputs['company_name']}. Focus on:
                    1. Direct and indirect competitors
                    2. Market positioning
                    3. Competitive advantages
                    4. Industry trends""",
                    agent=analyst,
                    expected_output="""A comprehensive competitive analysis including:
                    - Detailed competitor profiles
                    - Market positioning analysis
                    - Competitive advantages/disadvantages
                    - Industry trend insights
                    - Supporting data and metrics"""
                ),
                Task(
                    description="""Create a detailed competitor analysis report including:
                    1. Executive summary
                    2. Competitor profiles
                    3. Comparative analysis
                    4. Strategic recommendations
                    
                    Format in professional markdown.""",
                    agent=writer,
                    expected_output="""A well-structured markdown report containing:
                    - Executive summary
                    - Detailed competitor analysis
                    - Market positioning insights
                    - Strategic recommendations
                    - Supporting data and metrics"""
                )
            ]
            
            return Crew(
                agents=[analyst, writer],
                tasks=tasks,
                verbose=True
            )
            
        except Exception as e:
            print(f"Error in competitor tracking crew creation: {e}")
            raise

    def create_icp_report_crew(self, inputs):
        """Create crew for ICP (Ideal Customer Profile) report"""
        try:
            # Log input data
            website_context = self.log_input_data(inputs)
            
            # Format user responses
            user_insights = self.format_user_responses(inputs)
            
            analysis_context = f"""
            ICP ANALYSIS CONTEXT
            ===================
            
            1. COMPANY INFORMATION
            ---------------------
            Company Name: {inputs.get('company_name', 'Unknown')}
            Industry: {inputs.get('industry', 'Technology')}
            Time Period: {inputs.get('time_period', '2024')}
            
            2. WEBSITE ANALYSIS
            ------------------
            {website_context}
            
            3. USER INSIGHTS
            ---------------
            {user_insights}
            """
            
            analyst = Agent(
                role='ICP Research Analyst',
                goal=f'Define ideal customer profile for {inputs.get("company_name")}',
                backstory="Expert in customer segmentation and market research.",
                tools=[self.search_tool, self.scrape_tool],
                verbose=True
            )
            
            writer = Agent(
                role='ICP Report Writer',
                goal='Create comprehensive ICP analysis report',
                backstory="Specialized in creating detailed customer profile reports.",
                tools=[self.write_file_tool],
                verbose=True
            )
            
            tasks = [
                Task(
                    description=f"""Analyze and define the ideal customer profile for {inputs['company_name']}. 
                    Focus on:
                    1. Demographic characteristics
                    2. Behavioral patterns
                    3. Pain points and needs
                    4. Decision-making process
                    5. Value drivers""",
                    expected_output="""A comprehensive ICP analysis including:
                    - Detailed customer segments
                    - Behavioral analysis
                    - Needs assessment
                    - Purchase patterns
                    - Value propositions""",
                    agent=analyst
                ),
                Task(
                    description="""Create a detailed ICP report including:
                    1. Executive summary
                    2. Customer segment profiles
                    3. Needs analysis
                    4. Buying behavior
                    5. Recommendations
                    
                    Format in professional markdown.""",
                    expected_output="""A well-structured markdown report containing:
                    - Executive summary
                    - Detailed ICP analysis
                    - Customer journey mapping
                    - Actionable recommendations
                    - Supporting data""",
                    agent=writer
                )
            ]
            
            return Crew(
                agents=[analyst, writer],
                tasks=tasks,
                verbose=True
            )
            
        except Exception as e:
            print(f"Error in ICP report crew creation: {e}")
            raise

    def create_gap_analysis_crew(self, inputs):
        """Create crew for gap analysis"""
        try:
            # Log input data
            website_context = self.log_input_data(inputs)
            
            # Format user responses
            user_insights = self.format_user_responses(inputs)
            
            analysis_context = f"""
            GAP ANALYSIS CONTEXT
            ===================
            
            1. COMPANY INFORMATION
            ---------------------
            Company Name: {inputs.get('company_name', 'Unknown')}
            Industry: {inputs.get('industry', 'Technology')}
            Time Period: {inputs.get('time_period', '2024')}
            
            2. WEBSITE ANALYSIS
            ------------------
            {website_context}
            
            3. USER INSIGHTS
            ---------------
            {user_insights}
            """
            
            analyst = Agent(
                role='Gap Analysis Specialist',
                goal=f'Identify market and performance gaps for {inputs.get("company_name")}',
                backstory="Expert in identifying market gaps and improvement opportunities.",
                tools=[self.search_tool, self.scrape_tool],
                verbose=True
            )
            
            writer = Agent(
                role='Gap Analysis Report Writer',
                goal='Create comprehensive gap analysis report',
                backstory="Specialized in writing detailed gap analysis reports.",
                tools=[self.write_file_tool],
                verbose=True
            )
            
            tasks = [
                Task(
                    description=f"""Analyze market and performance gaps for {inputs['company_name']}. 
                    Focus on:
                    1. Current market position
                    2. Competitor capabilities
                    3. Customer needs vs offerings
                    4. Performance metrics
                    5. Growth opportunities""",
                    expected_output="""A comprehensive gap analysis including:
                    - Market position gaps
                    - Performance gaps
                    - Capability gaps
                    - Technology gaps
                    - Resource gaps""",
                    agent=analyst
                ),
                Task(
                    description="""Create a detailed gap analysis report including:
                    1. Executive summary
                    2. Current state analysis
                    3. Desired state analysis
                    4. Gap identification
                    5. Recommendations
                    
                    Format in professional markdown.""",
                    expected_output="""A well-structured markdown report containing:
                    - Executive summary
                    - Detailed gap analysis
                    - Supporting data
                    - Action plans
                    - Implementation roadmap""",
                    agent=writer
                )
            ]
            
            return Crew(
                agents=[analyst, writer],
                tasks=tasks,
                verbose=True
            )
            
        except Exception as e:
            print(f"Error in gap analysis crew creation: {e}")
            raise

    def create_market_assessment_crew(self, inputs):
        """Create crew for market assessment"""
        try:
            website_context = self.log_input_data(inputs)
            user_insights = self.format_user_responses(inputs)
            
            analysis_context = f"""
            MARKET ASSESSMENT CONTEXT
            ========================
            
            1. COMPANY INFORMATION
            ---------------------
            Company Name: {inputs.get('company_name', 'Unknown')}
            Industry: {inputs.get('industry', 'Technology')}
            Time Period: {inputs.get('time_period', '2024')}
            
            2. WEBSITE ANALYSIS
            ------------------
            {website_context}
            
            3. USER INSIGHTS
            ---------------
            {user_insights}
            """
            
            analyst = Agent(
                role='Market Assessment Specialist',
                goal=f'Assess market potential and opportunities for {inputs.get("company_name")}',
                backstory="Expert in market assessment and opportunity analysis.",
                tools=[self.search_tool, self.scrape_tool],
                verbose=True
            )
            
            writer = Agent(
                role='Market Assessment Report Writer',
                goal='Create comprehensive market assessment report',
                backstory="Specialized in market assessment documentation.",
                tools=[self.write_file_tool],
                verbose=True
            )
            
            tasks = [
                Task(
                    description=f"""Assess market potential for {inputs['company_name']}. 
                    Focus on:
                    1. Market size and growth
                    2. Market segments
                    3. Entry barriers
                    4. Market dynamics
                    5. Growth potential""",
                    expected_output="""A comprehensive market assessment including:
                    - Market size analysis
                    - Segment analysis
                    - Opportunity assessment
                    - Risk analysis
                    - Growth projections""",
                    agent=analyst
                ),
                Task(
                    description="""Create a detailed market assessment report including:
                    1. Executive summary
                    2. Market overview
                    3. Opportunity analysis
                    4. Risk assessment
                    5. Recommendations
                    
                    Format in professional markdown.""",
                    expected_output="""A well-structured markdown report containing:
                    - Market analysis
                    - Opportunity mapping
                    - Risk evaluation
                    - Strategic recommendations
                    - Implementation plan""",
                    agent=writer
                )
            ]
            
            return Crew(
                agents=[analyst, writer],
                tasks=tasks,
                verbose=True
            )
            
        except Exception as e:
            print(f"Error in market assessment crew creation: {e}")
            raise

    def create_impact_assessment_crew(self, inputs):
        """Create crew for impact assessment"""
        try:
            website_context = self.log_input_data(inputs)
            user_insights = self.format_user_responses(inputs)
            
            analysis_context = f"""
            IMPACT ASSESSMENT CONTEXT
            ========================
            
            1. COMPANY INFORMATION
            ---------------------
            Company Name: {inputs.get('company_name', 'Unknown')}
            Industry: {inputs.get('industry', 'Technology')}
            Time Period: {inputs.get('time_period', '2024')}
            
            2. WEBSITE ANALYSIS
            ------------------
            {website_context}
            
            3. USER INSIGHTS
            ---------------
            {user_insights}
            """
            
            analyst = Agent(
                role='Impact Assessment Specialist',
                goal=f'Evaluate market impact and potential for {inputs.get("company_name")}',
                backstory="Expert in impact assessment and market influence analysis.",
                tools=[self.search_tool, self.scrape_tool],
                verbose=True
            )
            
            writer = Agent(
                role='Impact Assessment Report Writer',
                goal='Create comprehensive impact assessment report',
                backstory="Specialized in impact assessment documentation.",
                tools=[self.write_file_tool],
                verbose=True
            )
            
            tasks = [
                Task(
                    description=f"""Assess market impact for {inputs['company_name']}. 
                    Focus on:
                    1. Market influence
                    2. Industry impact
                    3. Competitive effect
                    4. Growth influence
                    5. Future potential""",
                    expected_output="""A comprehensive impact assessment including:
                    - Market influence analysis
                    - Industry impact evaluation
                    - Competitive effect analysis
                    - Growth potential assessment
                    - Future scenarios""",
                    agent=analyst
                ),
                Task(
                    description="""Create a detailed impact assessment report including:
                    1. Executive summary
                    2. Impact analysis
                    3. Market influence
                    4. Future scenarios
                    5. Recommendations
                    
                    Format in professional markdown.""",
                    expected_output="""A well-structured markdown report containing:
                    - Impact evaluation
                    - Market influence analysis
                    - Future projections
                    - Strategic recommendations
                    - Implementation roadmap""",
                    agent=writer
                )
            ]
            
            return Crew(
                agents=[analyst, writer],
                tasks=tasks,
                verbose=True
            )
            
        except Exception as e:
            print(f"Error in impact assessment crew creation: {e}")
            raise

    def validate_and_collect_inputs(self, inputs):
        """Validate inputs and prompt for missing required fields"""
        # First get report detail level
        print("\nSelect Report Detail Level:")
        print("1. Quick Analysis (Brief overview with key insights)")
        print("2. Detailed Analysis (Comprehensive market research)")
        while True:
            detail_level = input("Enter your choice (1 or 2): ").strip()
            if detail_level in ['1', '2']:
                break
            print("Please enter either 1 or 2")
        
        inputs['detail_level'] = 'quick' if detail_level == '1' else 'detailed'
        
        # Show available report types
        print("\nAvailable Report Types:")
        report_types = {
            '1': 'Market Analysis',
            '2': 'Competitor Tracking',
            '3': 'ICP Report',
            '4': 'Gap Analysis',
            '5': 'Market Assessment',
            '6': 'Impact Assessment'
        }
        
        for key, value in report_types.items():
            print(f"{key}. {value}")
        
        # Get report type
        while True:
            report_choice = input("\nSelect report type (1-6): ").strip()
            if report_choice in report_types:
                inputs['report_type'] = report_types[report_choice].lower().replace(' ', '_')
                break
            print("Please enter a number between 1 and 6")
        
        # Basic required fields
        required_fields = {
            'company_name': 'Enter company name: ',
            'industry': 'Enter company industry (e.g., Technology, Education, Healthcare): ',
            'time_period': 'Enter analysis time period (default 2024): ',
            'website_url': 'Enter company website URL: '
        }
        
        validated_inputs = inputs.copy()
        missing_fields = []
        
        # Check for missing required fields
        for field, prompt in required_fields.items():
            if field not in validated_inputs or not validated_inputs[field]:
                missing_fields.append((field, prompt))
        
        if missing_fields:
            print("\nPlease provide the following required information:")
            for field, prompt in missing_fields:
                if field == 'time_period':
                    value = input(prompt) or '2024'
                else:
                    while True:
                        value = input(prompt)
                        if value.strip():
                            break
                        print(f"{field} is required. Please enter a value.")
                validated_inputs[field] = value
        
        return validated_inputs

    def generate_report(self, report_type, context):
        """Generate report based on type and context"""
        try:
            # Extract company info from context
            company_info = context.get('company_info', {})
            
            # Create analysis inputs
            analysis_inputs = {
                'company_name': company_info.get('company_name'),
                'industry': company_info.get('industry'),
                'website_url': company_info.get('website'),
                'website_content': context.get('website_data'),
                'detail_level': context.get('detail_level', 'quick'),
                'report_type': report_type,
                'time_period': '2024',  # Default value
                'answers': context.get('answers', {})
            }

            # Validate required fields
            if not analysis_inputs['company_name'] or not analysis_inputs['industry']:
                raise ValueError("Missing required fields: company_name and industry are required")

            # Log analysis data
            print("\n=== DATA PASSED TO AGENTS ===")
            print("\n1. Basic Information:")
            print(f"Company Name: {analysis_inputs['company_name']}")
            print(f"Industry: {analysis_inputs['industry']}")
            print(f"Time Period: {analysis_inputs['time_period']}")
            print(f"Detail Level: {analysis_inputs['detail_level']}")
            
            print("\n2. Website Analysis:")
            website_content = analysis_inputs.get('website_content', '')
            print(f"Website Content Length: {len(website_content)} characters")
            if website_content:
                print("Website Content Available: Yes")
            else:
                print("No website content available for analysis.")
                
            print("\n3. User Question Responses:")
            for qid, answer in analysis_inputs['answers'].items():
                print(f"Q{qid}: {answer}")
                
            print("\n4. Additional Context:")
            print("Focus Areas: Market Size, Competition, Growth Trends")
            print("\n=== END OF INPUT DATA ===\n")

            # Create appropriate crew based on report type
            crew_creators = {
                'market_analysis': self.create_market_analysis_crew,
                'competitor_analysis': self.create_competitor_tracking_crew,
                'icp_report': self.create_icp_report_crew,
                'gap_analysis': self.create_gap_analysis_crew,
                'market_assessment': self.create_market_assessment_crew,
                'impact_assessment': self.create_impact_assessment_crew
            }

            if report_type not in crew_creators:
                raise ValueError(f"Invalid report type: {report_type}")

            # Create and run crew
            crew = crew_creators[report_type](analysis_inputs)
            if not crew:
                raise ValueError(f"Failed to create crew for {report_type}")

            print(f"\nStarting {report_type} analysis...")
            result = crew.kickoff()
            print("Analysis completed successfully")

            return result

        except Exception as e:
            print(f"Error in report generation: {str(e)}")
            raise

    def infer_company_data(self, website_content):
        """Infer company data from website content using AI"""
        try:
            prompt = f"""Analyze the following website content and extract key business information.
            Return the data in JSON format with these fields:
            - industry: Primary industry of the company
            - business_model: B2B or B2C or both
            - target_market: Target market description
            - competitors: List of likely competitors
            - focus_areas: List of main business focus areas
            
            Website Content:
            {website_content[:3000]}
            """
            
            response = self.question_generator.predict(prompt)
            
            # Clean and parse the response
            response = response.strip()
            if response.startswith('```') and response.endswith('```'):
                response = response[3:-3].strip()
            if response.startswith('json'):
                response = response[4:].strip()
                
            inferred_data = json.loads(response)
            
            # Set default values for any missing fields
            default_data = {
                'industry': 'Technology',
                'business_model': 'B2B',
                'target_market': 'Global',
                'competitors': [],
                'focus_areas': ['Market Size', 'Competition', 'Growth Trends']
            }
            
            return {**default_data, **inferred_data}
        except Exception as e:
            print(f"Error inferring company data: {e}")
            return {
                'industry': 'Technology',
                'business_model': 'B2B',
                'target_market': 'Global',
                'competitors': [],
                'focus_areas': ['Market Size', 'Competition', 'Growth Trends']
            }

    def generate_personalized_questions(self, website_content, report_type, detail_level='quick'):
        """Generate questions based on detail level and website content"""
        if detail_level == 'quick':
            prompt = f"""Generate 2-3 essential questions for a quick {report_type} report.
            Questions must be very brief (under 8 words) and focus on core business metrics.
            Make questions specific to the company's industry and services.

            Website Content:
            {website_content[:1000]}

            Return response in this exact JSON format:
            {{
                "questions": [
                    {{"id": 1, "question": "Your first question here", "type": "text"}},
                    {{"id": 2, "question": "Your second question here", "type": "text"}}
                ]
            }}
            """
        else:
            prompt = f"""Generate 4-5 detailed questions for a comprehensive {report_type} report.
            Questions should cover multiple aspects of the business.

            Website Content:
            {website_content[:2000]}

            Return response in this exact JSON format:
            {{
                "questions": [
                    {{"id": 1, "question": "Your first question here", "type": "text"}},
                    {{"id": 2, "question": "Your second question here", "type": "text"}},
                    {{"id": 3, "question": "Your third question here", "type": "text"}},
                    {{"id": 4, "question": "Your fourth question here", "type": "text"}}
                ]
            }}
            """

        try:
            # Get response and ensure it's JSON
            response = self.question_generator.predict(prompt + "\nRespond ONLY with the JSON object.")
            
            # Clean the response
            response = response.strip()
            if response.startswith('```json'):
                response = response[7:]
            elif response.startswith('```'):
                response = response[3:]
            if response.endswith('```'):
                response = response[:-3]
            
            response = response.strip()
            
            # Parse JSON and validate structure
            questions_data = json.loads(response)
            if not isinstance(questions_data, dict) or 'questions' not in questions_data:
                raise ValueError("Invalid response format")
            
            # Format questions for display
            print("\n=== Personalized Questions ===")
            for q in questions_data['questions']:
                print(f"\n{q['question']}")
            print("\n")
            
            return questions_data
            
        except Exception as e:
            print(f"Error generating questions: {e}")
            # Default questions based on detail level
            if detail_level == 'quick':
                default_questions = {
                    "questions": [
                        {
                            "id": 1,
                            "question": "Who are your direct competitors?",
                            "type": "text"
                        },
                        {
                            "id": 2,
                            "question": "What's your main revenue stream?",
                            "type": "text"
                        }
                    ]
                }
            else:
                default_questions = {
                    "questions": [
                        {
                            "id": 1,
                            "question": "Who are your top three competitors?",
                            "type": "text"
                        },
                        {
                            "id": 2,
                            "question": "What's your target market segment?",
                            "type": "text"
                        },
                        {
                            "id": 3,
                            "question": "What's your unique selling proposition?",
                            "type": "text"
                        },
                        {
                            "id": 4,
                            "question": "What's your growth rate target?",
                            "type": "text"
                        }
                    ]
                }
            
            # Display default questions
            print("\n=== Default Questions ===")
            for q in default_questions['questions']:
                print(f"\n{q['question']}")
            print("\n")
            
            return default_questions

    def scrape_company_website(self, url):
        """Scrape company website using existing tools"""
        try:
            scraper = ScrapeWebsiteTool(website_url=url)
            content = scraper.run()
            return content
        except Exception as e:
            print(f"Error scraping website: {e}")
            return None

    def analyze_website_content(self, website_data, company_name):
        """Analyze website content using GPT to detect industry and other details"""
        try:
            if not website_data:
                return {
                    "industry": "Technology",
                    "business_model": "B2B",
                    "target_market": "General",
                    "products": ["Unknown"],
                    "market_focus": "Global"
                }

            print("Analyzing website content with AI...")
            
            prompt = f"""Analyze this website content for {company_name} and provide key business information.
            
            Website Content:
            {website_data[:2000]}
            
            Return ONLY a JSON object with this exact format:
            {{
                "industry": "main industry category",
                "business_model": "B2B or B2C",
                "target_market": "target market description",
                "products": ["main product/service 1", "product/service 2"],
                "market_focus": "geographic focus"
            }}
            """
            
            # Use the question generator (ChatGPT) to analyze
            response = self.question_generator.invoke(prompt).content
            
            # Clean the response
            response = response.strip()
            if response.startswith('```json'):
                response = response[7:]
            if response.endswith('```'):
                response = response[:-3]
            
            # Parse JSON response
            analysis = json.loads(response.strip())
            print("Website analysis completed successfully")
            
            return analysis
            
        except Exception as e:
            print(f"Error analyzing website: {str(e)}")
            # Return default values if analysis fails
            return {
                "industry": "Technology",
                "business_model": "B2B",
                "target_market": "General",
                "products": ["Unknown"],
                "market_focus": "Global"
            }

    def generate_questions(self, context):
        """Generate questions based on company context and detail level"""
        try:
            company_name = context['company_info']['company_name']
            industry = context['company_info']['industry']
            detail_level = context.get('detail_level', 'quick')
            website_data = context.get('website_data', '')
            report_type = context.get('report_type', 'market_analysis')

            print(f"Generating {detail_level} questions for {report_type}...")

            if detail_level == 'quick':
                prompt = f"""Generate 2-3 brief but specific questions about {company_name} in the {industry} industry.
                Focus on core business metrics and market position.
                
                Context:
                {website_data[:1000]}
                
                Return ONLY a JSON object with this exact format:
                {{
                    "questions": [
                        {{"id": 1, "question": "Brief, specific question about core metrics?"}},
                        {{"id": 2, "question": "Brief question about market position?"}},
                        {{"id": 3, "question": "Brief question about growth/strategy?"}},
                    ]
                }}
                """
            else:
                prompt = f"""Generate 4-5 detailed questions about {company_name} in the {industry} industry.
                Include questions about:
                - Market positioning
                - Competitive advantages
                - Growth strategy
                - Target market
                - Business model
                
                Context:
                {website_data[:1500]}
                
                Return ONLY a JSON object with this exact format:
                {{
                    "questions": [
                        {{"id": 1, "question": "Detailed question 1?"}},
                        {{"id": 2, "question": "Detailed question 2?"}},
                        {{"id": 3, "question": "Detailed question 3?"}},
                        {{"id": 4, "question": "Detailed question 4?"}},
                        {{"id": 5, "question": "Detailed question 5?"}}
                    ]
                }}
                """

            # Get AI response
            response = self.question_generator.invoke(prompt).content
            
            # Clean response
            response = response.strip()
            if response.startswith('```json'):
                response = response[7:]
            if response.endswith('```'):
                response = response[:-3]
            
            # Parse and validate questions
            questions_data = json.loads(response.strip())
            if not isinstance(questions_data, dict) or 'questions' not in questions_data:
                raise ValueError("Invalid question format received")

            # Log generated questions
            print("\nGenerated Questions:")
            for q in questions_data['questions']:
                print(f"• {q['question']}")

            return questions_data['questions']

        except Exception as e:
            print(f"Error generating questions: {str(e)}")
            # Return default questions based on detail level
            if detail_level == 'quick':
                return [
                    {
                        "id": 1,
                        "question": f"What is {company_name}'s main competitive advantage in the {industry} market?"
                    },
                    {
                        "id": 2,
                        "question": "Who are your top 2-3 direct competitors?"
                    },
                    {
                        "id": 3,
                        "question": "What is your primary revenue stream?"
                    }
                ]
            else:
                return [
                    {
                        "id": 1,
                        "question": f"What unique value proposition does {company_name} offer in the {industry} space?"
                    },
                    {
                        "id": 2,
                        "question": "Who are your main competitors and how do you differentiate?"
                    },
                    {
                        "id": 3,
                        "question": "What are your key growth metrics and targets?"
                    },
                    {
                        "id": 4,
                        "question": "What market opportunities are you targeting?"
                    },
                    {
                        "id": 5,
                        "question": "What are your main customer acquisition channels?"
                    }
                ]

def create_reports(result, context, report_type):
    """Create validation and report files"""
    try:
        # Extract company info from context
        company_info = context.get('company_info', {})
        company_name = company_info.get('company_name')
        
        if not company_name:
            raise ValueError("Company name is required for report generation")
            
        # Create filenames
        timestamp = time.strftime('%Y%m%d_%H%M%S')
        base_name = f"{company_name.lower().replace(' ', '_')}_{report_type}_{timestamp}"
        
        validation_file = f"{base_name}_validation.txt"
        report_file = f"{base_name}_report.md"

        # Create validation report
        with open(validation_file, 'w') as f:
            f.write(f"Validation Report for {company_name}\n")
            f.write(f"Report Type: {report_type}\n")
            f.write(f"Generated on: {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            f.write("=== Input Parameters ===\n")
            f.write(f"Company Name: {company_name}\n")
            f.write(f"Industry: {company_info.get('industry', 'N/A')}\n")
            f.write(f"Website: {company_info.get('website', 'N/A')}\n")
            f.write(f"Detail Level: {context.get('detail_level', 'quick')}\n\n")
            
            f.write("=== User Responses ===\n")
            for qid, answer in context.get('answers', {}).items():
                f.write(f"Q{qid}: {answer}\n")
            
            f.write("\n=== Analysis Result ===\n")
            f.write(str(result))

        # Create main report
        with open(report_file, 'w') as f:
            if isinstance(result, str):
                f.write(result)
            else:
                f.write(str(result))

        return validation_file, report_file
        
    except Exception as e:
        print(f"Error creating report files: {str(e)}")
        raise

def get_report_generator():
    return ReportGenerator()

def get_market_analysis_crew(user_inputs):
    """Backward compatibility function for existing code"""
    generator = ReportGenerator()
    return generator.create_market_analysis_crew(user_inputs)
