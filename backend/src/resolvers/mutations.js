import { prisma } from '../index.js';
import { requireAuth } from '../middleware/auth.js';
import { calibrateConfidence } from '../services/mlService.js';

export default {
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

    // Calibrate score with ML integration layer
    const mlCalibration = await calibrateConfidence({
      selfScore: score,
      revisionCount: existingConfidence ? existingConfidence.revisionCount : 0
    });

    const calibrated = mlCalibration.calibratedScore;

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

    const hoursPerTopic = totalHours / Math.max(exam.topics.length, 1);
    const now = new Date();

    await Promise.all(
      exam.topics.map((topic, idx) =>
        prisma.planBlock.create({
          data: {
            planId: plan.id,
            topicId: topic.id,
            scheduledStart: new Date(now.getTime() + idx * hoursPerTopic * 3600000),
            durationMins: Math.round(hoursPerTopic * 60),
            blockType: 'STUDY',
            priorityRank: idx + 1
          }
        })
      )
    );

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
  }
};
