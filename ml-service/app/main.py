from fastapi import FastAPI, Depends, Security, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security.api_key import APIKeyHeader
import logging
import os

from app.routers import confidence, priority, panic, syllabus, prediction, pyq_assistant

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ExamEve ML Service",
    description="AI models for exam preparation optimization",
    version="1.0.0"
)

# Load CORS origins from environment
raw_origins = os.getenv("ALLOWED_ORIGINS", "")
if raw_origins:
    allowed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
else:
    allowed_origins = [
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
        os.getenv("BACKEND_URL", "http://localhost:4000"),
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY_NAME = "X-Internal-Token"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

async def verify_internal_token(x_internal_token: str = Security(api_key_header)):
    expected_token = os.getenv("ML_INTERNAL_TOKEN", "dev_internal_token")
    if not x_internal_token or x_internal_token != expected_token:
        raise HTTPException(
            status_code=403,
            detail="Access forbidden: Invalid or missing X-Internal-Token header"
        )

app.include_router(confidence.router, prefix="/api/ml", tags=["Confidence"], dependencies=[Depends(verify_internal_token)])
app.include_router(priority.router, prefix="/api/ml", tags=["Priority"], dependencies=[Depends(verify_internal_token)])
app.include_router(panic.router, prefix="/api/ml", tags=["Panic"], dependencies=[Depends(verify_internal_token)])
app.include_router(syllabus.router, prefix="/api/ml", tags=["Syllabus"], dependencies=[Depends(verify_internal_token)])
app.include_router(prediction.router, prefix="/api/ml", tags=["Prediction"], dependencies=[Depends(verify_internal_token)])
app.include_router(pyq_assistant.router, prefix="/api/ml", tags=["PYQ Assistant"], dependencies=[Depends(verify_internal_token)])

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "exameve-ml-service",
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    return {
        "message": "ExamEve ML Service API",
        "docs_url": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
