"""
ExamEve ML Service — Comprehensive Test Suite
Tests all 4 ML-backed endpoints with happy paths, edge cases, and persona scenarios.
"""
import sys
from unittest.mock import MagicMock

# Mock sentence-transformers to avoid import hangs and network dependency in tests
class MockSentenceTransformer:
    def __init__(self, model_name=None, *args, **kwargs):
        pass
    def encode(self, sentences, *args, **kwargs):
        import numpy as np
        # Return a simple mock numpy array or list embedding representation
        if isinstance(sentences, list):
            return np.zeros((len(sentences), 384))
        return np.zeros(384)

mock_st = MagicMock()
mock_st.SentenceTransformer = MockSentenceTransformer
sys.modules['sentence_transformers'] = mock_st

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app, headers={"X-Internal-Token": "dev_internal_token"})


# ═══════════════════════════════════════════════════════════════════════════════
#  Health Check
# ═══════════════════════════════════════════════════════════════════════════════

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "docs_url" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════
#  Confidence Calibration
# ═══════════════════════════════════════════════════════════════════════════════

def test_calibrate_confidence_basic():
    """Happy path with minimal fields."""
    payload = {
        "self_confidence": 8.0,
        "quiz_score": 85.0,
        "time_spent_mins": 120.0,
        "days_since_revision": 2,
        "num_revisions": 3,
        "topic_complexity": 0.5
    }
    response = client.post("/api/ml/calibrate-confidence", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert 0.0 <= data["calibrated_confidence"] <= 1.0
    assert "calibration_gap" in data
    assert data["calibration_gap"] in [
        "underconfident", "slightly_underconfident", "well_calibrated",
        "slightly_overconfident", "overconfident"
    ]


def test_calibrate_confidence_with_new_features():
    """Test with all new optional ML features."""
    payload = {
        "self_confidence": 5.0,
        "quiz_score": 70.0,
        "time_spent_mins": 90.0,
        "days_since_revision": 5,
        "num_revisions": 4,
        "topic_complexity": 0.6,
        "avg_session_length": 45.0,
        "streak_days": 7,
        "quiz_attempts": 3,
        "improvement_rate": 0.2
    }
    response = client.post("/api/ml/calibrate-confidence", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert 0.0 <= data["calibrated_confidence"] <= 1.0


def test_calibrate_dunning_kruger():
    """Persona: thinks 10/10, scores 0%."""
    payload = {
        "self_confidence": 10.0,
        "quiz_score": 5.0,
        "time_spent_mins": 10.0,
        "days_since_revision": 30,
        "num_revisions": 0,
        "topic_complexity": 0.8,
        "streak_days": 0,
        "quiz_attempts": 1
    }
    response = client.post("/api/ml/calibrate-confidence", json=payload)
    data = response.json()
    assert data["calibrated_confidence"] < 0.5  # Should be much lower than self-report
    assert data["calibration_gap"] in ["slightly_overconfident", "overconfident"]


def test_calibrate_impostor_syndrome():
    """Persona: thinks 0/10, scores 95%."""
    payload = {
        "self_confidence": 0.5,
        "quiz_score": 95.0,
        "time_spent_mins": 200.0,
        "days_since_revision": 1,
        "num_revisions": 8,
        "topic_complexity": 0.3,
        "streak_days": 20,
        "quiz_attempts": 5,
        "improvement_rate": 0.3
    }
    response = client.post("/api/ml/calibrate-confidence", json=payload)
    data = response.json()
    assert data["calibrated_confidence"] > data["self_confidence"]  # Should be higher
    assert data["calibration_gap"] in ["underconfident", "slightly_underconfident"]


def test_batch_calibrate():
    """Test batch endpoint."""
    payload = [
        {
            "self_confidence": 3.0,
            "quiz_score": 40.0,
            "time_spent_mins": 60.0,
            "days_since_revision": 10,
            "num_revisions": 1,
            "topic_complexity": 0.7
        },
        {
            "self_confidence": 9.0,
            "quiz_score": 90.0,
            "time_spent_mins": 200.0,
            "days_since_revision": 1,
            "num_revisions": 6,
            "topic_complexity": 0.3
        }
    ]
    response = client.post("/api/ml/batch-calibrate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


# ═══════════════════════════════════════════════════════════════════════════════
#  Topic Priority Ranking
# ═══════════════════════════════════════════════════════════════════════════════

def test_prioritize_topics_basic():
    """Happy path: high-weight low-confidence should rank first."""
    payload = [
        {
            "topic_id": "topic-1",
            "weightage": 30.0,
            "confidence": 0.3,
            "days_until_exam": 5,
            "complexity": 0.6,
            "estimated_hours": 3.0
        },
        {
            "topic_id": "topic-2",
            "weightage": 10.0,
            "confidence": 0.8,
            "days_until_exam": 5,
            "complexity": 0.4,
            "estimated_hours": 2.0
        }
    ]
    response = client.post("/api/ml/prioritize-topics", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["topic_id"] == "topic-1"
    assert data[0]["rank"] == 1
    assert "urgency_tag" in data[0]
    assert "reason" in data[0]


def test_prioritize_exam_tomorrow():
    """Edge case: exam tomorrow with critical topic."""
    payload = [
        {
            "topic_id": "urgent-topic",
            "weightage": 45.0,
            "confidence": 0.1,
            "days_until_exam": 1,
            "complexity": 0.9,
            "estimated_hours": 5.0,
            "prerequisite_count": 3
        }
    ]
    response = client.post("/api/ml/prioritize-topics", json=payload)
    data = response.json()
    assert data[0]["urgency_tag"] == "critical"
    assert data[0]["priority_score"] > 0.5


def test_prioritize_already_mastered():
    """Edge case: already mastered topic should be low priority."""
    payload = [
        {
            "topic_id": "mastered-topic",
            "weightage": 5.0,
            "confidence": 0.95,
            "days_until_exam": 30,
            "complexity": 0.2,
            "estimated_hours": 1.0,
            "times_revised": 8,
            "last_quiz_score": 0.95
        }
    ]
    response = client.post("/api/ml/prioritize-topics", json=payload)
    data = response.json()
    assert data[0]["urgency_tag"] == "low"


# ═══════════════════════════════════════════════════════════════════════════════
#  Panic Detection
# ═══════════════════════════════════════════════════════════════════════════════

def test_detect_panic_calm():
    """Student is calm and focused."""
    payload = {
        "heart_rate_variability": 85.0,
        "session_focus_score": 0.9,
        "recent_quiz_drop": 5.0,
        "time_spent_stuck_mins": 2.0,
        "rapid_topic_switching": 0,
        "confidence_drop": 0.05,
        "failed_quiz_streak": 0
    }
    response = client.post("/api/ml/detect-panic", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["panic_level"] == "low"
    assert data["panic_score"] < 0.3


def test_detect_panic_meltdown():
    """Full meltdown scenario."""
    payload = {
        "heart_rate_variability": 25.0,
        "session_focus_score": 0.05,
        "recent_quiz_drop": -45.0,
        "time_spent_stuck_mins": 50.0,
        "rapid_topic_switching": 12,
        "confidence_drop": -0.7,
        "session_count_today": 8,
        "hours_since_break": 6.0,
        "days_until_exam": 1,
        "failed_quiz_streak": 4
    }
    response = client.post("/api/ml/detect-panic", json=payload)
    data = response.json()
    assert data["panic_level"] in ["high", "critical"]
    assert data["panic_score"] > 0.5


def test_detect_panic_minimal_input():
    """Test with only partial inputs (all optional)."""
    payload = {
        "session_focus_score": 0.4,
        "rapid_topic_switching": 5
    }
    response = client.post("/api/ml/detect-panic", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert 0.0 <= data["panic_score"] <= 1.0


def test_detect_panic_burnout():
    """Burnout pattern: many sessions, no breaks."""
    payload = {
        "session_count_today": 9,
        "hours_since_break": 7.0,
        "session_focus_score": 0.15,
        "time_spent_stuck_mins": 40.0,
        "confidence_drop": -0.3
    }
    response = client.post("/api/ml/detect-panic", json=payload)
    data = response.json()
    assert data["panic_level"] in ["moderate", "high", "critical"]


def test_batch_detect_panic():
    """Test batch panic detection."""
    payload = [
        {"session_focus_score": 0.9, "rapid_topic_switching": 0},
        {"session_focus_score": 0.1, "rapid_topic_switching": 12}
    ]
    response = client.post("/api/ml/batch-detect-panic", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    # Second student should have higher panic
    assert data[1]["panic_score"] > data[0]["panic_score"]


# ═══════════════════════════════════════════════════════════════════════════════
#  Score Prediction
# ═══════════════════════════════════════════════════════════════════════════════

def test_predict_score_basic():
    """Happy path with minimal fields."""
    payload = {
        "confidence_scores": [0.7, 0.8, 0.6],
        "quiz_scores": [0.75, 0.85, 0.65],
        "study_hours_completed": 40.0,
        "total_study_hours_planned": 60.0,
        "days_until_exam": 7,
        "topic_count": 5
    }
    response = client.post("/api/ml/predict-score", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert 0 <= data["predicted_score"] <= 100
    assert data["confidence_interval_low"] <= data["predicted_score"]
    assert data["confidence_interval_high"] >= data["predicted_score"]
    assert data["reliability"] in ["low", "medium", "high"]
    assert "insights" in data
    assert isinstance(data["insights"], list)


def test_predict_score_with_all_features():
    """Test with all optional ML features."""
    payload = {
        "confidence_scores": [0.85, 0.9, 0.8, 0.75],
        "quiz_scores": [0.9, 0.85, 0.88, 0.82],
        "study_hours_completed": 80.0,
        "total_study_hours_planned": 90.0,
        "days_until_exam": 3,
        "topic_count": 8,
        "study_consistency": 0.85,
        "panic_avg": 0.2,
        "topics_mastered_pct": 0.75,
        "revision_cycles": 3,
        "practice_test_score": 0.82
    }
    response = client.post("/api/ml/predict-score", json=payload)
    data = response.json()
    assert data["predicted_score"] > 50  # Well-prepared student
    assert data["reliability"] == "high"


def test_predict_score_unprepared():
    """Edge case: barely studied student."""
    payload = {
        "confidence_scores": [0.1, 0.15],
        "quiz_scores": [0.1, 0.2],
        "study_hours_completed": 5.0,
        "total_study_hours_planned": 100.0,
        "days_until_exam": 2,
        "topic_count": 15,
        "study_consistency": 0.05,
        "topics_mastered_pct": 0.0,
        "revision_cycles": 0,
        "practice_test_score": 0.1
    }
    response = client.post("/api/ml/predict-score", json=payload)
    data = response.json()
    assert data["predicted_score"] < 40  # Should predict low score


def test_predict_score_anxious_prepared():
    """Edge case: well-prepared but very anxious."""
    payload = {
        "confidence_scores": [0.8, 0.85],
        "quiz_scores": [0.8, 0.9],
        "study_hours_completed": 70.0,
        "total_study_hours_planned": 80.0,
        "days_until_exam": 1,
        "topic_count": 6,
        "study_consistency": 0.7,
        "panic_avg": 0.85,
        "topics_mastered_pct": 0.7,
        "revision_cycles": 2,
        "practice_test_score": 0.8
    }
    response = client.post("/api/ml/predict-score", json=payload)
    data = response.json()
    # Should still predict decent score but with anxiety insight
    has_anxiety_insight = any("anxiety" in i.lower() for i in data["insights"])
    assert has_anxiety_insight


# ═══════════════════════════════════════════════════════════════════════════════
#  PYQ Doubt Assistant (RAG)
# ═══════════════════════════════════════════════════════════════════════════════

def test_pyq_assistant_basic():
    """Test standard doubt-solving and concept hint generation."""
    payload = {
        "subject": "Physics",
        "question": "What is the force required to accelerate a 5kg mass at 3m/s^2?",
        "solution": "F = m * a = 5 * 3 = 15 N"
    }
    response = client.post("/api/ml/pyq-assistant", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "hints" in data
    assert "predicted_questions" in data
    assert len(data["predicted_questions"]) == 3
    assert "similar_questions" in data
