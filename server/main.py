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
    print("\n=== Report Generation Configuration ===\n")
    
    # Show available report types
    print("Available Report Types:")
    print("1. Market Analysis")
    print("2. Competitor Tracking")
    print("3. ICP Report")
    print("4. Gap Analysis")
    print("5. Market Assessment")
    print("6. Impact Assessment")
    
    # Get report type
    while True:
        try:
            report_choice = int(input("\nSelect report type (1-6): "))
            if 1 <= report_choice <= 6:
                report_types = {
                    1: "market_analysis",
                    2: "competitor_tracking",
                    3: "icp_report",
                    4: "gap_analysis",
                    5: "market_assessment",
                    6: "impact_assessment"
                }
                report_type = report_types[report_choice]
                break
            print("Please select a number between 1 and 6.")
        except ValueError:
            print("Please enter a valid number.")

    # Common inputs for all report types
    inputs = {}
    inputs["company_name"] = input("\nEnter company name: ").strip()
    inputs["industry"] = input("Enter industry sector (optional): ").strip()
    inputs["time_period"] = input("Enter time period (e.g., 2024, press Enter for current): ").strip() or "2024"

    # Report-specific inputs
    if report_type == "icp_report":
        # Business Model
        print("\nSelect business model:")
        print("1. B2B")
        print("2. B2C")
        print("3. B2B2C")
        while True:
            try:
                model_choice = int(input("Select model (1-3) [1]: ") or "1")
                if 1 <= model_choice <= 3:
                    model_map = {1: "b2b", 2: "b2c", 3: "b2b2c"}
                    inputs["business_model"] = model_map[model_choice]
                    break
                print("Please select a valid number between 1 and 3")
            except ValueError:
                print("Please enter a valid number")

        # Company Size
        print("\nSelect target company size:")
        print("1. Small (1-50 employees)")
        print("2. Medium (51-500 employees)")
        print("3. Large (501+ employees)")
        print("4. All sizes")
        while True:
            try:
                size_choice = int(input("Select size (1-4) [4]: ") or "4")
                if 1 <= size_choice <= 4:
                    size_map = {1: "small", 2: "medium", 3: "large", 4: "all"}
                    inputs["company_size"] = size_map[size_choice]
                    break
                print("Please select a valid number between 1 and 4")
            except ValueError:
                print("Please enter a valid number")

        # Target Market
        print("\nSelect target market:")
        markets = ["Global", "North America", "Europe", "Asia Pacific", "Latin America"]
        for i, market in enumerate(markets, 1):
            print(f"{i}. {market}")
        while True:
            try:
                market_choice = int(input(f"Select market (1-{len(markets)}) [1]: ") or "1")
                if 1 <= market_choice <= len(markets):
                    inputs["target_market"] = markets[market_choice-1].lower().replace(" ", "_")
                    break
                print(f"Please select a valid number between 1 and {len(markets)}")
            except ValueError:
                print("Please enter a valid number")

        # Annual Revenue Range
        print("\nSelect annual revenue range:")
        revenue_ranges = [
            "Under $1M",
            "$1M - $10M",
            "$10M - $50M",
            "Over $50M"
        ]
        for i, range_ in enumerate(revenue_ranges, 1):
            print(f"{i}. {range_}")
        while True:
            try:
                revenue_choice = int(input(f"Select range (1-{len(revenue_ranges)}) [2]: ") or "2")
                if 1 <= revenue_choice <= len(revenue_ranges):
                    revenue_map = {1: "under_1m", 2: "1m_10m", 3: "10m_50m", 4: "over_50m"}
                    inputs["annual_revenue"] = revenue_map[revenue_choice]
                    break
                print(f"Please select a valid number between 1 and {len(revenue_ranges)}")
            except ValueError:
                print("Please enter a valid number")

    elif report_type == "competitor_tracking":
        # Competitor inputs
        print("\nEnter competitors (one per line, press Enter twice to finish):")
        competitors = []
        while True:
            competitor = input().strip()
            if not competitor:
                if competitors:
                    break
                print("Please enter at least one competitor.")
                continue
            competitors.append(competitor)
        inputs["competitors"] = competitors

        # Metrics selection
        print("\nSelect metrics to track (enter numbers separated by commas):")
        metrics = [
            "Market Share",
            "Product Features",
            "Pricing Strategy",
            "Marketing Channels",
            "Customer Satisfaction"
        ]
        for i, metric in enumerate(metrics, 1):
            print(f"{i}. {metric}")
        
        while True:
            try:
                selected = input("\nEnter metric numbers (e.g. 1,2,3): ").strip()
                if selected:
                    selected_indices = [int(x.strip()) for x in selected.split(",")]
                    if all(1 <= i <= len(metrics) for i in selected_indices):
                        inputs["metrics"] = [metrics[i-1] for i in selected_indices]
                        break
                print("Please enter valid numbers separated by commas")
            except ValueError:
                print("Please enter valid numbers")

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

    elif report_type == "gap_analysis":
        # Ensure all required fields are present
        inputs.update({
            "focus_areas": inputs.get("focus_areas", []),
            "timeframe": inputs.get("time_period", "2024"),
            "analysis_depth": inputs.get("analysis_depth", "detailed"),
            "market_region": inputs.get("market_region", "global")
        })

        if not inputs.get("focus_areas"):
            print("\nSelect focus areas (enter numbers separated by commas):")
            focus_areas = [
                "Market Size and Growth",
                "Industry Trends",
                "Market Segments",
                "Geographic Distribution",
                "Competitive Landscape"
            ]
            for i, area in enumerate(focus_areas, 1):
                print(f"{i}. {area}")
            
            while True:
                try:
                    selected = input("\nEnter focus area numbers (e.g. 1,2,3): ").strip()
                    if selected:
                        selected_indices = [int(x.strip()) for x in selected.split(",")]
                        if all(1 <= i <= len(focus_areas) for i in selected_indices):
                            inputs["focus_areas"] = [focus_areas[i-1] for i in selected_indices]
                            break
                    print("Please enter valid numbers separated by commas")
                except ValueError:
                    print("Please enter valid numbers")

            # Add analysis depth selection
            print("\nSelect analysis depth:")
            print("1. Basic")
            print("2. Detailed")
            print("3. Comprehensive")
            
            while True:
                try:
                    depth_choice = int(input("Select depth (1-3) [2]: ") or "2")
                    if 1 <= depth_choice <= 3:
                        depth_map = {1: "basic", 2: "detailed", 3: "comprehensive"}
                        inputs["analysis_depth"] = depth_map[depth_choice]
                        break
                    print("Please select a valid number between 1 and 3")
                except ValueError:
                    print("Please enter a valid number")

            # Add market region selection
            print("\nSelect target market region:")
            regions = [
                "Global",
                "North America",
                "Europe",
                "Asia Pacific"
            ]
            for i, region in enumerate(regions, 1):
                print(f"{i}. {region}")
            
            while True:
                try:
                    region_choice = int(input("\nSelect region (1-4) [1]: ") or "1")
                    if 1 <= region_choice <= len(regions):
                        inputs["market_region"] = regions[region_choice-1].lower().replace(" ", "_")
                        break
                    print(f"Please select a valid number between 1 and {len(regions)}")
                except ValueError:
                    print("Please enter a valid number")

            # Add timeframe input
            inputs["timeframe"] = inputs["time_period"]  # Use the common time_period as timeframe

    return inputs, report_type.lower().replace(' ', '_')

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