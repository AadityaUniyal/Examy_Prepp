"""
ExamEve ML Model Training Pipeline
===================================
Trains 4 XGBoost models with comprehensive synthetic data covering 12+ student
persona archetypes, non-linear interaction features, temporal patterns, and
edge-case injection for robust real-world performance.

Models:
  1. Confidence Calibration   → confidence_model.json
  2. Topic Priority Ranking   → priority_model.json
  3. Panic / Anxiety Detection → panic_model.json
  4. Exam Score Prediction     → score_prediction_model.json

Run:
  cd ml-service && python -m app.training.train
"""

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import KFold
from sklearn.metrics import root_mean_squared_error, mean_absolute_error
import os
import json
import time

# ─── Globals ─────────────────────────────────────────────────────────────────
NUM_SAMPLES = 10_000
EDGE_BLOCK = 200          # samples per injected edge-case block
SEED = 42
MODEL_DIR = "app/models"
N_FOLDS = 5

os.makedirs(MODEL_DIR, exist_ok=True)
np.random.seed(SEED)


# ═══════════════════════════════════════════════════════════════════════════════
#  HELPER UTILITIES
# ═══════════════════════════════════════════════════════════════════════════════

def _cross_validate(X, y, params: dict, name: str):
    """Run K-Fold cross-validation and print metrics."""
    kf = KFold(n_splits=N_FOLDS, shuffle=True, random_state=SEED)
    rmse_scores, mae_scores = [], []

    for fold, (train_idx, val_idx) in enumerate(kf.split(X), 1):
        X_tr, X_val = X[train_idx], X[val_idx]
        y_tr, y_val = y[train_idx], y[val_idx]

        reg = xgb.XGBRegressor(**params, random_state=SEED)
        reg.fit(X_tr, y_tr, eval_set=[(X_val, y_val)], verbose=False)
        preds = reg.predict(X_val)
        rmse_scores.append(root_mean_squared_error(y_val, preds))
        mae_scores.append(mean_absolute_error(y_val, preds))

    avg_rmse = np.mean(rmse_scores)
    avg_mae  = np.mean(mae_scores)
    print(f"  [{name}] {N_FOLDS}-fold CV  →  RMSE: {avg_rmse:.4f}  |  MAE: {avg_mae:.4f}")
    return avg_rmse, avg_mae


def _fit_and_save(X, y, params: dict, model_path: str, name: str):
    """Fit final model on full data and save."""
    model = xgb.XGBRegressor(**params, random_state=SEED)
    model.fit(X, y, verbose=False)
    model.save_model(model_path)
    print(f"  [{name}] Saved → {model_path}  ({X.shape[0]} samples, {X.shape[1]} features)")
    return model


def _inject_block(arr, start, end, value):
    """Set arr[start:end] = value."""
    arr[start:end] = value


# ═══════════════════════════════════════════════════════════════════════════════
#  MODEL 1 — CONFIDENCE CALIBRATION
# ═══════════════════════════════════════════════════════════════════════════════

def train_confidence_model():
    print("\n══ MODEL 1: Confidence Calibration ══")
    n = NUM_SAMPLES

    # ── Base distributions ───────────────────────────────────────────────────
    self_confidence     = np.random.uniform(0, 10, n)
    quiz_score          = np.random.uniform(0, 100, n)
    time_spent_mins     = np.random.uniform(5, 360, n)
    days_since_revision = np.random.randint(0, 60, n)
    num_revisions       = np.random.randint(0, 15, n)
    topic_complexity    = np.random.uniform(0, 1, n)
    # NEW features
    avg_session_length  = np.random.uniform(10, 120, n)   # minutes per study session
    streak_days         = np.random.randint(0, 30, n)      # consecutive study days
    quiz_attempts       = np.random.randint(1, 10, n)      # number of quiz attempts
    improvement_rate    = np.random.uniform(-0.5, 0.5, n)  # quiz score change over time

    # ── Student Persona Edge Cases ───────────────────────────────────────────
    idx = 0

    # PERSONA 1: Dunning-Kruger Beginner — thinks 10/10, scores 0%, never revises
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(self_confidence, s, e, 10.0)
    _inject_block(quiz_score, s, e, np.random.uniform(0, 10, EDGE_BLOCK))
    _inject_block(num_revisions, s, e, 0)
    _inject_block(days_since_revision, s, e, np.random.randint(20, 60, EDGE_BLOCK))
    _inject_block(streak_days, s, e, 0)

    # PERSONA 2: Impostor Syndrome — thinks 0-1/10, scores 90-100%
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(self_confidence, s, e, np.random.uniform(0, 1, EDGE_BLOCK))
    _inject_block(quiz_score, s, e, np.random.uniform(90, 100, EDGE_BLOCK))
    _inject_block(num_revisions, s, e, np.random.randint(5, 15, EDGE_BLOCK))
    _inject_block(streak_days, s, e, np.random.randint(10, 30, EDGE_BLOCK))

    # PERSONA 3: Cramming Student — high time in one burst, no prior revision
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(time_spent_mins, s, e, np.random.uniform(240, 360, EDGE_BLOCK))
    _inject_block(num_revisions, s, e, 1)
    _inject_block(days_since_revision, s, e, 0)
    _inject_block(avg_session_length, s, e, np.random.uniform(180, 360, EDGE_BLOCK))
    _inject_block(streak_days, s, e, 1)

    # PERSONA 4: Consistent Achiever — moderate confidence, steady 70-80%, long streak
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(self_confidence, s, e, np.random.uniform(6, 8, EDGE_BLOCK))
    _inject_block(quiz_score, s, e, np.random.uniform(70, 85, EDGE_BLOCK))
    _inject_block(num_revisions, s, e, np.random.randint(4, 8, EDGE_BLOCK))
    _inject_block(streak_days, s, e, np.random.randint(15, 30, EDGE_BLOCK))

    # PERSONA 5: Declining Student — was good, now dropping
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(self_confidence, s, e, np.random.uniform(7, 9, EDGE_BLOCK))
    _inject_block(quiz_score, s, e, np.random.uniform(30, 50, EDGE_BLOCK))
    _inject_block(improvement_rate, s, e, np.random.uniform(-0.5, -0.2, EDGE_BLOCK))
    _inject_block(days_since_revision, s, e, np.random.randint(10, 30, EDGE_BLOCK))

    # PERSONA 6: Zero Engagement — brand new, no data
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(self_confidence, s, e, 5.0)  # default/neutral
    _inject_block(quiz_score, s, e, 0.0)
    _inject_block(time_spent_mins, s, e, 0.0)
    _inject_block(num_revisions, s, e, 0)
    _inject_block(quiz_attempts, s, e, 0)
    _inject_block(streak_days, s, e, 0)

    # PERSONA 7: Quiz Repeater — many attempts, improving
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(quiz_attempts, s, e, np.random.randint(5, 10, EDGE_BLOCK))
    _inject_block(quiz_score, s, e, np.random.uniform(60, 95, EDGE_BLOCK))
    _inject_block(improvement_rate, s, e, np.random.uniform(0.2, 0.5, EDGE_BLOCK))

    # PERSONA 8: Speedrunner — minimal time, high scores (gifted or cheating)
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(time_spent_mins, s, e, np.random.uniform(5, 15, EDGE_BLOCK))
    _inject_block(quiz_score, s, e, np.random.uniform(85, 100, EDGE_BLOCK))
    _inject_block(avg_session_length, s, e, np.random.uniform(5, 15, EDGE_BLOCK))

    # PERSONA 9: Overworked Student — high time but exhaustion kills performance
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(time_spent_mins, s, e, np.random.uniform(300, 360, EDGE_BLOCK))
    _inject_block(quiz_score, s, e, np.random.uniform(20, 40, EDGE_BLOCK))
    _inject_block(avg_session_length, s, e, np.random.uniform(120, 300, EDGE_BLOCK))
    _inject_block(improvement_rate, s, e, np.random.uniform(-0.3, -0.1, EDGE_BLOCK))

    # PERSONA 10: Last-Minute Reviser — 0 days since revision, many revisions today
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(days_since_revision, s, e, 0)
    _inject_block(num_revisions, s, e, np.random.randint(8, 15, EDGE_BLOCK))
    _inject_block(quiz_score, s, e, np.random.uniform(50, 70, EDGE_BLOCK))

    # ── Ground Truth (non-linear with interactions) ──────────────────────────
    quiz_norm    = quiz_score / 100.0
    self_norm    = self_confidence / 10.0
    rev_norm     = np.minimum(num_revisions, 10) / 10.0
    decay        = np.exp(-days_since_revision / 14.0)  # exponential forgetting curve
    session_eff  = 1.0 - np.exp(-avg_session_length / 60.0)  # diminishing returns
    streak_bonus = np.minimum(streak_days, 21) / 21.0
    attempt_factor = np.minimum(quiz_attempts, 5) / 5.0

    calibrated_confidence = (
        quiz_norm * 0.30 +                           # objective quiz performance
        self_norm * 0.15 +                           # subjective self-assessment (discounted)
        rev_norm * decay * 0.15 +                    # revision recency interaction
        session_eff * 0.10 +                         # session quality
        streak_bonus * 0.10 +                        # consistency
        attempt_factor * improvement_rate * 0.10 +   # learning trajectory
        (1.0 - topic_complexity) * 0.10              # topic ease
    )
    # Add realistic noise
    noise = np.random.normal(0, 0.03, n)
    calibrated_confidence = np.clip(calibrated_confidence + noise, 0.0, 1.0)

    X = np.column_stack([
        self_confidence, quiz_score, time_spent_mins, days_since_revision,
        num_revisions, topic_complexity, avg_session_length, streak_days,
        quiz_attempts, improvement_rate
    ])
    y = calibrated_confidence

    params = dict(n_estimators=200, max_depth=6, learning_rate=0.05,
                  subsample=0.8, colsample_bytree=0.8, reg_alpha=0.1, reg_lambda=1.0)

    _cross_validate(X, y, params, "Confidence")
    _fit_and_save(X, y, params, f"{MODEL_DIR}/confidence_model.json", "Confidence")


# ═══════════════════════════════════════════════════════════════════════════════
#  MODEL 2 — TOPIC PRIORITY RANKING
# ═══════════════════════════════════════════════════════════════════════════════

def train_priority_model():
    print("\n══ MODEL 2: Topic Priority Ranking ══")
    n = NUM_SAMPLES

    # ── Base distributions ───────────────────────────────────────────────────
    weightage           = np.random.uniform(1, 50, n)
    confidence          = np.random.uniform(0, 1, n)
    days_until_exam     = np.random.randint(1, 90, n)
    complexity          = np.random.uniform(0.1, 1.0, n)
    estimated_hours     = np.random.uniform(0.5, 20, n)
    # NEW features
    prerequisite_count  = np.random.randint(0, 5, n)       # how many topics depend on this
    times_revised       = np.random.randint(0, 10, n)      # past revision count
    last_quiz_score     = np.random.uniform(0, 1, n)       # most recent quiz normalized
    topic_trend         = np.random.uniform(-0.5, 0.5, n)  # improving or declining

    # ── Edge Cases ───────────────────────────────────────────────────────────
    idx = 0

    # EC1: Exam tomorrow + high-weight topic + zero confidence
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(days_until_exam, s, e, 1)
    _inject_block(weightage, s, e, np.random.uniform(40, 50, EDGE_BLOCK))
    _inject_block(confidence, s, e, np.random.uniform(0, 0.1, EDGE_BLOCK))

    # EC2: Exam in 3 months + low-weight + already mastered
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(days_until_exam, s, e, 90)
    _inject_block(weightage, s, e, np.random.uniform(1, 5, EDGE_BLOCK))
    _inject_block(confidence, s, e, np.random.uniform(0.9, 1.0, EDGE_BLOCK))

    # EC3: Foundation topic — many prerequisites depend on it
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(prerequisite_count, s, e, np.random.randint(3, 5, EDGE_BLOCK))
    _inject_block(confidence, s, e, np.random.uniform(0.2, 0.4, EDGE_BLOCK))

    # EC4: Easy topic already revised many times — should be low priority
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(complexity, s, e, np.random.uniform(0.1, 0.2, EDGE_BLOCK))
    _inject_block(times_revised, s, e, np.random.randint(7, 10, EDGE_BLOCK))
    _inject_block(confidence, s, e, np.random.uniform(0.8, 1.0, EDGE_BLOCK))

    # EC5: Complex topic with declining trend — needs urgent attention
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(complexity, s, e, np.random.uniform(0.8, 1.0, EDGE_BLOCK))
    _inject_block(topic_trend, s, e, np.random.uniform(-0.5, -0.2, EDGE_BLOCK))
    _inject_block(confidence, s, e, np.random.uniform(0.3, 0.5, EDGE_BLOCK))

    # EC6: Last-minute quick-win — simple topic, low hours, not yet studied
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(days_until_exam, s, e, np.random.randint(1, 3, EDGE_BLOCK))
    _inject_block(estimated_hours, s, e, np.random.uniform(0.5, 2, EDGE_BLOCK))
    _inject_block(complexity, s, e, np.random.uniform(0.1, 0.3, EDGE_BLOCK))
    _inject_block(confidence, s, e, np.random.uniform(0, 0.2, EDGE_BLOCK))

    # EC7: High-weight topic, high confidence but declining — re-study needed
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(weightage, s, e, np.random.uniform(30, 50, EDGE_BLOCK))
    _inject_block(confidence, s, e, np.random.uniform(0.7, 0.9, EDGE_BLOCK))
    _inject_block(topic_trend, s, e, np.random.uniform(-0.4, -0.2, EDGE_BLOCK))
    _inject_block(last_quiz_score, s, e, np.random.uniform(0.3, 0.5, EDGE_BLOCK))

    # EC8: Medium everything — the "average student" baseline
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(weightage, s, e, 25.0)
    _inject_block(confidence, s, e, 0.5)
    _inject_block(days_until_exam, s, e, 14)
    _inject_block(complexity, s, e, 0.5)

    # ── Ground Truth (non-linear priority) ───────────────────────────────────
    urgency = 1.0 / np.maximum(days_until_exam, 1)
    urgency_norm = np.clip(urgency * 10, 0, 1)  # normalize: 1 day → ~1.0, 10 days → ~0.1

    confidence_gap = 1.0 - confidence
    weight_norm = weightage / 50.0
    prereq_boost = np.minimum(prerequisite_count, 4) / 4.0
    revision_saturation = 1.0 - np.minimum(times_revised, 8) / 8.0
    quiz_gap = 1.0 - last_quiz_score
    trend_penalty = np.clip(-topic_trend, 0, 0.5)  # declining → higher priority
    quick_win = (1.0 - complexity) * urgency_norm  # easy + urgent = quick win

    priority_score = (
        weight_norm * 0.25 +
        confidence_gap * 0.20 +
        urgency_norm * 0.15 +
        complexity * 0.08 +
        prereq_boost * 0.10 +
        revision_saturation * 0.07 +
        quiz_gap * 0.05 +
        trend_penalty * 0.05 +
        quick_win * 0.05
    )
    noise = np.random.normal(0, 0.02, n)
    priority_score = np.clip(priority_score + noise, 0.0, 1.0)

    X = np.column_stack([
        weightage, confidence, days_until_exam, complexity, estimated_hours,
        prerequisite_count, times_revised, last_quiz_score, topic_trend
    ])
    y = priority_score

    params = dict(n_estimators=200, max_depth=6, learning_rate=0.05,
                  subsample=0.8, colsample_bytree=0.8, reg_alpha=0.1, reg_lambda=1.0)

    _cross_validate(X, y, params, "Priority")
    _fit_and_save(X, y, params, f"{MODEL_DIR}/priority_model.json", "Priority")


# ═══════════════════════════════════════════════════════════════════════════════
#  MODEL 3 — PANIC / ANXIETY DETECTION
# ═══════════════════════════════════════════════════════════════════════════════

def train_panic_model():
    print("\n══ MODEL 3: Panic / Anxiety Detection ══")
    n = NUM_SAMPLES

    # ── Base distributions ───────────────────────────────────────────────────
    heart_rate_variability  = np.random.uniform(20, 100, n)   # lower = more stress
    session_focus_score     = np.random.uniform(0, 1, n)
    recent_quiz_drop        = np.random.uniform(-50, 10, n)   # negative = score dropped
    time_spent_stuck_mins   = np.random.uniform(0, 60, n)
    rapid_topic_switching   = np.random.randint(0, 15, n)
    confidence_drop         = np.random.uniform(-0.8, 0.2, n) # negative = confidence dropped
    # NEW features
    session_count_today     = np.random.randint(0, 10, n)     # study fatigue
    hours_since_break       = np.random.uniform(0, 8, n)
    days_until_exam         = np.random.randint(1, 60, n)
    failed_quiz_streak      = np.random.randint(0, 5, n)

    # ── Edge Cases ───────────────────────────────────────────────────────────
    idx = 0

    # PANIC 1: Full meltdown — everything bad
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(heart_rate_variability, s, e, np.random.uniform(20, 35, EDGE_BLOCK))
    _inject_block(session_focus_score, s, e, np.random.uniform(0, 0.1, EDGE_BLOCK))
    _inject_block(recent_quiz_drop, s, e, np.random.uniform(-50, -30, EDGE_BLOCK))
    _inject_block(rapid_topic_switching, s, e, np.random.randint(10, 15, EDGE_BLOCK))
    _inject_block(confidence_drop, s, e, np.random.uniform(-0.8, -0.5, EDGE_BLOCK))
    _inject_block(failed_quiz_streak, s, e, np.random.randint(3, 5, EDGE_BLOCK))

    # PANIC 2: Completely calm — everything good
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(heart_rate_variability, s, e, np.random.uniform(80, 100, EDGE_BLOCK))
    _inject_block(session_focus_score, s, e, np.random.uniform(0.8, 1.0, EDGE_BLOCK))
    _inject_block(recent_quiz_drop, s, e, np.random.uniform(0, 10, EDGE_BLOCK))
    _inject_block(rapid_topic_switching, s, e, np.random.randint(0, 2, EDGE_BLOCK))
    _inject_block(confidence_drop, s, e, np.random.uniform(0, 0.2, EDGE_BLOCK))
    _inject_block(failed_quiz_streak, s, e, 0)

    # PANIC 3: Exam-eve anxiety — exam tomorrow, moderate symptoms
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(days_until_exam, s, e, 1)
    _inject_block(heart_rate_variability, s, e, np.random.uniform(40, 55, EDGE_BLOCK))
    _inject_block(session_focus_score, s, e, np.random.uniform(0.2, 0.4, EDGE_BLOCK))
    _inject_block(hours_since_break, s, e, np.random.uniform(4, 8, EDGE_BLOCK))

    # PANIC 4: Burnout pattern — long sessions, no breaks, declining focus
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(session_count_today, s, e, np.random.randint(6, 10, EDGE_BLOCK))
    _inject_block(hours_since_break, s, e, np.random.uniform(5, 8, EDGE_BLOCK))
    _inject_block(session_focus_score, s, e, np.random.uniform(0.1, 0.3, EDGE_BLOCK))
    _inject_block(time_spent_stuck_mins, s, e, np.random.uniform(30, 60, EDGE_BLOCK))

    # PANIC 5: Sudden confidence crash — was fine, now panicking
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(confidence_drop, s, e, np.random.uniform(-0.8, -0.5, EDGE_BLOCK))
    _inject_block(recent_quiz_drop, s, e, np.random.uniform(-40, -20, EDGE_BLOCK))
    _inject_block(heart_rate_variability, s, e, np.random.uniform(30, 45, EDGE_BLOCK))

    # PANIC 6: Topic thrashing — rapidly switching, can't focus
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(rapid_topic_switching, s, e, np.random.randint(8, 15, EDGE_BLOCK))
    _inject_block(time_spent_stuck_mins, s, e, np.random.uniform(20, 50, EDGE_BLOCK))
    _inject_block(session_focus_score, s, e, np.random.uniform(0.1, 0.3, EDGE_BLOCK))

    # PANIC 7: False alarm — high HRV variation but actually fine (exercise etc.)
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(heart_rate_variability, s, e, np.random.uniform(30, 45, EDGE_BLOCK))
    _inject_block(session_focus_score, s, e, np.random.uniform(0.7, 1.0, EDGE_BLOCK))
    _inject_block(recent_quiz_drop, s, e, np.random.uniform(0, 10, EDGE_BLOCK))
    _inject_block(confidence_drop, s, e, np.random.uniform(0, 0.1, EDGE_BLOCK))

    # PANIC 8: Slow burn — moderate stress sustained over many sessions
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(session_count_today, s, e, np.random.randint(4, 7, EDGE_BLOCK))
    _inject_block(session_focus_score, s, e, np.random.uniform(0.3, 0.5, EDGE_BLOCK))
    _inject_block(hours_since_break, s, e, np.random.uniform(3, 5, EDGE_BLOCK))
    _inject_block(failed_quiz_streak, s, e, np.random.randint(2, 3, EDGE_BLOCK))

    # ── Ground Truth (non-linear panic score) ────────────────────────────────
    hrv_stress   = np.clip(1.0 - (heart_rate_variability - 20) / 80.0, 0, 1)
    focus_lack   = 1.0 - session_focus_score
    quiz_shock   = np.clip(np.abs(np.minimum(recent_quiz_drop, 0)) / 50.0, 0, 1)
    stuck_factor = np.clip(time_spent_stuck_mins / 40.0, 0, 1)
    switch_chaos = np.clip(rapid_topic_switching / 10.0, 0, 1)
    conf_crash   = np.clip(np.abs(np.minimum(confidence_drop, 0)), 0, 1)
    fatigue      = np.clip(session_count_today / 8.0, 0, 1) * np.clip(hours_since_break / 6.0, 0, 1)
    exam_pressure = np.clip(1.0 / np.maximum(days_until_exam, 1) * 5, 0, 1)
    fail_streak  = np.clip(failed_quiz_streak / 3.0, 0, 1)

    # Interaction: fatigue amplifies stress signals
    stress_amplifier = 1.0 + fatigue * 0.3

    panic_score = (
        hrv_stress * 0.15 +
        focus_lack * 0.15 +
        quiz_shock * 0.12 +
        stuck_factor * 0.10 +
        switch_chaos * 0.10 +
        conf_crash * 0.12 +
        fatigue * 0.10 +
        exam_pressure * 0.08 +
        fail_streak * 0.08
    ) * stress_amplifier

    noise = np.random.normal(0, 0.03, n)
    panic_score = np.clip(panic_score + noise, 0.0, 1.0)

    X = np.column_stack([
        heart_rate_variability, session_focus_score, recent_quiz_drop,
        time_spent_stuck_mins, rapid_topic_switching, confidence_drop,
        session_count_today, hours_since_break, days_until_exam, failed_quiz_streak
    ])
    y = panic_score

    params = dict(n_estimators=200, max_depth=6, learning_rate=0.05,
                  subsample=0.8, colsample_bytree=0.8, reg_alpha=0.1, reg_lambda=1.0)

    _cross_validate(X, y, params, "Panic")
    _fit_and_save(X, y, params, f"{MODEL_DIR}/panic_model.json", "Panic")


# ═══════════════════════════════════════════════════════════════════════════════
#  MODEL 4 — EXAM SCORE PREDICTION
# ═══════════════════════════════════════════════════════════════════════════════

def train_score_prediction_model():
    print("\n══ MODEL 4: Exam Score Prediction ══")
    n = NUM_SAMPLES

    # ── Base distributions ───────────────────────────────────────────────────
    avg_confidence      = np.random.uniform(0, 1, n)
    avg_quiz_score      = np.random.uniform(0, 1, n)
    hours_completed     = np.random.uniform(0, 200, n)
    hours_planned       = np.random.uniform(10, 250, n)
    days_until_exam     = np.random.randint(1, 90, n)
    topic_count         = np.random.randint(3, 25, n)
    # NEW features
    study_consistency   = np.random.uniform(0, 1, n)      # regularity of study pattern
    panic_avg           = np.random.uniform(0, 1, n)      # average panic score
    topics_mastered_pct = np.random.uniform(0, 1, n)      # % topics above 0.7 confidence
    revision_cycles     = np.random.randint(0, 5, n)       # full syllabus revision passes
    practice_test_score = np.random.uniform(0, 1, n)       # mock exam score

    # Ensure hours_completed ≤ hours_planned
    hours_completed = np.minimum(hours_completed, hours_planned)

    # ── Edge Cases ───────────────────────────────────────────────────────────
    idx = 0

    # SCORE 1: Perfect student — all metrics high
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(avg_confidence, s, e, np.random.uniform(0.85, 1.0, EDGE_BLOCK))
    _inject_block(avg_quiz_score, s, e, np.random.uniform(0.9, 1.0, EDGE_BLOCK))
    _inject_block(study_consistency, s, e, np.random.uniform(0.9, 1.0, EDGE_BLOCK))
    _inject_block(topics_mastered_pct, s, e, np.random.uniform(0.9, 1.0, EDGE_BLOCK))
    _inject_block(practice_test_score, s, e, np.random.uniform(0.85, 1.0, EDGE_BLOCK))
    _inject_block(revision_cycles, s, e, np.random.randint(3, 5, EDGE_BLOCK))
    hours_completed[s:e] = hours_planned[s:e] * np.random.uniform(0.9, 1.0, EDGE_BLOCK)

    # SCORE 2: Unprepared — barely studied
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(avg_confidence, s, e, np.random.uniform(0, 0.2, EDGE_BLOCK))
    _inject_block(avg_quiz_score, s, e, np.random.uniform(0, 0.2, EDGE_BLOCK))
    _inject_block(study_consistency, s, e, np.random.uniform(0, 0.1, EDGE_BLOCK))
    _inject_block(topics_mastered_pct, s, e, 0)
    _inject_block(practice_test_score, s, e, np.random.uniform(0, 0.15, EDGE_BLOCK))
    hours_completed[s:e] = hours_planned[s:e] * np.random.uniform(0, 0.1, EDGE_BLOCK)

    # SCORE 3: High anxiety despite good preparation — panic hurts performance
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(avg_quiz_score, s, e, np.random.uniform(0.7, 0.9, EDGE_BLOCK))
    _inject_block(panic_avg, s, e, np.random.uniform(0.7, 1.0, EDGE_BLOCK))
    _inject_block(study_consistency, s, e, np.random.uniform(0.6, 0.8, EDGE_BLOCK))

    # SCORE 4: Cramming — low consistency, decent quiz scores
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(study_consistency, s, e, np.random.uniform(0, 0.2, EDGE_BLOCK))
    _inject_block(avg_quiz_score, s, e, np.random.uniform(0.5, 0.7, EDGE_BLOCK))
    _inject_block(revision_cycles, s, e, 0)
    _inject_block(days_until_exam, s, e, np.random.randint(1, 3, EDGE_BLOCK))

    # SCORE 5: Many topics, little time — spread too thin
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(topic_count, s, e, np.random.randint(18, 25, EDGE_BLOCK))
    _inject_block(topics_mastered_pct, s, e, np.random.uniform(0.1, 0.3, EDGE_BLOCK))
    hours_completed[s:e] = hours_planned[s:e] * np.random.uniform(0.2, 0.4, EDGE_BLOCK)

    # SCORE 6: Practice test ace but no quiz history — mock exam only
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(practice_test_score, s, e, np.random.uniform(0.8, 1.0, EDGE_BLOCK))
    _inject_block(avg_quiz_score, s, e, np.random.uniform(0.3, 0.5, EDGE_BLOCK))
    _inject_block(revision_cycles, s, e, np.random.randint(2, 4, EDGE_BLOCK))

    # SCORE 7: Steady mediocre — consistently average
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(avg_confidence, s, e, 0.5)
    _inject_block(avg_quiz_score, s, e, 0.5)
    _inject_block(study_consistency, s, e, 0.5)
    _inject_block(topics_mastered_pct, s, e, 0.4)
    _inject_block(practice_test_score, s, e, 0.5)

    # SCORE 8: Strong start, declined — improving then dropping
    s, e = idx, idx + EDGE_BLOCK; idx = e
    _inject_block(avg_confidence, s, e, np.random.uniform(0.6, 0.8, EDGE_BLOCK))
    _inject_block(avg_quiz_score, s, e, np.random.uniform(0.3, 0.5, EDGE_BLOCK))
    _inject_block(study_consistency, s, e, np.random.uniform(0.2, 0.4, EDGE_BLOCK))
    _inject_block(panic_avg, s, e, np.random.uniform(0.5, 0.7, EDGE_BLOCK))

    # ── Ground Truth (non-linear predicted score) ────────────────────────────
    completion_ratio = hours_completed / np.maximum(hours_planned, 1)

    # Anxiety penalty: high panic reduces actual performance non-linearly
    anxiety_penalty = np.clip(panic_avg ** 1.5, 0, 1) * 0.15

    # Consistency multiplier: regular study is more effective than cramming
    consistency_mult = 0.8 + study_consistency * 0.4  # 0.8x to 1.2x

    # Mastery breadth: covering more topics matters
    breadth_factor = topics_mastered_pct

    # Revision depth: multiple passes improve retention (logarithmic)
    revision_effect = np.log1p(revision_cycles) / np.log1p(4)

    # Practice test is the best single predictor
    # Quiz average also strong
    # Confidence matters but can be miscalibrated

    predicted_score = (
        practice_test_score * 0.25 +
        avg_quiz_score * 0.20 +
        avg_confidence * 0.10 +
        completion_ratio * 0.10 +
        breadth_factor * 0.10 +
        revision_effect * 0.10 +
        study_consistency * 0.05 +
        (1.0 / np.maximum(topic_count, 3) * 3) * 0.05 +   # fewer topics = easier to ace
        (1.0 - anxiety_penalty) * 0.05
    ) * consistency_mult

    noise = np.random.normal(0, 0.03, n)
    predicted_score = np.clip(predicted_score + noise, 0.0, 1.0)

    X = np.column_stack([
        avg_confidence, avg_quiz_score, hours_completed, hours_planned,
        days_until_exam, topic_count, study_consistency, panic_avg,
        topics_mastered_pct, revision_cycles, practice_test_score
    ])
    y = predicted_score

    params = dict(n_estimators=250, max_depth=7, learning_rate=0.04,
                  subsample=0.8, colsample_bytree=0.8, reg_alpha=0.2, reg_lambda=1.5)

    _cross_validate(X, y, params, "Score Prediction")
    _fit_and_save(X, y, params, f"{MODEL_DIR}/score_prediction_model.json", "Score Prediction")


# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 60)
    print("  ExamEve ML Training Pipeline")
    print("  Samples per model: {:,}".format(NUM_SAMPLES))
    print("  Persona edge-case blocks: {} samples each".format(EDGE_BLOCK))
    print("=" * 60)

    t0 = time.time()

    train_confidence_model()
    train_priority_model()
    train_panic_model()
    train_score_prediction_model()

    elapsed = time.time() - t0
    print(f"\n{'=' * 60}")
    print(f"  All 4 models trained in {elapsed:.1f}s")
    print(f"  Models saved to: {MODEL_DIR}/")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
