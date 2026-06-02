import axios from 'axios';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const ML_TIMEOUT = 5000; // 5 second timeout

const mlClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: ML_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Token': process.env.ML_INTERNAL_TOKEN || 'dev_internal_token'
  },
});

/**
 * Calibrate a student's self-reported confidence score using ML model.
 * Falls back to a simple decay heuristic (80% of self-reported).
 */
export async function calibrateConfidence(data) {
  try {
    const payload = {
      self_confidence: data.selfScore !== undefined ? data.selfScore : 5.0,
      quiz_score: data.quizScore !== undefined ? data.quizScore : 70.0,
      time_spent_mins: data.timeSpentMins !== undefined ? data.timeSpentMins : 120.0,
      days_since_revision: data.daysSinceRevision !== undefined ? data.daysSinceRevision : 1,
      num_revisions: data.revisionCount !== undefined ? data.revisionCount : 0,
      topic_complexity: data.topicComplexity !== undefined ? data.topicComplexity : 0.5
    };
    const response = await mlClient.post('/api/ml/calibrate-confidence', payload);
    return {
      calibratedScore: response.data.calibrated_confidence,
      explanation: response.data.confidence_explanation,
      source: 'ml-service'
    };
  } catch (err) {
    console.warn('[ML] calibrateConfidence fallback:', err.message);
    // Fallback: apply a conservative 0.8x multiplier
    const selfScore = data.selfScore !== undefined ? data.selfScore : 5.0;
    const revisionCount = data.revisionCount || 0;
    const recencyBoost = Math.min(revisionCount * 0.02, 0.1);
    return {
      calibratedScore: (selfScore / 10.0) * (0.8 + recencyBoost),
      explanation: 'Using standard fallback heuristic calculation.',
      source: 'heuristic',
    };
  }
}

/**
 * Detect panic/anxiety signals from behavioral data.
 * Falls back to a simple threshold-based check.
 */
export async function detectPanic(data) {
  try {
    const payload = {
      heart_rate_variability: data.heartRateVariability,
      session_focus_score: data.sessionFocusScore,
      recent_quiz_drop: data.recentQuizDrop,
      time_spent_stuck_mins: data.timeSpentStuckMins,
      rapid_topic_switching: data.rapidTopicSwitching,
      confidence_drop: data.confidenceDrop
    };
    const response = await mlClient.post('/api/ml/detect-panic', payload);
    return response.data;
  } catch (err) {
    console.warn('[ML] detectPanic fallback:', err.message);
    // Fallback: simple heuristic based on energy and session patterns
    const { energyLevel = 5, rapidTopicSwitches = 0, sessionDurationMins = 0 } = data;
    const panicScore =
      (energyLevel < 3 ? 0.3 : 0) +
      (rapidTopicSwitches > 5 ? 0.3 : 0) +
      (sessionDurationMins < 5 ? 0.2 : 0);

    return {
      isPanic: panicScore >= 0.5,
      panicScore: Math.min(panicScore, 1.0),
      recommendation: panicScore >= 0.5 ? 'Take a 10-minute break' : null,
      source: 'heuristic',
    };
  }
}

/**
 * Predict exam score based on topic confidence data.
 * Falls back to weighted average calculation.
 */
export async function predictScore(data) {
  try {
    const payload = {
      confidence_scores: data.confidenceScores || [],
      quiz_scores: data.quizScores || [],
      study_hours_completed: data.studyHoursCompleted || 0,
      total_study_hours_planned: data.totalStudyHoursPlanned || 10,
      days_until_exam: data.daysUntilExam || 5,
      topic_count: data.topicCount || 1
    };
    const response = await mlClient.post('/api/ml/predict-score', payload);
    return {
      lowScore: response.data.confidence_interval_low,
      highScore: response.data.confidence_interval_high,
      confidence: response.data.predicted_score / 100.0,
      reliability: response.data.reliability,
      source: 'ml-service'
    };
  } catch (err) {
    console.warn('[ML] predictScore fallback:', err.message);
    // Fallback: weighted average of calibrated scores
    const { confidences = [] } = data;

    if (confidences.length === 0) {
      return { lowScore: 65, highScore: 80, confidence: 0.75, source: 'heuristic' };
    }

    let totalWeight = 0;
    let scoreSum = 0;
    for (const conf of confidences) {
      const weight = conf.weightage || 1;
      totalWeight += weight;
      scoreSum += (conf.calibratedScore || 0.5) * weight;
    }

    const baseScore = totalWeight > 0 ? (scoreSum / totalWeight) * 100 : 70;
    return {
      lowScore: Math.max(0, Math.round(baseScore - 10)),
      highScore: Math.min(100, Math.round(baseScore + 10)),
      confidence: 0.85,
      source: 'heuristic',
    };
  }
}

/**
 * Prioritize topics for study plan generation using ML ranking.
 * Falls back to sorting by weightage / confidence.
 */
export async function prioritizeTopics(topicsList) {
  try {
    const response = await mlClient.post('/api/ml/prioritize-topics', topicsList);
    return response.data;
  } catch (err) {
    console.warn('[ML] prioritizeTopics fallback:', err.message);
    // Fallback: rank by (weightage * (1 - confidence)) — higher urgency first
    const ranked = topicsList
      .map((t) => ({
        topic_id: t.topic_id,
        priority_score: (t.weightage || 1) * (1 - (t.confidence || 0.5)),
      }))
      .sort((a, b) => b.priority_score - a.priority_score)
      .map((t, idx) => ({
        topic_id: t.topic_id,
        priority_score: t.priority_score,
        rank: idx + 1,
        reason: 'Using baseline fallback prioritization heuristic'
      }));

    return ranked;
  }
}

/**
 * Query the PYQ RAG doubt-solving assistant.
 */
export async function askPYQAssistant(data) {
  try {
    const response = await mlClient.post('/api/ml/pyq-assistant', {
      subject: data.subject,
      question: data.question,
      solution: data.solution || null
    });
    return response.data;
  } catch (err) {
    console.error('[ML] askPYQAssistant failed:', err.message);
    throw new Error('Failed to query PYQ assistant: ' + err.message);
  }
}

