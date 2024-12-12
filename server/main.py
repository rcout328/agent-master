import os
import warnings
import logging
from market_analysis_crew import get_market_analysis_crew, get_report_generator, create_reports

# Disable all warnings and telemetry
warnings.filterwarnings('ignore')
os.environ["ANONYMIZED_TELEMETRY"] = "False"
os.environ["OPENTELEMETRY_ENABLED"] = "False"
os.environ["DISABLE_TELEMETRY"] = "True"

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def get_user_input():
    """Get user input for report generation"""
    print("\n=== Report Generation Configuration ===")
    
    # First, select report type
    report_types = {
        1: "Market Analysis",
        2: "Competitor Tracking",
        3: "ICP Report",
        4: "Gap Analysis",
        5: "Market Assessment",
        6: "Impact Assessment"
    }
    
    print("\nAvailable Report Types:")
    for num, report in report_types.items():
        print(f"{num}. {report}")
    
    while True:
        try:
            report_choice = int(input("\nSelect report type (1-6): "))
            if 1 <= report_choice <= 6:
                report_type = report_types[report_choice].lower().replace(" ", "_")
                break
            print("Please select a valid number between 1 and 6.")
        except ValueError:
            print("Please enter a valid number.")
    
    # Get common inputs
    company_name = input("\nEnter company name: ").strip()
    while not company_name:
        print("Company name is required.")
        company_name = input("Enter company name: ").strip()
    
    industry = input("Enter industry sector (optional): ").strip()
    
    # Get report-specific inputs
    inputs = {
        "company_name": company_name,
        "industry": industry,
        "time_period": input("Enter time period (e.g., 2024, press Enter for current): ").strip() or "2024"
    }
    
    if report_type == "market_analysis":
        print("\nSelect focus areas (enter numbers separated by commas):")
        focus_areas = [
            "Market Size and Growth",
            "Industry Trends",
            "Market Segments",
            "Geographic Distribution",
            "Regulatory Environment"
        ]
        for i, area in enumerate(focus_areas, 1):
            print(f"{i}. {area}")
        
        while True:
            try:
                selections = input("\nEnter your selections (e.g., 1,2,3): ").strip()
                if not selections:
                    inputs["focus_areas"] = focus_areas
                    break
                
                indices = [int(x.strip()) for x in selections.split(",")]
                selected_areas = [focus_areas[i-1] for i in indices if 1 <= i <= len(focus_areas)]
                if selected_areas:
                    inputs["focus_areas"] = selected_areas
                    break
                print("Please select at least one valid focus area.")
            except ValueError:
                print("Please enter valid numbers separated by commas.")
    
    elif report_type == "competitor_tracking":
        # Collect competitor names
        competitors = []
        while True:
            comp = input("Enter competitor name (or press Enter to finish): ").strip()
            if not comp:
                if not competitors:
                    print("Please enter at least one competitor.")
                    continue
                break
            competitors.append(comp)
        inputs["competitors"] = competitors
        
        # Collect tracking metrics
        metrics = [
            "Market Share",
            "Product Features",
            "Pricing Strategy",
            "Marketing Channels",
            "Customer Satisfaction"
        ]
        print("\nSelect tracking metrics:")
        for i, metric in enumerate(metrics, 1):
            print(f"{i}. {metric}")
        
        while True:
            try:
                selections = input("\nEnter your selections (e.g., 1,2,3): ").strip()
                indices = [int(x.strip()) for x in selections.split(",")]
                selected_metrics = [metrics[i-1] for i in indices if 1 <= i <= len(metrics)]
                if selected_metrics:
                    inputs["metrics"] = selected_metrics
                    break
                print("Please select at least one metric.")
            except ValueError:
                print("Please enter valid numbers separated by commas.")
        
        # Add timeframe input
        inputs["timeframe"] = inputs["time_period"]  # Use the common time_period as timeframe
        
        # Add additional competitor-specific inputs
        inputs["analysis_depth"] = input("\nSelect analysis depth (basic/detailed/comprehensive) [detailed]: ").strip().lower() or "detailed"
        inputs["market_region"] = input("Enter target market region [global]: ").strip() or "global"
        
        print("\nAdditional analysis parameters:")
        print("1. Historical Data")
        print("2. Current Market Position")
        print("3. Future Projections")
        print("4. All of the above")
        
        while True:
            try:
                analysis_scope = int(input("Select analysis scope (1-4) [4]: ") or "4")
                if 1 <= analysis_scope <= 4:
                    inputs["analysis_scope"] = analysis_scope
                    break
                print("Please select a valid number between 1 and 4.")
            except ValueError:
                print("Please enter a valid number.")
    
    # Add similar input collection for other report types
    
    return inputs, report_type

def main():
    try:
        # Get user inputs
        user_inputs, report_type = get_user_input()
        
        print("\nInitializing analysis...")
        print(f"Company: {user_inputs['company_name']}")
        print(f"Report Type: {report_type}")
        print(f"Industry: {user_inputs['industry'] or 'Not specified'}")
        
        # Confirmation
        confirm = input("\nProceed with analysis? (y/n): ").lower().strip()
        if confirm != 'y':
            print("Analysis cancelled.")
            return
        
        print("\nStarting analysis...")
        print("=" * 50)
        
        # Use the new generator
        generator = get_report_generator()
        result = generator.generate_report(report_type, user_inputs)
        
        # Create reports
        validation_file, report_file = create_reports(result, user_inputs, report_type)
        
        print("\n" + "="*50)
        print("ANALYSIS COMPLETE")
        print("="*50)
        print(f"\nReports generated:")
        print(f"1. Validation Report: {validation_file}")
        print(f"2. Analysis Report: {report_file}")
        
    except KeyboardInterrupt:
        print("\nAnalysis cancelled by user.")
    except Exception as e:
        print(f"\nError during analysis: {str(e)}")
        logger.exception("Analysis failed")
    finally:
        print("\nThank you for using the Market Analysis Tool!")

if __name__ == "__main__":
    main() 