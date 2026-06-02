from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
from app.utils.model_registry import model_registry
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
    session_count_today: Optional[int] = None
    hours_since_break: Optional[float] = None
    days_until_exam: Optional[int] = None
    failed_quiz_streak: Optional[int] = None


class PanicResponse(BaseModel):
    panic_score: float
    panic_level: str
    intervention: str


def _get_intervention(panic_score: float, level: str) -> str:
    """Generate contextual intervention advice based on panic level."""
    if level == "low":
        return "You're doing great! Keep up your current pace."
    elif level == "moderate":
        return "Take a 5-minute break. Try the 4-7-8 breathing exercise before continuing."
    elif level == "high":
        return ("Crisis mode activated! Stop studying immediately. "
                "Do the 4-7-8 breathing exercise (3 cycles), take a 15-minute walk, "
                "then switch to an easier topic when you return.")
    else:
        return ("Emergency protocol: Step away from your desk completely. "
                "Do deep breathing for 5 minutes. Consider calling a friend or "
                "doing a grounding exercise. Your wellbeing matters more than any exam.")


@router.post("/detect-panic", response_model=PanicResponse)
async def detect_panic(request: PanicRequest):
    try:
        # Defaults for missing optional fields
        hrv = request.heart_rate_variability if request.heart_rate_variability is not None else 65.0
        focus = request.session_focus_score if request.session_focus_score is not None else 0.5
        quiz_drop = request.recent_quiz_drop if request.recent_quiz_drop is not None else 0.0
        stuck = request.time_spent_stuck_mins if request.time_spent_stuck_mins is not None else 0.0
        switching = request.rapid_topic_switching if request.rapid_topic_switching is not None else 0
        conf_drop = request.confidence_drop if request.confidence_drop is not None else 0.0
        sessions_today = request.session_count_today if request.session_count_today is not None else 1
        hours_break = request.hours_since_break if request.hours_since_break is not None else 1.0
        days_exam = request.days_until_exam if request.days_until_exam is not None else 14
        fail_streak = request.failed_quiz_streak if request.failed_quiz_streak is not None else 0

        features = np.array([[
            hrv, focus, quiz_drop, stuck, switching, conf_drop,
            sessions_today, hours_break, days_exam, fail_streak
        ]])

        model = model_registry.get_model("panic")
        if model is not None:
            panic_score = float(model.predict(features)[0])
        else:
            # Heuristic fallback matching the training formula
            signals = []
            if request.heart_rate_variability is not None:
                signals.append(max(0, 1.0 - request.heart_rate_variability / 100))
            if request.session_focus_score is not None:
                signals.append(1.0 - request.session_focus_score)
            if request.recent_quiz_drop is not None:
                signals.append(min(1.0, abs(min(request.recent_quiz_drop, 0)) / 50))
            if request.time_spent_stuck_mins is not None:
                signals.append(min(1.0, request.time_spent_stuck_mins / 40))
            if request.rapid_topic_switching is not None:
                signals.append(min(1.0, request.rapid_topic_switching / 10))
            if request.confidence_drop is not None:
                signals.append(min(1.0, abs(min(request.confidence_drop, 0))))

            panic_score = sum(signals) / max(len(signals), 1) if signals else 0.3

        panic_score = max(0.0, min(1.0, panic_score))

        # 4-tier panic classification
        if panic_score < 0.25:
            level = "low"
        elif panic_score < 0.5:
            level = "moderate"
        elif panic_score < 0.75:
            level = "high"
        else:
            level = "critical"

        intervention = _get_intervention(panic_score, level)

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
