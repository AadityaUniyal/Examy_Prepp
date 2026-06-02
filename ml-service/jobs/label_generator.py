import os
import requests
import pandas as pd
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def generate_labels():
    backend_url = os.getenv("BACKEND_URL", "http://localhost:4000")
    internal_token = os.getenv("ML_INTERNAL_TOKEN", "dev_internal_token")
    
    url = f"{backend_url}/api/ml-telemetry"
    headers = {
        "X-Internal-Token": internal_token
    }
    
    logger.info(f"Fetching telemetry data from backend: {url}")
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        logger.info(f"Successfully retrieved {len(data)} telemetry records.")
        
        if not data:
            logger.warning("No labeled telemetry records found in the database. Generating mock record to avoid empty dataset.")
            # Fallback mock training record to allow training script tests to run
            data = [{
                "id": "mock-event-1",
                "userId": "mock-user",
                "topicId": "mock-topic",
                "confidenceBefore": 5.0,
                "confidenceAfter": 8.0,
                "sessionCompleted": True,
                "timeSpentMins": 120,
                "scheduledMins": 120,
                "energyRating": 4,
                "examScore": 85.0,
                "createdAt": "2026-06-01T00:00:00Z"
            }]
        
        # Convert to pandas DataFrame
        df = pd.DataFrame(data)
        
        # Ensure data folder exists
        os.makedirs("data", exist_ok=True)
        csv_path = "data/training_data.csv"
        
        # Save to CSV
        df.to_csv(csv_path, index=False)
        logger.info(f"Saved labeled dataset to {csv_path}")
        
    except Exception as e:
        logger.error(f"Failed to generate training labels: {e}")
        raise

if __name__ == "__main__":
    generate_labels()
