from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from datetime import datetime
from firecrawl import FirecrawlApp
import json
import os
import time
from googlesearch import search
import google.generativeai as genai
from urllib.parse import quote
import requests

# Setup logging with more detailed format
logging.basicConfig(
    level=logging.DEBUG,  # Changed to DEBUG for more detail
    format='%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
    handlers=[
        logging.FileHandler('feedback_analysis.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize APIs
FIRECRAWL_API_KEY = "fc-5fadfeae30314d4ea8a3d9afaa75c493"
firecrawl_app = FirecrawlApp(api_key=FIRECRAWL_API_KEY)

GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY', '')
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
    logging.info("Gemini initialized successfully with API key")
else:
    logging.critical("No Gemini API key found - analysis functionality will be limited")

# Add Google Custom Search configuration
GOOGLE_CSE_API_KEY = "AIzaSyAxeLlJ6vZxOl-TblUJg_dInBS3vNxaFVY"
GOOGLE_CSE_ID = "37793b12975da4e35"

class FeedbackAnalyzer:
    def __init__(self, query, platforms=None):
        self.query = query
        self.search_platforms = platforms if platforms else ["google reviews"]
        self.feedback_data = []
        logger.debug(f"FeedbackAnalyzer initialized with query: {query} and platforms: {platforms}")
        
    def perform_custom_search(self, search_query):
        """Use Google Custom Search API as fallback"""
        try:
            encoded_query = quote(search_query)
            url = f"https://www.googleapis.com/customsearch/v1?key={GOOGLE_CSE_API_KEY}&cx={GOOGLE_CSE_ID}&q={encoded_query}&num=5"
            
            response = requests.get(url)
            if response.status_code == 200:
                results = response.json().get('items', [])
                return [item['link'] for item in results]
            else:
                logger.error(f"Custom search API error: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Custom search error: {str(e)}")
            return []

    def get_search_results(self, query, use_custom_search=False):
        """Get search results with fallback"""
        try:
            if not use_custom_search:
                try:
                    return list(search(query, num_results=5))
                except Exception as e:
                    if "429" in str(e):
                        logger.warning("Rate limit hit, falling back to Custom Search API")
                        return self.perform_custom_search(query)
                    raise e
            else:
                return self.perform_custom_search(query)
                
        except Exception as e:
            logger.error(f"Search error: {str(e)}")
            return []

    def collect_feedback(self):
        """Collect feedback with improved error handling"""
        logger.info(f"Starting feedback collection for: {self.query}")
        logger.info(f"Using platforms: {self.search_platforms}")
        
        use_custom_search = False
        
        for platform in self.search_platforms:
            search_query = f"{self.query} {platform}"
            try:
                logger.info(f"Searching: {search_query}")
                
                # Get search results with fallback
                search_results = self.get_search_results(search_query, use_custom_search)
                
                if not search_results and not use_custom_search:
                    # If regular search fails, try custom search
                    use_custom_search = True
                    search_results = self.get_search_results(search_query, use_custom_search)
                
                for url in search_results:
                    try:
                        content = self.scrape_content(url)
                        if content:
                            self.feedback_data.append(content)
                            logger.debug(f"Added content from {url}")
                            if len(self.feedback_data) >= 10:  # Reduced from 20
                                logger.info("Reached maximum feedback items (10)")
                                return len(self.feedback_data)
                    except Exception as e:
                        logger.error(f"Error scraping {url}: {str(e)}")
                
                time.sleep(2)  # Add delay between searches
                
            except Exception as e:
                logger.error(f"Search error for {platform}: {str(e)}")
                if "429" in str(e) and not use_custom_search:
                    use_custom_search = True
                    logger.info("Switching to Custom Search API")
                continue
                
        logger.info(f"Collected {len(self.feedback_data)} total feedback items")
        return len(self.feedback_data)

    def scrape_content(self, url):
        """Scrape content using Firecrawl"""
        try:
            logger.info(f"Scraping: {url}")
            logger.debug(f"Sending request to Firecrawl with params: {{'formats': ['markdown']}}")
            
            content = firecrawl_app.scrape_url(
                url=url,
                params={'formats': ['markdown']}
            )
            
            logger.debug(f"Received response from Firecrawl: {json.dumps(content, indent=2)}")
            
            if content and content.get('markdown'):
                result = {
                    'url': url,
                    'source': url.split('/')[2],
                    'content': content['markdown'][:1500],
                    'date': datetime.now().strftime("%Y-%m-%d")
                }
                logger.debug(f"Processed content: {json.dumps(result, indent=2)}")
                return result
        except Exception as e:
            logger.error(f"Scraping error: {str(e)}", exc_info=True)
        return None

    def analyze_feedback(self):
        """Analyze collected feedback using Gemini"""
        try:
            logger.info("\n" + "="*50)
            logger.info(f"Starting Gemini Analysis for: {self.query}")
            logger.info("="*50)

            # Summarize feedback data
            summarized_feedback = self.summarize_feedback_data()
            logger.debug(f"Summarized feedback: {json.dumps(summarized_feedback, indent=2)}")
            
            # Extract key content for analysis
            feedback_content = []
            for item in summarized_feedback:
                feedback_content.append({
                    'text': item['content'],
                    'source': item['source'],
                    'date': item['date']
                })

            analysis_prompt = f"""
            Analyze this customer feedback data for {self.query} in detail:

            Feedback Data:
            {json.dumps(feedback_content, indent=2)}

            Provide a comprehensive analysis focusing on:
            1. Sentiment distribution with specific examples
            2. Key themes and patterns from the feedback
            3. Common pain points mentioned
            4. Competitive insights mentioned
            5. Clear recommendations based on feedback

            Return the analysis in this exact JSON format:
            {{
                "sentiment_analysis": {{
                    "distribution": {{
                        "positive": <number>,
                        "negative": <number>,
                        "neutral": <number>
                    }},
                    "key_drivers": [
                        "Example: Product quality mentioned positively 15 times",
                        "Example: Delivery issues mentioned negatively 8 times"
                    ],
                    "trends": [
                        "Example: Increasing satisfaction with customer service",
                        "Example: Growing concerns about pricing"
                    ]
                }},
                "key_themes": [
                    {{
                        "theme": "Example: Product Quality",
                        "mentions": <number>,
                        "sentiment": "positive/negative/neutral",
                        "description": "Detailed description with examples from feedback"
                    }}
                ],
                "pain_points": [
                    {{
                        "issue": "Example: Delivery Delays",
                        "severity": "high/medium/low",
                        "frequency": <number>,
                        "description": "Detailed description with specific examples"
                    }}
                ],
                "competitive_analysis": {{
                    "market_position": "strong/moderate/weak",
                    "advantages": [
                        "Example: Better prices than competitor X",
                        "Example: More features than competitor Y"
                    ],
                    "disadvantages": [
                        "Example: Slower delivery than competitor Z"
                    ]
                }},
                "recommendations": [
                    {{
                        "title": "Example: Improve Delivery Speed",
                        "priority": "high/medium/low",
                        "description": "Detailed recommendation based on feedback",
                        "expected_impact": "Quantified impact prediction"
                    }}
                ]
            }}

            Extract real examples from the provided feedback and include specific numbers and details.
            """

            logger.info("\nSending prompt to Gemini...")
            logger.debug(f"Full prompt being sent to Gemini: {analysis_prompt}")
            logger.info(f"Prompt length: {len(analysis_prompt)} characters")
            
            # Process in chunks if needed
            if len(analysis_prompt) > 10000:
                logger.info("Prompt exceeds 10000 characters, splitting into chunks")
                return self.split_and_analyze(summarized_feedback)
            
            logger.debug("Sending request to Gemini model...")
            response = model.generate_content(analysis_prompt)
            
            if not response:
                logger.error("Received empty response from Gemini")
                raise Exception("Empty response from Gemini")

            logger.info("\nReceived response from Gemini")
            logger.debug(f"Raw Gemini response: {response.text}")
            logger.info(f"Response length: {len(response.text)} characters")

            # Parse and clean the response
            analysis_text = response.text.strip()
            if '```json' in analysis_text:
                logger.debug("Detected JSON code block, extracting content")
                analysis_text = analysis_text.split('```json')[1].split('```')[0].strip()
            
            # Clean and parse JSON
            analysis_text = analysis_text.replace('%', '')
            logger.debug(f"Cleaned JSON text: {analysis_text}")
            
            analysis = json.loads(analysis_text)
            logger.debug(f"Parsed analysis: {json.dumps(analysis, indent=2)}")

            # Validate and enhance the analysis
            analysis = self.enhance_analysis(analysis, feedback_content)
            logger.debug(f"Enhanced analysis: {json.dumps(analysis, indent=2)}")

            return analysis

        except Exception as e:
            logger.error(f"\nAnalysis error: {str(e)}", exc_info=True)
            return None

    def enhance_analysis(self, analysis, feedback_content):
        """Enhance analysis with additional insights"""
        try:
            logger.info("Starting analysis enhancement")
            
            # Ensure all sections exist
            if 'sentiment_analysis' not in analysis:
                logger.debug("Adding missing sentiment_analysis section")
                analysis['sentiment_analysis'] = {
                    'distribution': {'positive': 0, 'negative': 0, 'neutral': 0},
                    'key_drivers': [],
                    'trends': []
                }

            # Always calculate sentiment distribution
            logger.info("Calculating sentiment distribution")
            sentiments = self.calculate_sentiments(feedback_content)
            analysis['sentiment_analysis']['distribution'] = sentiments
            logger.debug(f"Updated sentiment distribution: {json.dumps(sentiments, indent=2)}")

            # Add themes if missing
            if not analysis.get('key_themes'):
                logger.debug("Adding missing key_themes")
                analysis['key_themes'] = self.extract_key_themes(feedback_content)

            # Add pain points if missing
            if not analysis.get('pain_points'):
                logger.debug("Adding missing pain_points")
                analysis['pain_points'] = self.extract_pain_points(feedback_content)

            # Log the final distribution
            logger.info("Final Sentiment Distribution:")
            logger.info(json.dumps(analysis['sentiment_analysis']['distribution'], indent=2))

            return analysis

        except Exception as e:
            logger.error(f"Error enhancing analysis: {str(e)}", exc_info=True)
            return analysis

    def calculate_sentiments(self, feedback_content):
        """Calculate sentiment distribution from feedback"""
        try:
            positive = negative = neutral = 0
            total_reviews = len(feedback_content)
            
            logger.info(f"Calculating sentiments for {total_reviews} reviews")
            
            if total_reviews == 0:
                logger.warning("No reviews to analyze, returning default neutral sentiment")
                return {
                    'positive': 0,
                    'negative': 0,
                    'neutral': 100  # Default to neutral if no reviews
                }
            
            # Calculate sentiment for each review
            for item in feedback_content:
                text = item['text'].lower()
                logger.debug(f"Analyzing sentiment for text: {text[:100]}...")
                
                # Enhanced sentiment detection
                positive_words = ['great', 'excellent', 'good', 'amazing', 'love', 'best', 'awesome', 'fantastic']
                negative_words = ['bad', 'poor', 'terrible', 'hate', 'awful', 'worst', 'horrible', 'disappointed']
                
                pos_count = sum(word in text for word in positive_words)
                neg_count = sum(word in text for word in negative_words)
                
                logger.debug(f"Positive words: {pos_count}, Negative words: {neg_count}")
                
                if pos_count > neg_count:
                    positive += 1
                elif neg_count > pos_count:
                    negative += 1
                else:
                    neutral += 1
            
            # Calculate percentages ensuring they add up to 100%
            total = positive + negative + neutral
            if total > 0:
                positive_pct = round((positive / total) * 100)
                negative_pct = round((negative / total) * 100)
                # Ensure total is 100% by adjusting neutral
                neutral_pct = 100 - positive_pct - negative_pct
            else:
                positive_pct = negative_pct = 0
                neutral_pct = 100
                
            logger.info(f"Sentiment Distribution - Positive: {positive_pct}%, Negative: {negative_pct}%, Neutral: {neutral_pct}%")
            logger.debug(f"Raw counts - Positive: {positive}, Negative: {negative}, Neutral: {neutral}")
            
            return {
                'positive': positive_pct,
                'negative': negative_pct,
                'neutral': neutral_pct
            }
            
        except Exception as e:
            logger.error(f"Error calculating sentiments: {str(e)}", exc_info=True)
            return {
                'positive': 0,
                'negative': 0,
                'neutral': 100  # Default to neutral on error
            }

    def extract_key_themes(self, feedback_content):
        """Extract key themes from feedback"""
        logger.info("Starting key theme extraction")
        themes = {}
        for item in feedback_content:
            text = item['text'].lower()
            logger.debug(f"Analyzing text for themes: {text[:100]}...")
            # Add your theme detection logic here
            for theme in ['quality', 'price', 'service', 'delivery', 'support']:
                if theme in text:
                    if theme not in themes:
                        themes[theme] = {
                            'count': 0,
                            'sentiment': 'neutral',
                            'examples': []
                        }
                    themes[theme]['count'] += 1
                    themes[theme]['examples'].append(text[:100])
                    logger.debug(f"Found theme '{theme}' in text")

        result = [
            {
                'theme': theme.title(),
                'mentions': data['count'],
                'sentiment': data['sentiment'],
                'description': f"Mentioned in {data['count']} reviews. Example: {data['examples'][0]}"
            }
            for theme, data in themes.items()
            if data['count'] > 0
        ]
        
        logger.debug(f"Extracted themes: {json.dumps(result, indent=2)}")
        return result

    def extract_pain_points(self, feedback_content):
        """Extract pain points from feedback"""
        logger.info("Starting pain point extraction")
        pain_points = {}
        negative_indicators = ['issue', 'problem', 'bad', 'poor', 'slow', 'delay', 'expensive']
        
        for item in feedback_content:
            text = item['text'].lower()
            logger.debug(f"Analyzing text for pain points: {text[:100]}...")
            for indicator in negative_indicators:
                if indicator in text:
                    if indicator not in pain_points:
                        pain_points[indicator] = {
                            'count': 0,
                            'examples': []
                        }
                    pain_points[indicator]['count'] += 1
                    pain_points[indicator]['examples'].append(text[:100])
                    logger.debug(f"Found pain point '{indicator}' in text")

        result = [
            {
                'issue': issue.title(),
                'severity': 'high' if data['count'] > 5 else 'medium' if data['count'] > 2 else 'low',
                'frequency': data['count'],
                'description': f"Mentioned {data['count']} times. Example: {data['examples'][0]}"
            }
            for issue, data in pain_points.items()
            if data['count'] > 0
        ]
        
        logger.debug(f"Extracted pain points: {json.dumps(result, indent=2)}")
        return result

    def summarize_feedback_data(self):
        """Summarize feedback data to reduce size"""
        try:
            logger.info("Starting feedback data summarization")
            summarized = []
            
            for item in self.feedback_data:
                # Take first 500 characters of content
                content = item['content'][:500]
                summarized.append({
                    'source': item['source'],
                    'content': content,
                    'date': item['date']
                })
                logger.debug(f"Summarized content from {item['source']}: {content[:100]}...")
            
            logger.info(f"Summarized {len(self.feedback_data)} feedback items")
            return summarized
            
        except Exception as e:
            logger.error(f"Error summarizing feedback: {str(e)}", exc_info=True)
            return self.feedback_data[:5]  # Return first 5 items as fallback

    def split_and_analyze(self, feedback_data):
        """Split analysis into chunks for large datasets"""
        try:
            logger.info("Starting split analysis process")
            
            # Split feedback into chunks of 5
            chunks = [feedback_data[i:i+5] for i in range(0, len(feedback_data), 5)]
            logger.debug(f"Split data into {len(chunks)} chunks")
            
            all_analyses = []
            for i, chunk in enumerate(chunks):
                logger.info(f"Analyzing chunk {i+1}/{len(chunks)}...")
                logger.debug(f"Chunk {i+1} content: {json.dumps(chunk, indent=2)}")
                
                chunk_prompt = f"""
                Analyze this chunk of customer feedback data for {self.query} (Part {i+1}/{len(chunks)}):

                {json.dumps(chunk, indent=2)}

                Provide analysis in the same JSON format as before.
                """
                
                logger.debug(f"Sending chunk {i+1} to Gemini")
                response = model.generate_content(chunk_prompt)
                if response and response.text:
                    try:
                        logger.debug(f"Received response for chunk {i+1}: {response.text}")
                        analysis = self.parse_json_response(response.text)
                        if analysis:
                            all_analyses.append(analysis)
                            logger.debug(f"Successfully parsed analysis for chunk {i+1}")
                    except Exception as e:
                        logger.error(f"Error parsing chunk {i+1}: {str(e)}", exc_info=True)
                    
            # Merge analyses
            return self.merge_analyses(all_analyses)
            
        except Exception as e:
            logger.error(f"Error in split analysis: {str(e)}", exc_info=True)
            return None

    def merge_analyses(self, analyses):
        """Merge multiple analyses into one"""
        try:
            logger.info(f"Starting merge of {len(analyses)} analyses")
            
            merged = {
                "sentiment_analysis": {
                    "distribution": {
                        "positive": 0,
                        "negative": 0,
                        "neutral": 0
                    },
                    "key_drivers": [],
                    "trends": []
                },
                "key_themes": [],
                "pain_points": [],
                "competitive_analysis": {
                    "market_position": "",
                    "advantages": [],
                    "disadvantages": []
                },
                "recommendations": []
            }
            
            # Combine all analyses
            for i, analysis in enumerate(analyses):
                logger.debug(f"Merging analysis {i+1}")
                if not analysis:
                    logger.warning(f"Skipping empty analysis {i+1}")
                    continue
                    
                # Merge sentiment distributions
                for sentiment in ["positive", "negative", "neutral"]:
                    value = analysis.get("sentiment_analysis", {}).get("distribution", {}).get(sentiment, 0)
                    merged["sentiment_analysis"]["distribution"][sentiment] += value
                    logger.debug(f"Added {value} to {sentiment} sentiment")
                
                # Merge lists
                merged["sentiment_analysis"]["key_drivers"].extend(
                    analysis.get("sentiment_analysis", {}).get("key_drivers", []))
                merged["sentiment_analysis"]["trends"].extend(
                    analysis.get("sentiment_analysis", {}).get("trends", []))
                merged["key_themes"].extend(analysis.get("key_themes", []))
                merged["pain_points"].extend(analysis.get("pain_points", []))
                merged["recommendations"].extend(analysis.get("recommendations", []))
                
                # Merge competitive analysis
                comp_analysis = analysis.get("competitive_analysis", {})
                merged["competitive_analysis"]["advantages"].extend(comp_analysis.get("advantages", []))
                merged["competitive_analysis"]["disadvantages"].extend(comp_analysis.get("disadvantages", []))
            
            # Remove duplicates and normalize
            merged = self.normalize_merged_analysis(merged)
            
            logger.info("Successfully merged analyses")
            logger.debug(f"Final merged analysis: {json.dumps(merged, indent=2)}")
            return merged
            
        except Exception as e:
            logger.error(f"Error merging analyses: {str(e)}", exc_info=True)
            return analyses[0] if analyses else None

    def normalize_merged_analysis(self, merged):
        """Normalize the merged analysis"""
        try:
            logger.info("Starting normalization of merged analysis")
            
            # Remove duplicates from lists
            for key in ["key_drivers", "trends"]:
                original_count = len(merged["sentiment_analysis"][key])
                merged["sentiment_analysis"][key] = list(set(merged["sentiment_analysis"][key]))
                logger.debug(f"Removed {original_count - len(merged['sentiment_analysis'][key])} duplicates from {key}")
            
            # Normalize sentiment distribution to percentages
            total = sum(merged["sentiment_analysis"]["distribution"].values())
            if total > 0:
                for sentiment in merged["sentiment_analysis"]["distribution"]:
                    value = merged["sentiment_analysis"]["distribution"][sentiment]
                    normalized = int((value / total) * 100)
                    merged["sentiment_analysis"]["distribution"][sentiment] = normalized
                    logger.debug(f"Normalized {sentiment} sentiment from {value} to {normalized}")
            
            # Remove duplicate themes and points
            merged["key_themes"] = self.deduplicate_by_key(merged["key_themes"], "theme")
            merged["pain_points"] = self.deduplicate_by_key(merged["pain_points"], "issue")
            merged["recommendations"] = self.deduplicate_by_key(merged["recommendations"], "title")
            
            logger.debug(f"Normalized analysis: {json.dumps(merged, indent=2)}")
            return merged
            
        except Exception as e:
            logger.error(f"Error normalizing analysis: {str(e)}", exc_info=True)
            return merged

    def deduplicate_by_key(self, items, key):
        """Remove duplicates from a list of dictionaries based on a key"""
        try:
            logger.debug(f"Deduplicating items by key: {key}")
            logger.debug(f"Original items: {len(items)}")
            
            seen = set()
            deduped = []
            for item in items:
                if item.get(key) not in seen:
                    seen.add(item.get(key))
                    deduped.append(item)
            
            logger.debug(f"Deduplicated items: {len(deduped)}")
            return deduped
            
        except Exception as e:
            logger.error(f"Error deduplicating by key: {str(e)}", exc_info=True)
            return items

    def save_report(self, analysis):
        """Save analysis report"""
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            logger.info(f"Saving report with timestamp: {timestamp}")
            
            # Save detailed report
            report_path = f'feedback_logs/feedback_analysis_{timestamp}.txt'
            os.makedirs('feedback_logs', exist_ok=True)
            
            logger.debug(f"Writing report to: {report_path}")
            with open(report_path, 'w', encoding='utf-8') as f:
                f.write(f"Feedback Analysis Report: {self.query}\n")
                f.write(f"{'='*50}\n\n")
                f.write(f"Generated: {timestamp}\n")
                f.write(f"Sources Analyzed: {len(self.feedback_data)}\n\n")
                
                f.write("Analysis Results:\n")
                f.write(f"{'-'*30}\n")
                json.dump(analysis, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Report saved successfully: {report_path}")
            return report_path
            
        except Exception as e:
            logger.error(f"Error saving report: {str(e)}", exc_info=True)
            return None

def process_feedback_validation(query, platforms=None):
    """Process feedback validation request"""
    try:
        logger.info(f"Starting feedback validation for query: {query}")
        logger.debug(f"Platforms specified: {platforms}")
        
        if not query:
            logger.error("No query provided")
            return {'error': 'No query provided'}, 400

        # Initialize analyzer with platforms
        analyzer = FeedbackAnalyzer(query, platforms)
        
        # Collect feedback
        feedback_count = analyzer.collect_feedback()
        logger.info(f"Collected {feedback_count} feedback items")
        
        if feedback_count == 0:
            logger.error("No feedback data collected")
            return {'error': 'No feedback data collected'}, 404

        # Analyze feedback
        logger.info("Starting feedback analysis")
        analysis = analyzer.analyze_feedback()
        if not analysis:
            logger.error("Analysis failed")
            return {'error': 'Analysis failed'}, 500

        # Save report
        report_path = analyzer.save_report(analysis)
        logger.info("Analysis complete and report saved")

        result = {
            'query': query,
            'timestamp': datetime.now().isoformat(),
            'feedback_count': feedback_count,
            'analysis': analysis,
            'report_path': report_path,
            'feedback_data': analyzer.feedback_data
        }
        logger.debug(f"Final result: {json.dumps(result, indent=2)}")
        return result

    except Exception as e:
        logger.error(f"Validation error: {str(e)}", exc_info=True)
        return {'error': str(e)}, 500 

__all__ = ['FeedbackAnalyzer', 'process_feedback_validation'] 