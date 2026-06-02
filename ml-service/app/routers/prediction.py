from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
from app.utils.model_registry import model_registry
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
    # New ML features
    study_consistency: Optional[float] = None       # 0-1 regularity
    panic_avg: Optional[float] = None               # average panic score
    topics_mastered_pct: Optional[float] = None     # % topics above 0.7 confidence
    revision_cycles: Optional[int] = None            # full syllabus passes
    practice_test_score: Optional[float] = None      # mock exam score (0-1)


class PredictionResponse(BaseModel):
    predicted_score: float
    confidence_interval_low: float
    confidence_interval_high: float
    reliability: str
    insights: List[str]


@router.post("/predict-score", response_model=PredictionResponse)
async def predict_score(request: PredictionRequest):
    try:
        avg_confidence = float(np.mean(request.confidence_scores)) if request.confidence_scores else 0.5
        avg_quiz = float(np.mean(request.quiz_scores)) if request.quiz_scores else 0.5
        completion_ratio = request.study_hours_completed / max(request.total_study_hours_planned, 1)

        # Derive defaults for optional features
        consistency = request.study_consistency if request.study_consistency is not None else 0.5
        panic = request.panic_avg if request.panic_avg is not None else 0.3
        mastered = request.topics_mastered_pct if request.topics_mastered_pct is not None else avg_confidence
        revisions = request.revision_cycles if request.revision_cycles is not None else 1
        practice = request.practice_test_score if request.practice_test_score is not None else avg_quiz

        model = model_registry.get_model("prediction")
        if model is not None:
            features = np.array([[
                avg_confidence,
                avg_quiz,
                request.study_hours_completed,
                request.total_study_hours_planned,
                request.days_until_exam,
                request.topic_count,
                consistency,
                panic,
                mastered,
                revisions,
                practice
            ]])

            predicted_norm = float(model.predict(features)[0])
            predicted = max(0.0, min(100.0, predicted_norm * 100))
        else:
            # Heuristic fallback
            predicted = (avg_confidence * 0.3 + avg_quiz * 0.4 + completion_ratio * 0.3) * 100

        # Confidence interval based on data completeness
        data_richness = sum([
            1 if request.study_consistency is not None else 0,
            1 if request.panic_avg is not None else 0,
            1 if request.topics_mastered_pct is not None else 0,
            1 if request.revision_cycles is not None else 0,
            1 if request.practice_test_score is not None else 0,
        ]) / 5.0

        # More data = tighter interval
        base_uncertainty = 15.0 * (1.0 - data_richness * 0.5) * (1.0 - completion_ratio * 0.3)
        low = max(0, predicted - base_uncertainty)
        high = min(100, predicted + base_uncertainty)

        # Reliability assessment
        if completion_ratio > 0.8 and data_richness > 0.6:
            reliability = "high"
        elif completion_ratio > 0.5 or data_richness > 0.4:
            reliability = "medium"
        else:
            reliability = "low"

        # Generate actionable insights
        insights = _generate_insights(
            predicted, avg_confidence, avg_quiz, completion_ratio,
            consistency, panic, mastered, revisions, practice,
            request.days_until_exam, request.topic_count
        )

        return PredictionResponse(
            predicted_score=round(predicted, 1),
            confidence_interval_low=round(low, 1),
            confidence_interval_high=round(high, 1),
            reliability=reliability,
            insights=insights
        )

    except Exception as e:
        logger.error(f"Error predicting score: {e}")
        raise HTTPException(status_code=500, detail="Error predicting score")


def _generate_insights(predicted, confidence, quiz, completion,
                       consistency, panic, mastered, revisions, practice,
                       days_left, topic_count) -> List[str]:
    """Generate actionable insights based on prediction inputs."""
    insights = []

    # Panic impact
    if panic > 0.6:
        insights.append(
            "⚠️ High anxiety levels detected. Consider breathing exercises — "
            "anxiety can reduce actual exam scores by 10-15%."
        )

    # Consistency
    if consistency < 0.3:
        insights.append(
            "📅 Irregular study pattern detected. Daily consistent study of even "
            "30 minutes is more effective than weekend cramming sessions."
        )

    # Low completion
    if completion < 0.5 and days_left < 7:
        insights.append(
            "🚨 Less than 50% of your planned study is complete with the exam "
            "approaching. Focus on high-weight topics only."
        )

    # Topic mastery breadth
    if mastered < 0.4 and topic_count > 10:
        insights.append(
            "📊 Less than 40% of topics are mastered. Prioritize depth over "
            "breadth — master your high-weight topics first."
        )

    # Revision impact
    if revisions == 0:
        insights.append(
            "🔄 No full revision cycle completed yet. At least one complete "
            "revision pass significantly improves retention."
        )

    # Practice test gap
    if abs(practice - quiz) > 0.2:
        gap_dir = "higher" if practice > quiz else "lower"
        insights.append(
            f"📝 Your practice test score is {gap_dir} than your quiz average. "
            f"{'Practice tests are a better predictor — trust them more.' if practice > quiz else 'Focus on timed practice to improve exam performance.'}"
        )

    # Overconfidence warning
    if confidence > quiz + 0.2:
        insights.append(
            "🎯 Your self-confidence exceeds your quiz performance. "
            "Take more practice quizzes to validate your understanding."
        )

    if not insights:
        insights.append("✅ You're on track! Keep up the consistent study habits.")

    return insights[:5]  # Max 5 insights
