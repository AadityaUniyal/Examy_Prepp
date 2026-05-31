from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import numpy as np
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


class PriorityResponse(BaseModel):
    topic_id: str
    priority_score: float
    rank: int
    reason: str


@router.post("/prioritize-topics", response_model=List[PriorityResponse])
async def prioritize_topics(requests: List[TopicPriorityRequest]):
    try:
        scored = []
        for req in requests:
            urgency = req.weightage * (1.0 / max(req.days_until_exam, 1))
            confidence_gap = 1.0 - req.confidence
            complexity_factor = 1.0 + req.complexity
            priority = (urgency * 0.4 + confidence_gap * 0.35 + complexity_factor * 0.25)

            scored.append((priority, req))

        scored.sort(key=lambda x: x[0], reverse=True)

        results = []
        for rank, (score, req) in enumerate(scored, 1):
            reason = f"High weightage ({req.weightage}%) and low confidence ({req.confidence:.0%})"
            results.append(PriorityResponse(
                topic_id=req.topic_id,
                priority_score=round(score, 3),
                rank=rank,
                reason=reason
            ))

        return results

    except Exception as e:
        logger.error(f"Error prioritizing topics: {e}")
        raise HTTPException(status_code=500, detail="Error prioritizing topics")
