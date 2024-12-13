import os
import json
from pathlib import Path
from dotenv import load_dotenv

class ConfigManager:
    def __init__(self):
        load_dotenv()
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        self.serper_api_key = os.getenv('SERPER_API_KEY')
        self.flask_env = os.getenv('FLASK_ENV', 'development')
        self.config_path = Path(__file__).parent / "default_config.json"
        self.load_config()
        
    def load_config(self):
        """Load configuration from file"""
        if self.config_path.exists():
            with open(self.config_path, 'r') as f:
                self.config = json.load(f)
        else:
            self.config = self.get_default_config()
            self.save_config()
            
    def get_default_config(self):
        """Return default configuration"""
        return {
            "company_info": {
                "name": "100xEngineers",
                "industry": "Education Technology",
                "website": "https://www.100xengineers.com/",
                "social_media": [
                    "linkedin.com/company/100xengineers",
                    "@100xengineers",
                    "youtube.com/@100xengineers"
                ]
            },
            "analysis_config": {
                "report_type": "market_analysis",
                "time_period": "2024",
                "focus_areas": [1, 2]
            }
        }
        
    def save_config(self):
        """Save configuration to file"""
        with open(self.config_path, 'w') as f:
            json.dump(self.config, f, indent=4)
            
    def get_input_values(self):
        """Get input values from config"""
        return {
            "company_name": self.config["company_info"]["name"],
            "industry": self.config["company_info"]["industry"],
            "website": self.config["company_info"]["website"],
            "social_media": ",".join(self.config["company_info"]["social_media"]),
            "time_period": self.config["analysis_config"]["time_period"],
            "focus_areas": ",".join(map(str, self.config["analysis_config"]["focus_areas"])),
            "report_type": self.config["analysis_config"]["report_type"]
        }
        
    def update_config(self, new_values):
        """Update configuration with new values"""
        if "company_name" in new_values:
            self.config["company_info"]["name"] = new_values["company_name"]
        if "industry" in new_values:
            self.config["company_info"]["industry"] = new_values["industry"]
        if "website" in new_values:
            self.config["company_info"]["website"] = new_values["website"]
        if "social_media" in new_values:
            self.config["company_info"]["social_media"] = new_values["social_media"].split(",")
        if "time_period" in new_values:
            self.config["analysis_config"]["time_period"] = new_values["time_period"]
        if "focus_areas" in new_values:
            # Handle focus_areas as comma-separated string
            focus_areas_str = new_values["focus_areas"].strip()
            if focus_areas_str:
                # Split by comma and convert to integers, filtering out empty strings
                self.config["analysis_config"]["focus_areas"] = [
                    int(x.strip()) for x in focus_areas_str.split(",") if x.strip()
                ]
        if "report_type" in new_values:
            self.config["analysis_config"]["report_type"] = new_values["report_type"]
        
        self.save_config()
        
    def get_openai_api_key(self):
        return self.openai_api_key
        
    def get_serper_api_key(self):
        return self.serper_api_key
        
    def get_flask_env(self):
        return self.flask_env