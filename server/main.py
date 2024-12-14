from market_analysis_crew import ReportGenerator, create_reports
import time
import json
from langchain.chat_models import ChatOpenAI

def get_questions_by_report_type(report_type, detail_level, company_name, industry, website_data=None):
    """Generate dynamic AI questions based on report type and detail level"""
    
    # Initialize ChatGPT
    question_generator = ChatOpenAI(
        model_name="gpt-4-turbo-preview",
        temperature=0.9  # Increased for more variety
    )
    
    try:
        # Dynamic prompts based on report type
        report_focus = {
            'market_analysis': {
                'quick': "core revenue metrics, immediate market position, key competitors",
                'detailed': "comprehensive market analysis, competitive positioning, growth trajectory, market share analysis, strategic opportunities"
            },
            'competitor_analysis': {
                'quick': "direct competitors, key differentiators, competitive advantages",
                'detailed': "detailed competitor landscape, market positioning, competitive strategies, technological advantages, market share distribution"
            },
            'icp_report': {
                'quick': "target customer profile, customer needs, acquisition channels",
                'detailed': "customer segmentation, behavior patterns, lifetime value, satisfaction metrics, engagement analysis"
            },
            'gap_analysis': {
                'quick': "immediate opportunities, current limitations, quick wins",
                'detailed': "market gaps, capability assessment, resource requirements, growth opportunities, strategic positioning"
            },
            'market_assessment': {
                'quick': "market size, growth rate, immediate trends",
                'detailed': "market segmentation, growth projections, regulatory landscape, technological trends, market barriers"
            },
            'impact_assessment': {
                'quick': "key performance indicators, current impact, immediate challenges",
                'detailed': "comprehensive impact metrics, stakeholder analysis, long-term projections, measurement frameworks, optimization strategies"
            }
        }

        # Create dynamic prompt
        if detail_level == 'quick':
            prompt = f"""As an expert market analyst, generate 3 highly focused, specific questions about {company_name} in the {industry} industry.
            
            Focus areas: {report_focus[report_type]['quick']}
            
            Requirements:
            - Questions must be brief (under 15 words)
            - Focus on quantifiable metrics where possible
            - Be specific to their industry and business model
            - Questions should help gather critical insights quickly
            
            Website Content for Context:
            {website_data[:2000] if website_data else 'No website data available'}
            
            Return ONLY a JSON object with this exact format:
            {{
                "questions": [
                    {{"id": 1, "question": "Brief, specific question about core metrics?"}},
                    {{"id": 2, "question": "Brief question about market position?"}},
                    {{"id": 3, "question": "Brief question about immediate opportunities?"}},
                ]
            }}
            """
        else:
            prompt = f"""As an expert market analyst, generate 5 comprehensive analytical questions about {company_name} in the {industry} industry.
            
            Focus areas: {report_focus[report_type]['detailed']}
            
            Requirements:
            - Questions should be detailed and thought-provoking
            - Cover multiple aspects of each focus area
            - Include both quantitative and qualitative aspects
            - Probe for strategic insights and long-term implications
            
            Website Content for Context:
            {website_data[:3000] if website_data else 'No website data available'}
            
            Return ONLY a JSON object with this exact format:
            {{
                "questions": [
                    {{"id": 1, "question": "Comprehensive question about market position?"}},
                    {{"id": 2, "question": "Detailed question about competitive advantage?"}},
                    {{"id": 3, "question": "Strategic question about growth opportunities?"}},
                    {{"id": 4, "question": "In-depth question about market dynamics?"}},
                    {{"id": 5, "question": "Analytical question about future potential?"}}
                ]
            }}
            """

        # Get AI response with higher temperature for more variety
        response = question_generator.invoke(prompt).content
        
        # Clean and parse response
        response = response.strip()
        if response.startswith('```json'):
            response = response[7:]
        if response.endswith('```'):
            response = response[:-3]
        
        questions_data = json.loads(response.strip())
        
        print("\nGenerated Questions:")
        for q in questions_data['questions']:
            print(f"• {q['question']}")
            
        return questions_data['questions']
        
    except Exception as e:
        print(f"Error generating AI questions: {str(e)}")
        # Only use fallback questions if AI generation completely fails
        return get_default_questions(report_type, detail_level, company_name, industry)

def get_default_questions(report_type, detail_level, company_name, industry):
    """Fallback questions if AI generation fails"""
    questions_by_type = {
        'market_analysis': {
            'quick': [
                {"id": 1, "question": f"What is {company_name}'s primary revenue model?"},
                {"id": 2, "question": f"Top 3 competitors in {industry}?"},
                {"id": 3, "question": "Current market share percentage?"}
            ],
            'detailed': [
                {"id": 1, "question": f"What unique value proposition does {company_name} offer in the {industry} market?"},
                {"id": 2, "question": "What are your key market differentiators from competitors?"},
                {"id": 3, "question": "What are your current market growth metrics?"},
                {"id": 4, "question": "Which market segments show highest potential?"},
                {"id": 5, "question": "What are your key customer acquisition channels?"}
            ]
        },
        'competitor_analysis': {
            'quick': [
                {"id": 1, "question": "Name your top 3 direct competitors?"},
                {"id": 2, "question": "Key competitive advantage?"},
                {"id": 3, "question": "Main market differentiator?"}
            ],
            'detailed': [
                {"id": 1, "question": "List your top 5 competitors and their market shares?"},
                {"id": 2, "question": "What are competitors' pricing strategies?"},
                {"id": 3, "question": "Key technological advantages of competitors?"},
                {"id": 4, "question": "Competitors' target market segments?"},
                {"id": 5, "question": "Competitor growth rates and strategies?"}
            ]
        },
        'icp_report': {
            'quick': [
                {"id": 1, "question": "Primary customer segment?"},
                {"id": 2, "question": "Average customer value?"},
                {"id": 3, "question": "Key customer pain points?"}
            ],
            'detailed': [
                {"id": 1, "question": "Detailed customer demographic breakdown?"},
                {"id": 2, "question": "Customer acquisition and retention metrics?"},
                {"id": 3, "question": "Customer lifetime value by segment?"},
                {"id": 4, "question": "Most successful customer use cases?"},
                {"id": 5, "question": "Customer feedback and satisfaction metrics?"}
            ]
        },
        'gap_analysis': {
            'quick': [
                {"id": 1, "question": "Biggest market opportunity?"},
                {"id": 2, "question": "Main product/service gap?"},
                {"id": 3, "question": "Current market limitations?"}
            ],
            'detailed': [
                {"id": 1, "question": "What market needs are currently unmet?"},
                {"id": 2, "question": "Technical capabilities gaps?"},
                {"id": 3, "question": "Resource and skill gaps?"},
                {"id": 4, "question": "Market expansion opportunities?"},
                {"id": 5, "question": "Product development roadmap gaps?"}
            ]
        },
        'market_assessment': {
            'quick': [
                {"id": 1, "question": f"Total addressable market size in {industry}?"},
                {"id": 2, "question": "Current market growth rate?"},
                {"id": 3, "question": "Key market trends?"}
            ],
            'detailed': [
                {"id": 1, "question": "Detailed market size by segment?"},
                {"id": 2, "question": "Market growth projections next 3 years?"},
                {"id": 3, "question": "Regulatory impacts on market?"},
                {"id": 4, "question": "Technology trends affecting market?"},
                {"id": 5, "question": "Market entry barriers?"}
            ]
        },
        'impact_assessment': {
            'quick': [
                {"id": 1, "question": "Primary business impact metric?"},
                {"id": 2, "question": "Current market impact?"},
                {"id": 3, "question": "Key impact challenges?"}
            ],
            'detailed': [
                {"id": 1, "question": "Quantitative impact metrics?"},
                {"id": 2, "question": "Stakeholder impact analysis?"},
                {"id": 3, "question": "Long-term impact projections?"},
                {"id": 4, "question": "Impact measurement methods?"},
                {"id": 5, "question": "Impact optimization strategies?"}
            ]
        }
    }
    return questions_by_type[report_type][detail_level]

def run_analysis():
    """Run the market analysis tool with proper flow"""
    print("\n=== Market Analysis Tool ===")
    
    # Initialize report generator
    generator = ReportGenerator()
    
    # STEP 1: Detail Level Selection
    print("\nStep 1: Select Analysis Detail Level")
    print("1. Quick Analysis (15-20 minutes)")
    print("   • 2-3 focused questions")
    print("   • Core metrics analysis")
    print("   • Key recommendations")
    print("\n2. Detailed Analysis (45-60 minutes)")
    print("   • 4-5 comprehensive questions")
    print("   • In-depth market research")
    print("   • Detailed strategic insights")
    
    while True:
        detail_choice = input("\nEnter choice (1 or 2): ").strip()
        if detail_choice in ['1', '2']:
            detail_level = 'quick' if detail_choice == '1' else 'detailed'
            break
        print("Please enter 1 or 2")
    
    # STEP 2: Report Type Selection
    print("\nStep 2: Select Report Type")
    report_types = {
        "1": ("market_analysis", "Market Analysis - Overall market position and trends"),
        "2": ("competitor_analysis", "Competitor Analysis - Detailed competitive landscape"),
        "3": ("icp_report", "ICP Report - Ideal Customer Profile analysis"),
        "4": ("gap_analysis", "Gap Analysis - Market opportunities and gaps"),
        "5": ("market_assessment", "Market Assessment - Industry potential"),
        "6": ("impact_assessment", "Impact Assessment - Business impact analysis")
    }
    
    print("\nAvailable Report Types:")
    for num, (_, desc) in report_types.items():
        print(f"{num}. {desc}")
    
    while True:
        choice = input("\nEnter choice (1-6): ").strip()
        if choice in report_types:
            report_type = report_types[choice][0]
            break
        print("Please enter a valid choice (1-6)")
    
    # STEP 3: Company Information
    print("\nStep 3: Company Information")
    while True:
        company_name = input("Company Name: ").strip()
        if company_name:
            break
        print("Company name is required!")
    
    while True:
        industry = input("Industry: ").strip()
        if industry:
            break
        print("Industry is required!")
    
    website_url = input("Website URL: ").strip()
    
    # STEP 4: Website Analysis
    print("\nStep 4: Website Analysis")
    website_data = None
    if website_url:
        print("\n🔍 Analyzing website content...")
        try:
            website_data = generator.scrape_company_website(website_url)
            if website_data:
                print("✓ Website scraping complete")
                print("\nAnalyzing content with AI...")
                
                analysis = generator.analyze_website_content(website_data, company_name)
                
                print("\n=== Website Analysis Results ===")
                print(f"Detected Industry: {analysis['industry']}")
                print(f"Business Model: {analysis['business_model']}")
                print(f"Target Market: {analysis['target_market']}")
                print(f"Main Products/Services: {', '.join(analysis['products'])}")
                print(f"Market Focus: {analysis['market_focus']}")
                
                if analysis['industry'].lower() != industry.lower():
                    print(f"\nNote: Detected industry ({analysis['industry']}) differs from provided industry ({industry})")
                    use_detected = input("Use detected industry instead? (y/n): ").lower().strip()
                    if use_detected == 'y':
                        industry = analysis['industry']
                        print(f"Updated industry to: {industry}")
                
                proceed = input("\nProceed with these insights? (y/n): ").lower().strip()
                if proceed != 'y':
                    return run_analysis()
            else:
                print("! Could not scrape website content")
                proceed = input("\nContinue without website analysis? (y/n): ").lower().strip()
                if proceed != 'y':
                    return run_analysis()
                
        except Exception as e:
            print(f"! Website analysis error: {str(e)}")
            proceed = input("\nContinue without website analysis? (y/n): ").lower().strip()
            if proceed != 'y':
                return run_analysis()
    
    # Create analysis context
    context = {
        'company_info': {
            'company_name': company_name,
            'industry': industry,
            'website': website_url
        },
        'website_data': website_data,
        'report_type': report_type,
        'detail_level': detail_level
    }
    
    # STEP 5: Generate and Ask Questions
    print("\nStep 5: Generating Questions")
    try:
        # Get AI-generated questions based on website data
        questions = get_questions_by_report_type(
            report_type=report_type,
            detail_level=detail_level,
            company_name=company_name,
            industry=industry,
            website_data=website_data
        )
        
        # Collect answers
        answers = {}
        print(f"\nPlease answer these {detail_level} analysis questions:")
        for q in questions:
            answer = input(f"\n{q['question']}: ").strip()
            answers[q['id']] = answer
        
        # Update context with answers
        context['answers'] = answers
        
        # Show collected data summary
        print("\n=== Analysis Data Summary ===")
        print(f"Company: {company_name}")
        print(f"Industry: {industry}")
        print(f"Report Type: {report_type}")
        print(f"Detail Level: {detail_level}")
        print("\nWebsite Analysis:", "✓ Complete" if website_data else "Not Available")
        print("\nYour Answers:")
        for qid, ans in answers.items():
            print(f"Q{qid}: {ans}")
        
        proceed = input("\nGenerate report with this information? (y/n): ").lower().strip()
        if proceed != 'y':
            return run_analysis()
        
    except Exception as e:
        print(f"Error in question generation: {str(e)}")
        return
    
    # STEP 6: Generate Report
    print("\nStep 6: Generating Report")
    try:
        print("\n=== Starting Analysis ===")
        print("• Analyzing market data")
        print("• Processing user inputs")
        print("• Generating insights")
        
        result = generator.generate_report(report_type, context)
        
        # Create reports with context
        try:
            validation_file, report_file = create_reports(result, context, report_type)
            
            print("\n✓ Report generated successfully!")
            print(f"Report saved to: {report_file}")
            
            # Show preview
            print("\n=== Report Preview ===")
            with open(report_file, 'r') as f:
                content = f.read()
                print(content[:500] + "...\n")
                
            if input("Show full report? (y/n): ").lower().startswith('y'):
                print("\n" + "="*50)
                print(content)
                print("="*50 + "\n")
                
        except Exception as e:
            print(f"Error creating report files: {str(e)}")
            return
            
    except Exception as e:
        print(f"\nError in report generation: {str(e)}")
        return
    
    print("\n✓ Analysis Complete!")

if __name__ == "__main__":
    try:
        run_analysis()
    except KeyboardInterrupt:
        print("\nOperation cancelled by user")
    except Exception as e:
        print(f"\nUnexpected error: {str(e)}")
    finally:
        print("\nThank you for using the Market Analysis Tool!")