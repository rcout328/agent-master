#!/bin/bash

# Activate virtual environment
source venv/bin/activate

# Install or update requirements
pip install -r requirements.txt

# Start the server
python server.py 