import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { calibrateConfidence, prioritizeTopics, askPYQAssistant } from '../services/mlService.js';
import { sendFeedbackEmail } from '../services/emailService.js';
import { askStudyAssistant, generateFlashcardsForTopic, generateMockExamForTopics } from '../services/aiService.js';

export default {
  loginWithGoogle: async (_, { email, name, googleId }) => {
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          googleId,
          role: 'STUDENT'
        }
      });
    } else if (googleId && !user.googleId) {
      user = await prisma.user.update({
        where: { email },
        data: { googleId }
      });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    return {
      token,
      user
    };
  },
  createExam: async (_, { name, examDate, board }, { userId }) => {
    requireAuth(userId);
    return prisma.exam.create({
      data: {
        name,
        examDate: new Date(examDate),
        board,
        userId
      }
    });
  },
  addTopics: async (_, { examId, topics }, { userId }) => {
    requireAuth(userId);
    const exam = await prisma.exam.findFirst({
      where: { id: examId, userId }
    });
    if (!exam) throw new Error('Exam not found');

    let syllabus = await prisma.syllabus.findUnique({
      where: { examId }
    });

    if (!syllabus) {
      syllabus = await prisma.syllabus.create({
        data: { examId, extractionStatus: 'DONE' }
      });
    }

    // Process concurrently with Proper Error Handling to solve N+1 / single Promise.all without createMany limitations
    const createdTopics = await Promise.all(
      topics.map(async (topic) => {
        try {
          return await prisma.topic.create({
            data: {
              name: topic.name,
              weightage: topic.weightage,
              estimatedHours: topic.estimatedHours,
              examId,
              syllabusId: syllabus.id
            }
          });
        } catch (err) {
          console.error(`Error creating topic ${topic.name}:`, err.message);
          throw new Error(`Failed to create topic ${topic.name}`);
        }
      })
    );
    return createdTopics;
  },
  updateConfidence: async (_, { topicId, score }, { userId }) => {
    requireAuth(userId);
    
    // Score range validation (0-10)
    if (score < 0 || score > 10) {
      throw new Error('Confidence score must be between 0 and 10.');
    }

    const existingConfidence = await prisma.topicConfidence.findUnique({
      where: { userId_topicId: { userId, topicId } }
    });

    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    
    // Find quiz attempts for this topic
    const quizzes = await prisma.quizAttempt.findMany({
      where: { userId, topicId }
    });
    const avgQuizScore = quizzes.length > 0 ? quizzes.reduce((sum, q) => sum + q.score, 0) / quizzes.length : 70.0;

    // Find sessions for this topic
    const sessions = await prisma.studySession.findMany({
      where: { userId, topicId, endedAt: { not: null } }
    });
    const totalTimeSpent = sessions.reduce((sum, s) => sum + (s.durationMins || 0), 0);

    const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
    const now = new Date();
    const daysSinceRevision = lastSession ? Math.max(0, Math.ceil((now.getTime() - lastSession.endedAt.getTime()) / (1000 * 3600 * 24))) : 1;

    // Calibrate score with ML integration layer
    const mlCalibration = await calibrateConfidence({
      selfScore: score,
      quizScore: avgQuizScore,
      timeSpentMins: totalTimeSpent,
      daysSinceRevision,
      revisionCount: existingConfidence ? existingConfidence.revisionCount : 0,
      topicComplexity: topic ? topic.complexityScore : 0.5
    });

    const calibrated = mlCalibration.calibratedScore;

    // Log telemetry MLEvent
    try {
      await prisma.mLEvent.create({
        data: {
          userId,
          topicId,
          confidenceBefore: existingConfidence ? existingConfidence.selfScore : null,
          confidenceAfter: score,
        }
      });
    } catch (err) {
      console.warn('[Telemetry] Error creating MLEvent in updateConfidence:', err.message);
    }

    if (existingConfidence) {
      return prisma.topicConfidence.update({
        where: { userId_topicId: { userId, topicId } },
        data: {
          selfScore: score,
          calibratedScore: calibrated,
          revisionCount: { increment: 1 },
          lastRevisedAt: new Date()
        }
      });
    }

    return prisma.topicConfidence.create({
      data: {
        userId,
        topicId,
        selfScore: score,
        calibratedScore: calibrated,
        revisionCount: 1,
        lastRevisedAt: new Date()
      }
    });
  },
  generatePlan: async (_, { examId, planType }, { userId }) => {
    requireAuth(userId);
    const exam = await prisma.exam.findFirst({
      where: { id: examId, userId },
      include: { topics: true }
    });

    if (!exam) throw new Error('Exam not found');

    // FIX: Deactivate all existing plans first
    await prisma.studyPlan.updateMany({
      where: { userId, examId, isActive: true },
      data: { isActive: false }
    });

    const totalHours = planType === 'HOURS_48' ? 48 : planType === 'HOURS_72' ? 72 : 96;

    const plan = await prisma.studyPlan.create({
      data: {
        examId,
        userId,
        totalHours,
        planType
      }
    });

    const now = new Date();
    const confidences = await prisma.topicConfidence.findMany({
      where: { userId, topic: { examId } }
    });
    const confMap = new Map(confidences.map(c => [c.topicId, c.calibratedScore]));

    const daysUntilExam = Math.max(1, Math.ceil((new Date(exam.examDate).getTime() - now.getTime()) / (1000 * 3600 * 24)));
    
    const priorityPayload = exam.topics.map(t => ({
      topic_id: t.id,
      weightage: t.weightage,
      confidence: confMap.get(t.id) || 0.5,
      days_until_exam: daysUntilExam,
      complexity: t.complexityScore || 0.5,
      estimated_hours: t.estimatedHours || 2.0
    }));

    let sortedTopics = [...exam.topics];
    try {
      const prioritizedList = await prioritizeTopics(priorityPayload);
      const rankMap = new Map(prioritizedList.map(p => [p.topic_id, p.rank]));
      sortedTopics.sort((a, b) => {
        return (rankMap.get(a.id) || 999) - (rankMap.get(b.id) || 999);
      });
    } catch (err) {
      console.warn('[Mutations] generatePlan prioritization failed, using db order:', err.message);
    }

    let currentStart = new Date(now.getTime() + 10 * 60 * 1000); // Start in 10 minutes
    let priorityRank = 1;

    for (let i = 0; i < sortedTopics.length; i++) {
      const topic = sortedTopics[i];
      const confidence = confMap.get(topic.id) || 0.5;

      // 1. Study block (45 mins)
      await prisma.planBlock.create({
        data: {
          planId: plan.id,
          topicId: topic.id,
          scheduledStart: new Date(currentStart.getTime()),
          durationMins: 45,
          blockType: 'STUDY',
          priorityRank: priorityRank++
        }
      });
      currentStart = new Date(currentStart.getTime() + 45 * 60000);

      // 2. Break block (15 mins)
      await prisma.planBlock.create({
        data: {
          planId: plan.id,
          topicId: topic.id,
          scheduledStart: new Date(currentStart.getTime()),
          durationMins: 15,
          blockType: 'BREAK',
          priorityRank: priorityRank++
        }
      });
      currentStart = new Date(currentStart.getTime() + 15 * 60000);

      // 3. Revision block (30 mins) if confidence is low (< 0.5)
      if (confidence < 0.5) {
        await prisma.planBlock.create({
          data: {
            planId: plan.id,
            topicId: topic.id,
            scheduledStart: new Date(currentStart.getTime()),
            durationMins: 30,
            blockType: 'REVISION',
            priorityRank: priorityRank++
          }
        });
        currentStart = new Date(currentStart.getTime() + 30 * 60000);
      }

      // 4. Quiz block (30 mins) - schedule a quiz to test knowledge
      await prisma.planBlock.create({
        data: {
          planId: plan.id,
          topicId: topic.id,
          scheduledStart: new Date(currentStart.getTime()),
          durationMins: 30,
          blockType: 'QUIZ',
          priorityRank: priorityRank++
        }
      });
      currentStart = new Date(currentStart.getTime() + 30 * 60000);
    }

    return prisma.studyPlan.findUnique({
      where: { id: plan.id },
      include: { blocks: { include: { topic: true } } }
    });
  },
  startSession: async (_, { planBlockId }, { userId }) => {
    requireAuth(userId);
    const block = await prisma.planBlock.findUnique({
      where: { id: planBlockId },
      include: { topic: true }
    });
    if (!block) throw new Error('Plan block not found');

    await prisma.planBlock.update({
      where: { id: planBlockId },
      data: { status: 'IN_PROGRESS' }
    });

    return prisma.studySession.create({
      data: {
        userId,
        topicId: block.topicId,
        planBlockId,
        startedAt: new Date()
      }
    });
  },
  endSession: async (_, { sessionId, energyLevel }, { userId }) => {
    requireAuth(userId);
    const session = await prisma.studySession.findUnique({
      where: { id: sessionId }
    });
    if (!session) throw new Error('Session not found');

    const endedAt = new Date();
    const durationMins = Math.round((endedAt.getTime() - session.startedAt.getTime()) / 60000);

    if (session.planBlockId) {
      await prisma.planBlock.update({
        where: { id: session.planBlockId },
        data: { status: 'COMPLETED' }
      });
    }

    // Log telemetry MLEvent
    try {
      const currentConfidence = await prisma.topicConfidence.findUnique({
        where: { userId_topicId: { userId, topicId: session.topicId } }
      });
      await prisma.mLEvent.create({
        data: {
          userId,
          topicId: session.topicId,
          confidenceBefore: currentConfidence ? currentConfidence.selfScore : null,
          sessionCompleted: true,
          timeSpentMins: durationMins,
          scheduledMins: session.planBlockId ? 60 : null,
          energyRating: energyLevel
        }
      });
    } catch (err) {
      console.warn('[Telemetry] Error creating MLEvent in endSession:', err.message);
    }

    return prisma.studySession.update({
      where: { id: sessionId },
      data: {
        endedAt,
        durationMins,
        energyLevel
      }
    });
  },
  saveQuizAttempt: async (_, { topicId, examId, score, questions, timeTakenSecs }, { userId }) => {
    requireAuth(userId);
    return prisma.quizAttempt.create({
      data: {
        userId,
        topicId,
        examId,
        score,
        questions,
        timeTakenSecs
      }
    });
  },
  markNotificationAsRead: async (_, { id }, { userId }) => {
    requireAuth(userId);
    const notification = await prisma.notification.findFirst({
      where: { id, userId }
    });
    if (!notification) throw new Error('Notification not found');
    return prisma.notification.update({
      where: { id },
      data: { readAt: new Date() }
    });
  },
  submitFeedback: async (_, { rating, feedbackType, message }, { userId }) => {
    requireAuth(userId);
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) throw new Error('User not found');

    await sendFeedbackEmail({
      userEmail: user.email,
      userName: user.name,
      rating,
      feedbackType,
      message
    });

    return true;
  },
  askAI: async (_, { topicId, message, chatHistory }, { userId }) => {
    requireAuth(userId);
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: { subTopics: true }
    });
    if (!topic) throw new Error('Topic not found');
    
    const subtopicNames = topic.subTopics.map(s => s.name);
    return askStudyAssistant({
      topicName: topic.name,
      subtopics: subtopicNames,
      message,
      chatHistory
    });
  },
  generateFlashcards: async (_, { topicId }, { userId }) => {
    requireAuth(userId);
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: { subTopics: true }
    });
    if (!topic) throw new Error('Topic not found');

    const subtopicNames = topic.subTopics.map(s => s.name);
    const cardData = await generateFlashcardsForTopic({
      topicName: topic.name,
      subtopics: subtopicNames
    });

    await prisma.flashcard.deleteMany({
      where: { topicId }
    });

    const createdCards = await Promise.all(
      cardData.map(c => 
        prisma.flashcard.create({
          data: {
            topicId,
            question: c.question,
            answer: c.answer
          }
        })
      )
    );

    return createdCards;
  },
  reviewFlashcard: async (_, { topicId, isCorrect }, { userId }) => {
    requireAuth(userId);
    
    const existingQueue = await prisma.spacedRepetitionQueue.findUnique({
      where: { userId_topicId: { userId, topicId } }
    });

    let easeFactor = existingQueue ? existingQueue.easeFactor : 2.5;
    let repetitionNum = existingQueue ? existingQueue.repetitionNum : 0;
    let intervalHours = 1;

    if (isCorrect) {
      repetitionNum += 1;
      if (repetitionNum === 1) {
        intervalHours = 4;
      } else if (repetitionNum === 2) {
        intervalHours = 12;
      } else {
        intervalHours = Math.round(existingQueue.intervalHours * easeFactor);
      }
      easeFactor = Math.max(1.3, easeFactor + 0.1);
    } else {
      repetitionNum = 1;
      intervalHours = 1;
      easeFactor = Math.max(1.3, easeFactor - 0.2);
    }

    const nextReviewAt = new Date(Date.now() + intervalHours * 3600000);

    if (existingQueue) {
      return prisma.spacedRepetitionQueue.update({
        where: { id: existingQueue.id },
        data: {
          nextReviewAt,
          intervalHours,
          easeFactor,
          repetitionNum
        }
      });
    }

    return prisma.spacedRepetitionQueue.create({
      data: {
        userId,
        topicId,
        nextReviewAt,
        intervalHours,
        easeFactor,
        repetitionNum
      }
    });
  },
  setExamScore: async (_, { examId, score }, { userId }) => {
    requireAuth(userId);
    const exam = await prisma.exam.update({
      where: { id: examId, userId },
      data: { finalScore: score }
    });

    try {
      const topics = await prisma.topic.findMany({ where: { examId } });
      const topicIds = topics.map(t => t.id);

      await prisma.mLEvent.updateMany({
        where: {
          userId,
          topicId: { in: topicIds },
          examScore: null
        },
        data: { examScore: score }
      });
    } catch (err) {
      console.warn('[Telemetry] Error retroactively updating exam score in MLEvents:', err.message);
    }

    return exam;
  },
  askPYQAssistant: async (_, { subject, question, solution }, { userId }) => {
    requireAuth(userId);
    const result = await askPYQAssistant({ subject, question, solution });
    return {
      hints: result.hints,
      predictedQuestions: result.predicted_questions,
      similarQuestions: result.similar_questions.map(s => ({
        question: s.question,
        solution: s.solution,
        subject: s.subject
      }))
    };
  },
  generateMockExam: async (_, { examId }, { userId }) => {
    requireAuth(userId);

    const exam = await prisma.exam.findUnique({
      where: { id: examId, userId },
      include: { topics: true }
    });
    if (!exam) throw new Error('Exam not found');

    const confidences = await prisma.topicConfidence.findMany({
      where: { userId, topic: { examId } }
    });

    const confMap = new Map(confidences.map(c => [c.topicId, c.calibratedScore]));
    
    const sortedTopics = [...exam.topics].sort((a, b) => {
      const confA = confMap.get(a.id) !== undefined ? confMap.get(a.id) : 0.5;
      const confB = confMap.get(b.id) !== undefined ? confMap.get(b.id) : 0.5;
      return confA - confB;
    });

    const weakTopics = sortedTopics.slice(0, 3);
    const questions = await generateMockExamForTopics({
      topics: weakTopics.map(t => ({ id: t.id, name: t.name }))
    });

    return questions;
  },
  gradeMockExam: async (_, { examId, answers, questionsJson }, { userId }) => {
    requireAuth(userId);

    const questions = JSON.parse(questionsJson);
    if (!Array.isArray(questions) || questions.length !== answers.length) {
      throw new Error('Invalid quiz answers or questions count');
    }

    let correctCount = 0;
    for (let i = 0; i < questions.length; i++) {
      if (questions[i].correctIndex === answers[i]) {
        correctCount += 1;
      }
    }

    const score = (correctCount / questions.length) * 100;
    const feedback = score >= 90 ? 'Perfect! You have mastered these topics.' :
                     score >= 70 ? 'Well done. Keep reviewing to lock in these concepts.' :
                     'Additional revision is recommended. Let Study Buddy assist you.';

    const topicId = questions[0]?.topicId;

    if (topicId) {
      await prisma.quizAttempt.create({
        data: {
          userId,
          topicId,
          examId,
          questions: questionsJson,
          score,
          timeTakenSecs: 180
        }
      });

      try {
        const lastConfidence = await prisma.topicConfidence.findUnique({
          where: { userId_topicId: { userId, topicId } }
        });
        const confBefore = lastConfidence ? lastConfidence.selfScore : 5.0;

        await prisma.mLEvent.create({
          data: {
            userId,
            topicId,
            confidenceBefore: confBefore,
            confidenceAfter: score / 10.0,
            sessionCompleted: true,
            timeSpentMins: 10,
            scheduledMins: 10,
            energyRating: 4,
            examScore: score
          }
        });
        console.log('[Telemetry] Logged Mock Exam result to MLEvent registry');
      } catch (err) {
        console.warn('[Telemetry] Failed to log Mock Exam MLEvent:', err.message);
      }
    }

    return {
      score,
      feedback,
      questionsCorrect: correctCount,
      totalQuestions: questions.length
    };
  }
};
