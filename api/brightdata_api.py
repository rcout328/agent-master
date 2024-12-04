from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import requests
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BRIGHTDATA_API_KEY = "55784713bbfc32152f470b5c6d053626c1cd49e124ea9d4aa461789632a0ee1b"

class KeywordRequest(BaseModel):
    keywords: List[str]

@app.post("/api/process-keywords")
async def process_keywords(request: KeywordRequest):
    try:
        logger.info(f"Processing keywords: {request.keywords}")
        
        # Format keywords for Brightdata
        keyword_payload = [{"keyword": k} for k in request.keywords]
        
        # Call Brightdata API
        response = requests.post(
            'https://api.brightdata.com/datasets/v3/trigger',
            headers={
                'Authorization': f'Bearer {BRIGHTDATA_API_KEY}',
                'Content-Type': 'application/json'
            },
            params={
                "dataset_id": "gd_l1vijqt9jfj7olije",
                "include_errors": "true",
                "type": "discover_new",
                "discover_by": "keyword"
            },
            json=keyword_payload
        )

        if not response.ok:
            logger.error(f"Brightdata API error: {response.status_code} - {response.text}")
            raise HTTPException(status_code=response.status_code, detail="Failed to process keywords")

        data = response.json()
        logger.info(f"Brightdata response: {data}")

        return {
            "success": True,
            "snapshot_id": data.get("snapshot_id"),
            "message": "Keywords processed successfully"
        }

    except Exception as e:
        logger.error(f"Error processing keywords: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5002)
