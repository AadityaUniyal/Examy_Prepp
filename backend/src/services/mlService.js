import axios from 'axios';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';
const ML_TIMEOUT = 5000; // 5 second timeout

const mlClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: ML_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Calibrate a student's self-reported confidence score using ML model.
 * Falls back to a simple decay heuristic (80% of self-reported).
 */
export async function calibrateConfidence(data) {
  try {
    const response = await mlClient.post('/api/calibrate', data);
    return response.data;
  } catch (err) {
    console.warn('[ML] calibrateConfidence fallback:', err.message);
    // Fallback: apply a conservative 0.8x multiplier
    const { selfScore, revisionCount = 0 } = data;
    const recencyBoost = Math.min(revisionCount * 0.02, 0.1);
    return {
      calibratedScore: selfScore * (0.8 + recencyBoost),
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
    const response = await mlClient.post('/api/detect-panic', data);
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
    const response = await mlClient.post('/api/predict-score', data);
    return response.data;
  } catch (err) {
    console.warn('[ML] predictScore fallback:', err.message);
    // Fallback: weighted average of calibrated scores
    const { confidences = [] } = data;

    if (confidences.length === 0) {
      return { lowScore: 65, highScore: 80, confidence: 0.5, source: 'heuristic' };
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
export async function prioritizeTopics(data) {
  try {
    const response = await mlClient.post('/api/prioritize-topics', data);
    return response.data;
  } catch (err) {
    console.warn('[ML] prioritizeTopics fallback:', err.message);
    // Fallback: rank by (weightage * (1 - confidence)) — higher urgency first
    const { topics = [] } = data;
    const ranked = topics
      .map((t) => ({
        ...t,
        urgency: (t.weightage || 1) * (1 - (t.confidence || 0.5)),
      }))
      .sort((a, b) => b.urgency - a.urgency);

    return {
      rankedTopics: ranked,
      source: 'heuristic',
    };
  }
}
