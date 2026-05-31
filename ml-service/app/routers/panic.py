from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class PanicRequest(BaseModel):
    heart_rate_variability: Optional[float] = None
    session_focus_score: Optional[float] = None
    recent_quiz_drop: Optional[float] = None
    time_spent_stuck_mins: Optional[float] = None
    rapid_topic_switching: Optional[int] = None
    confidence_drop: Optional[float] = None


class PanicResponse(BaseModel):
    panic_score: float
    panic_level: str
    intervention: str


@router.post("/detect-panic", response_model=PanicResponse)
async def detect_panic(request: PanicRequest):
    try:
        features = []
        if request.heart_rate_variability is not None:
            features.append(max(0, 1.0 - request.heart_rate_variability / 100))
        if request.session_focus_score is not None:
            features.append(1.0 - request.session_focus_score)
        if request.recent_quiz_drop is not None:
            features.append(min(1.0, abs(request.recent_quiz_drop) / 100))
        if request.time_spent_stuck_mins is not None:
            features.append(min(1.0, request.time_spent_stuck_mins / 30))
        if request.rapid_topic_switching is not None:
            features.append(min(1.0, request.rapid_topic_switching / 10))
        if request.confidence_drop is not None:
            features.append(min(1.0, abs(request.confidence_drop)))

        if not features:
            panic_score = 0.3
        else:
            panic_score = min(1.0, sum(features) / len(features))

        if panic_score < 0.3:
            level = "low"
            intervention = "You're doing great! Keep up your current pace."
        elif panic_score < 0.6:
            level = "moderate"
            intervention = "Take a 5-minute break. Try deep breathing before continuing."
        else:
            level = "high"
            intervention = "Crisis mode activated! Take a 15-minute break, do breathing exercises, and try a simpler topic."

        return PanicResponse(
            panic_score=round(panic_score, 3),
            panic_level=level,
            intervention=intervention
        )

    except Exception as e:
        logger.error(f"Error detecting panic: {e}")
        raise HTTPException(status_code=500, detail="Error detecting panic")


@router.post("/batch-detect-panic")
async def batch_detect_panic(requests: List[PanicRequest]):
    results = []
    for req in requests:
        result = await detect_panic(req)
        results.append(result)
    return results
