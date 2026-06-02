from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
from app.utils.model_registry import model_registry
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class TopicPriorityRequest(BaseModel):
    topic_id: str
    weightage: float
    confidence: float
    days_until_exam: int
    complexity: float
    estimated_hours: float
    # New ML features
    prerequisite_count: Optional[int] = None      # topics that depend on this
    times_revised: Optional[int] = None           # past revision count
    last_quiz_score: Optional[float] = None       # most recent quiz (0-1)
    topic_trend: Optional[float] = None           # improving or declining


class PriorityResponse(BaseModel):
    topic_id: str
    priority_score: float
    rank: int
    reason: str
    urgency_tag: str


@router.post("/prioritize-topics", response_model=List[PriorityResponse])
async def prioritize_topics(requests: List[TopicPriorityRequest]):
    try:
        scored = []

        model = model_registry.get_model("priority")
        if model is not None and len(requests) > 0:
            # Build feature matrix for batch prediction
            features = np.array([[
                req.weightage,
                req.confidence,
                req.days_until_exam,
                req.complexity,
                req.estimated_hours,
                req.prerequisite_count if req.prerequisite_count is not None else 0,
                req.times_revised if req.times_revised is not None else 0,
                req.last_quiz_score if req.last_quiz_score is not None else req.confidence,
                req.topic_trend if req.topic_trend is not None else 0.0
            ] for req in requests])

            predictions = model.predict(features)
            for idx, req in enumerate(requests):
                priority = float(predictions[idx])
                scored.append((priority, req))
        else:
            # Heuristic fallback
            for req in requests:
                urgency = req.weightage * (1.0 / max(req.days_until_exam, 1))
                confidence_gap = 1.0 - req.confidence
                complexity_factor = 1.0 + req.complexity
                priority = (urgency * 0.4 + confidence_gap * 0.35 + complexity_factor * 0.25)
                scored.append((priority, req))

        scored.sort(key=lambda x: x[0], reverse=True)

        results = []
        for rank, (score, req) in enumerate(scored, 1):
            # Generate contextual reason
            reason = _generate_reason(req, score)
            urgency_tag = _get_urgency_tag(score, req.days_until_exam)

            results.append(PriorityResponse(
                topic_id=req.topic_id,
                priority_score=round(score, 3),
                rank=rank,
                reason=reason,
                urgency_tag=urgency_tag
            ))

        return results

    except Exception as e:
        logger.error(f"Error prioritizing topics: {e}")
        raise HTTPException(status_code=500, detail="Error prioritizing topics")


def _generate_reason(req: TopicPriorityRequest, score: float) -> str:
    """Generate a human-readable reason for the priority ranking."""
    factors = []

    if req.weightage > 30:
        factors.append(f"high exam weightage ({req.weightage:.0f}%)")
    elif req.weightage < 10:
        factors.append(f"low exam weightage ({req.weightage:.0f}%)")

    if req.confidence < 0.3:
        factors.append("low confidence — needs significant study")
    elif req.confidence > 0.8:
        factors.append("high confidence — light review only")

    if req.days_until_exam <= 3:
        factors.append(f"exam in {req.days_until_exam} day(s)!")

    if req.complexity > 0.7:
        factors.append("complex topic requiring deep study")

    if req.prerequisite_count and req.prerequisite_count >= 3:
        factors.append(f"foundation topic ({req.prerequisite_count} topics depend on this)")

    if req.topic_trend and req.topic_trend < -0.2:
        factors.append("declining performance trend ⚠️")

    if not factors:
        factors.append(f"balanced priority (score: {score:.2f})")

    return "Ranked because: " + ", ".join(factors)


def _get_urgency_tag(score: float, days: int) -> str:
    """Assign an urgency tag for UI display."""
    if score > 0.75 or days <= 2:
        return "critical"
    elif score > 0.55:
        return "high"
    elif score > 0.35:
        return "medium"
    else:
        return "low"
