
# Agent-Master Project

## Team: Cogent Agents

## Project Overview
The Agent-Master project is a Next.js application designed for market analysis and competitor tracking. It leverages AI capabilities to generate insights and reports based on user inputs and market data. The backend is built using Python, which handles data processing, API interactions, and logging.

---

## Project Structure
```
agent-master/
├── server/                        # Backend server files
│   ├── logs/                      # Directory for log files
│   ├── market_analysis_api.py     # API for market analysis
│   ├── market_analysis_crew.py    # Crew for executing market analysis tasks
│   ├── Walmart_vs_Flipkart_Competitor_Analysis_Report.md # Competitor analysis report
│   └── venv/                      # Virtual environment for Python dependencies
└── src/
    ├── app/
    │   ├── journey-mapping/       # Components for journey mapping
    │   └── page.js                # Main page of the Next.js app
```

---

## Technologies Used
- **Frontend Development**: Next.js
- **API Development**: Flask
- **AI Stack**:
  - Crew AI
  - Google Generative AI
  - Claude
  - OpenAI
  - Cursor AI

---

## Features
- **Market Analysis**: Users can input company details and receive a comprehensive market analysis report.
- **Competitor Tracking**: Insights into competitors like Walmart and Flipkart.
- **AI Integration**: Utilizes advanced AI tools to generate reports and insights.
- **Logging**: Robust logging for tracking events and debugging issues.

---

## Installation

### Prerequisites
- Node.js (v14 or later)
- Python (v3.11 or later)
- pip (Python package installer)

### Setup

#### Clone the Repository:
```bash
git clone <repository-url>
cd agent-master
```

#### Backend Setup:
1. Navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```
3. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

#### Frontend Setup:
1. Navigate to the `src` directory:
   ```bash
   cd src
   ```
2. Install the required Node.js packages:
   ```bash
   npm install
   ```

---

## Usage

### Running the Backend
1. Ensure you are in the `server` directory and the virtual environment is activated.
2. Start the backend server:
   ```bash
   python market_analysis_api.py
   ```

### Running the Frontend
1. Navigate to the `src` directory:
   ```bash
   cd src
   ```
2. Start the Next.js application:
   ```bash
   npm run dev
   ```
3. Open your browser and go to `http://localhost:3000` to access the application.

---

## Build for Production
1. Build the Next.js application:
   ```bash
   npm run build
   ```
2. Start the production server:
   ```bash
   npm start
   ```

---

## Logging
Logs for the market analysis can be found in the `server/logs/` directory. Each log file is timestamped for easy tracking of events and errors.

---

## Contributing
Contributions are welcome! Please fork the repository and submit a pull request for any enhancements or bug fixes.

---

## License
This project is licensed under the MIT License. See the `LICENSE` file for details.

---

## Contact
For inquiries or support, please contact the team at `solovpxoffical@gmail.com`.

