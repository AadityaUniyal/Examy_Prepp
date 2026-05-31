from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.routers import confidence, priority, panic, syllabus, prediction

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ExamEve ML Service",
    description="AI models for exam preparation optimization",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(confidence.router, prefix="/api/ml", tags=["Confidence"])
app.include_router(priority.router, prefix="/api/ml", tags=["Priority"])
app.include_router(panic.router, prefix="/api/ml", tags=["Panic"])
app.include_router(syllabus.router, prefix="/api/ml", tags=["Syllabus"])
app.include_router(prediction.router, prefix="/api/ml", tags=["Prediction"])

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
