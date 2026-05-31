from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class PredictionRequest(BaseModel):
    confidence_scores: List[float]
    quiz_scores: List[float]
    study_hours_completed: float
    total_study_hours_planned: float
    days_until_exam: int
    topic_count: int


class PredictionResponse(BaseModel):
    predicted_score: float
    confidence_interval_low: float
    confidence_interval_high: float
    reliability: str


@router.post("/predict-score", response_model=PredictionResponse)
async def predict_score(request: PredictionRequest):
    try:
        avg_confidence = np.mean(request.confidence_scores) if request.confidence_scores else 0.5
        avg_quiz = np.mean(request.quiz_scores) if request.quiz_scores else 0.5
        completion_ratio = request.study_hours_completed / max(request.total_study_hours_planned, 1)

        predicted = (avg_confidence * 0.3 + avg_quiz * 0.4 + completion_ratio * 0.3) * 100

        uncertainty = 0.15 * (1.0 - completion_ratio)
        low = max(0, predicted - uncertainty * 100)
        high = min(100, predicted + uncertainty * 100)

        if completion_ratio > 0.8:
            reliability = "high"
        elif completion_ratio > 0.5:
            reliability = "medium"
        else:
            reliability = "low"

        return PredictionResponse(
            predicted_score=round(predicted, 1),
            confidence_interval_low=round(low, 1),
            confidence_interval_high=round(high, 1),
            reliability=reliability
        )

    except Exception as e:
        logger.error(f"Error predicting score: {e}")
        raise HTTPException(status_code=500, detail="Error predicting score")
