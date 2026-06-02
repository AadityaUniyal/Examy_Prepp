from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
from app.utils.model_registry import model_registry
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class ConfidenceRequest(BaseModel):
    self_confidence: float         # 0-10 self-reported
    quiz_score: float              # 0-100 quiz percentage
    time_spent_mins: float         # minutes studying this topic
    days_since_revision: int       # days since last revision
    num_revisions: int             # total revision count
    topic_complexity: float        # 0-1 difficulty rating
    # New ML features
    avg_session_length: Optional[float] = None    # avg minutes per session
    streak_days: Optional[int] = None             # consecutive study days
    quiz_attempts: Optional[int] = None           # number of quiz tries
    improvement_rate: Optional[float] = None      # quiz score change trend


class ConfidenceResponse(BaseModel):
    self_confidence: float
    calibrated_confidence: float
    confidence_explanation: str
    calibration_gap: str


@router.post("/calibrate-confidence", response_model=ConfidenceResponse)
async def calibrate_confidence(request: ConfidenceRequest):
    try:
        self_conf_normalized = request.self_confidence / 10.0
        quiz_normalized = request.quiz_score / 100.0

        # Derive defaults for optional features
        avg_session = request.avg_session_length if request.avg_session_length is not None else 30.0
        streak = request.streak_days if request.streak_days is not None else 1
        attempts = request.quiz_attempts if request.quiz_attempts is not None else 1
        improvement = request.improvement_rate if request.improvement_rate is not None else 0.0

        features = np.array([[
            request.self_confidence,
            request.quiz_score,
            request.time_spent_mins,
            request.days_since_revision,
            request.num_revisions,
            request.topic_complexity,
            avg_session,
            streak,
            attempts,
            improvement
        ]])

        model = model_registry.get_model("confidence")
        if model is not None:
            calibrated = float(model.predict(features)[0])
        else:
            # Heuristic fallback
            calibrated = (self_conf_normalized * 0.4 + quiz_normalized * 0.4 +
                         (1.0 - request.topic_complexity) * 0.1 +
                         min(request.num_revisions, 5) / 5.0 * 0.1)

        calibrated = max(0.0, min(1.0, calibrated))

        # Gap analysis
        gap = calibrated - self_conf_normalized
        if gap > 0.2:
            explanation = (
                "Great news! Your actual understanding is significantly better "
                "than you think. Trust your preparation more — you know more than "
                "you give yourself credit for."
            )
            calibration_gap = "underconfident"
        elif gap > 0.05:
            explanation = (
                "Good news! Your actual understanding is slightly better than "
                "you think. You're in a solid position."
            )
            calibration_gap = "slightly_underconfident"
        elif gap > -0.1:
            explanation = (
                "Your self-assessment is well-calibrated. Your confidence "
                "accurately reflects your understanding. Keep it up!"
            )
            calibration_gap = "well_calibrated"
        elif gap > -0.25:
            explanation = (
                "You might be slightly overestimating this topic. Consider "
                "taking a practice quiz to verify your understanding."
            )
            calibration_gap = "slightly_overconfident"
        else:
            explanation = (
                "⚠️ Significant overconfidence detected. Your quiz scores "
                "suggest gaps in understanding. We strongly recommend additional "
                "revision and practice problems before the exam."
            )
            calibration_gap = "overconfident"

        return ConfidenceResponse(
            self_confidence=round(self_conf_normalized, 3),
            calibrated_confidence=round(calibrated, 3),
            confidence_explanation=explanation,
            calibration_gap=calibration_gap
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
