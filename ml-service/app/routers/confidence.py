from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import numpy as np
import xgboost as xgb
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class ConfidenceRequest(BaseModel):
    self_confidence: float
    quiz_score: float
    time_spent_mins: float
    days_since_revision: int
    num_revisions: int
    topic_complexity: float


class ConfidenceResponse(BaseModel):
    self_confidence: float
    calibrated_confidence: float
    confidence_explanation: str


try:
    model = xgb.XGBRegressor()
    model.load_model('app/models/confidence_model.json')
    logger.info("Loaded confidence model")
except:
    logger.warning("Confidence model not found, using baseline")
    model = None


@router.post("/calibrate-confidence", response_model=ConfidenceResponse)
async def calibrate_confidence(request: ConfidenceRequest):
    try:
        self_conf_normalized = request.self_confidence / 10.0
        quiz_normalized = request.quiz_score / 100.0

        features = np.array([[
            request.self_confidence,
            request.quiz_score,
            request.time_spent_mins,
            request.days_since_revision,
            request.num_revisions,
            request.topic_complexity
        ]])

        if model is not None:
            calibrated = float(model.predict(features)[0])
        else:
            calibrated = (self_conf_normalized * 0.7 + quiz_normalized * 0.3)

        calibrated = max(0.0, min(1.0, calibrated))

        if calibrated > self_conf_normalized:
            explanation = "Good news! Your actual understanding is better than you think."
        elif calibrated < self_conf_normalized - 0.2:
            explanation = "You might be overestimating this topic. Let's practice more."
        else:
            explanation = "Your self-assessment is pretty accurate. Keep up the work!"

        return ConfidenceResponse(
            self_confidence=self_conf_normalized,
            calibrated_confidence=calibrated,
            confidence_explanation=explanation
        )

    except Exception as e:
        logger.error(f"Error calibrating confidence: {e}")
        raise HTTPException(status_code=500, detail="Error calibrating confidence")


@router.post("/batch-calibrate")
async def batch_calibrate(requests: List[ConfidenceRequest]):
    results = []
    for req in requests:
        result = await calibrate_confidence(req)
        results.append(result)
    return results
