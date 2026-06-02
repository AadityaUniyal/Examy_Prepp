import { prisma } from '../prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { predictScore as mlPredictScore } from '../services/mlService.js';

export default {
  me: async (_, __, { userId }) => {
    requireAuth(userId);
    return prisma.user.findUnique({ where: { id: userId } });
  },
  user: async (_, { id, email }, { userId }) => {
    requireAuth(userId);
    
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) throw new Error('Unauthorized');

    // Allow Aaditya (admin/dev email) to search/reclarify any user connection
    const isDeveloper = currentUser.email === 'aadityacheeks@gmail.com' || currentUser.role === 'ADMIN';

    if (email) {
      if (currentUser.email !== email && !isDeveloper) {
        throw new Error('Access denied. You can only inspect your own details.');
      }
      return prisma.user.findUnique({ where: { email } });
    }

    if (id) {
      if (userId !== id && !isDeveloper) {
        throw new Error('Access denied. You can only inspect your own details.');
      }
      return prisma.user.findUnique({ where: { id } });
    }

    return null;
  },
  exam: async (_, { id }, { userId }) => {
    requireAuth(userId);
    return prisma.exam.findFirst({
      where: { id, userId },
      include: { topics: { include: { subTopics: true } } }
    });
  },
  myExams: async (_, __, { userId }) => {
    requireAuth(userId);
    return prisma.exam.findMany({
      where: { userId },
      include: { topics: true }
    });
  },
  topic: async (_, { id }, { userId }) => {
    requireAuth(userId);
    return prisma.topic.findFirst({
      where: { id, exam: { userId } },
      include: { subTopics: true }
    });
  },
  topicConfidence: async (_, { topicId }, { userId }) => {
    requireAuth(userId);
    return prisma.topicConfidence.findUnique({
      where: { userId_topicId: { userId, topicId } }
    });
  },
  activePlan: async (_, __, { userId }) => {
    requireAuth(userId);
    return prisma.studyPlan.findFirst({
      where: { userId, isActive: true },
      include: {
        blocks: {
          include: { topic: true },
          orderBy: { scheduledStart: 'asc' }
        }
      }
    });
  },
  predictScore: async (_, { examId }, { userId }) => {
    requireAuth(userId);
    const confidences = await prisma.topicConfidence.findMany({
      where: { userId, topic: { examId } },
      include: { topic: true }
    });

    const quizAttempts = await prisma.quizAttempt.findMany({
      where: { userId, examId }
    });

    const studySessions = await prisma.studySession.findMany({
      where: { userId, topic: { examId } }
    });

    const activePlan = await prisma.studyPlan.findFirst({
      where: { userId, examId, isActive: true }
    });

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { topics: true }
    });

    const confidenceScores = confidences.map(c => c.calibratedScore);
    const quizScores = quizAttempts.map(q => q.score);
    const studyHoursCompleted = studySessions.reduce((sum, s) => sum + (s.durationMins || 0) / 60, 0);
    const totalStudyHoursPlanned = activePlan ? activePlan.totalHours : 0;
    const now = new Date();
    const daysUntilExam = exam ? Math.max(1, Math.ceil((new Date(exam.examDate).getTime() - now.getTime()) / (1000 * 3600 * 24))) : 5;

    // Delegate prediction to ML service
    const predictionResult = await mlPredictScore({
      confidenceScores,
      quizScores,
      studyHoursCompleted,
      totalStudyHoursPlanned,
      daysUntilExam,
      topicCount: exam ? exam.topics.length : 1
    });

    return {
      lowScore: predictionResult.lowScore,
      highScore: predictionResult.highScore,
      confidence: predictionResult.confidence,
    };
  },
  quizQuestions: async (_, { topicId, count = 5 }, { userId }) => {
    requireAuth(userId);
    // Question bank categorized by patterns in the topic name
    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    const name = (topic?.name || '').toLowerCase();

    // Sample question bank categorized under: biology, physics, chemistry
    const biologyQuestions = [
      {
        id: "bio-1",
        question: "Which organelle is known as the powerhouse of the cell?",
        options: ["Nucleus", "Mitochondria", "Ribosome", "Endoplasmic Reticulum"],
        correctIndex: 1,
        explanation: "Mitochondria generate most of the cell's chemical energy in the form of ATP.",
        topic: topic?.name || "Biology"
      },
      {
        id: "bio-2",
        question: "What is the primary pigment used by plants to absorb light during photosynthesis?",
        options: ["Carotenoid", "Chlorophyll", "Xanthophyll", "Anthocyanin"],
        correctIndex: 1,
        explanation: "Chlorophyll absorbs blue and red light while reflecting green, giving plants their green color.",
        topic: topic?.name || "Biology"
      },
      {
        id: "bio-3",
        question: "Which of the following represents the correct sequence of mitosis stages?",
        options: ["Prophase, Metaphase, Anaphase, Telophase", "Metaphase, Prophase, Anaphase, Telophase", "Prophase, Anaphase, Metaphase, Telophase", "Interphase, Prophase, Metaphase, Anaphase"],
        correctIndex: 0,
        explanation: "Mitosis progresses through Prophase, Metaphase, Anaphase, and Telophase (PMAT).",
        topic: topic?.name || "Biology"
      },
      {
        id: "bio-4",
        question: "What is the genetic material of most living organisms?",
        options: ["RNA", "Protein", "DNA", "Lipid"],
        correctIndex: 2,
        explanation: "Deoxyribonucleic acid (DNA) is the molecule that carries genetic instructions in almost all living organisms.",
        topic: topic?.name || "Biology"
      },
      {
        id: "bio-5",
        question: "Which blood type is known as the universal donor?",
        options: ["Type A", "Type B", "Type AB", "Type O negative"],
        correctIndex: 3,
        explanation: "O negative red blood cells can be transfused to patients of any blood type.",
        topic: topic?.name || "Biology"
      }
    ];

    const physicsQuestions = [
      {
        id: "phy-1",
        question: "What is the SI unit of force?",
        options: ["Joule", "Watt", "Newton", "Pascal"],
        correctIndex: 2,
        explanation: "The Newton (N) is the SI derived unit of force, defined as 1 kg·m/s².",
        topic: topic?.name || "Physics"
      },
      {
        id: "phy-2",
        question: "According to Newton's First Law of Motion, an object at rest will remain at rest unless acted upon by what?",
        options: ["A balanced force", "An unbalanced force", "Friction", "Gravity"],
        correctIndex: 1,
        explanation: "An object remains at rest or in uniform motion unless acted upon by a net external (unbalanced) force.",
        topic: topic?.name || "Physics"
      },
      {
        id: "phy-3",
        question: "Which type of electromagnetic radiation has the shortest wavelength?",
        options: ["Radio waves", "Infrared", "Ultraviolet", "Gamma rays"],
        correctIndex: 3,
        explanation: "Gamma rays have the shortest wavelengths and the highest energy in the electromagnetic spectrum.",
        topic: topic?.name || "Physics"
      },
      {
        id: "phy-4",
        question: "What is the acceleration due to gravity on the surface of the Earth?",
        options: ["9.8 m/s²", "8.9 m/s²", "1.6 m/s²", "12.0 m/s²"],
        correctIndex: 0,
        explanation: "The standard acceleration due to gravity on Earth is approximately 9.80665 m/s².",
        topic: topic?.name || "Physics"
      },
      {
        id: "phy-5",
        question: "What physical quantity is defined as the rate of doing work?",
        options: ["Energy", "Power", "Momentum", "Velocity"],
        correctIndex: 1,
        explanation: "Power is the rate at which work is done or energy is transferred (Work/Time).",
        topic: topic?.name || "Physics"
      }
    ];

    const chemistryQuestions = [
      {
        id: "chem-1",
        question: "What is the chemical symbol for Gold?",
        options: ["Go", "Gd", "Au", "Ag"],
        correctIndex: 2,
        explanation: "The symbol Au comes from the Latin word for gold, 'aurum'.",
        topic: topic?.name || "Chemistry"
      },
      {
        id: "chem-2",
        question: "What is the pH level of pure water?",
        options: ["5", "7", "9", "14"],
        correctIndex: 1,
        explanation: "Pure water is neutral and has a pH of 7 at 25 degrees Celsius.",
        topic: topic?.name || "Chemistry"
      },
      {
        id: "chem-3",
        question: "Which gas is most abundant in the Earth's atmosphere?",
        options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"],
        correctIndex: 2,
        explanation: "Nitrogen makes up approximately 78% of the Earth's atmosphere.",
        topic: topic?.name || "Chemistry"
      },
      {
        id: "chem-4",
        question: "What type of bond is formed when electrons are shared between two atoms?",
        options: ["Ionic bond", "Covalent bond", "Hydrogen bond", "Metallic bond"],
        correctIndex: 1,
        explanation: "Covalent bonding involves the sharing of electron pairs between atoms.",
        topic: topic?.name || "Chemistry"
      },
      {
        id: "chem-5",
        question: "What is the atomic number of Hydrogen?",
        options: ["1", "2", "3", "4"],
        correctIndex: 0,
        explanation: "Hydrogen has one proton, giving it an atomic number of 1.",
        topic: topic?.name || "Chemistry"
      }
    ];

    let questions = biologyQuestions;
    if (name.includes('phys') || name.includes('kin') || name.includes('force') || name.includes('mechanic')) {
      questions = physicsQuestions;
    } else if (name.includes('chem') || name.includes('acid') || name.includes('bond') || name.includes('atom')) {
      questions = chemistryQuestions;
    }

    return questions.slice(0, count);
  },
  myAnalytics: async (_, __, { userId }) => {
    requireAuth(userId);
    const sessions = await prisma.studySession.findMany({
      where: { userId, endedAt: { not: null } },
      include: { topic: true }
    });

    const totalStudyHours = sessions.reduce((acc, s) => acc + (s.durationMins || 0) / 60, 0);
    const sessionsCompleted = sessions.length;
    
    let energySum = 0;
    let energyCount = 0;
    for (const s of sessions) {
      if (s.energyLevel !== null && s.energyLevel !== undefined) {
        energySum += s.energyLevel;
        energyCount++;
      }
    }
    const averageEnergy = energyCount > 0 ? energySum / energyCount : 5.0;

    // Gather topic breakdown hours and average confidence
    const topicMap = {};
    for (const s of sessions) {
      const name = s.topic.name;
      if (!topicMap[name]) {
        topicMap[name] = { hours: 0, confidence: 5 };
      }
      topicMap[name].hours += (s.durationMins || 0) / 60;
    }

    // Pull confidences to populate
    const confidences = await prisma.topicConfidence.findMany({
      where: { userId }
    });
    for (const conf of confidences) {
      const topic = await prisma.topic.findUnique({ where: { id: conf.topicId } });
      if (topic && topicMap[topic.name]) {
        topicMap[topic.name].confidence = conf.selfScore;
      }
    }

    const topicBreakdown = Object.entries(topicMap).map(([topicName, data]) => ({
      topicName,
      hours: data.hours,
      confidence: data.confidence
    }));

    // Weekly progression: standard mockup for visual components
    return {
      totalStudyHours,
      sessionsCompleted,
      averageEnergy,
      topicBreakdown,
      weeklyHours: [2.5, 4.0, 1.5, 5.0, 3.0, 4.5, totalStudyHours]
    };
  },
  myNotifications: async (_, __, { userId }) => {
    requireAuth(userId);
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  },
  myFlashcards: async (_, { topicId }, { userId }) => {
    requireAuth(userId);
    return prisma.flashcard.findMany({
      where: { topicId, topic: { exam: { userId } } },
      orderBy: { createdAt: 'asc' }
    });
  },
  monteCarloSimulation: async (_, { examId }, { userId }) => {
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

    const quizAttempts = await prisma.quizAttempt.findMany({
      where: { userId, examId }
    });
    const avgQuizScore = quizAttempts.length > 0 ? quizAttempts.reduce((sum, q) => sum + q.score, 0) / quizAttempts.length : 70.0;

    const studySessions = await prisma.studySession.findMany({
      where: { userId, topic: { examId }, endedAt: { not: null } }
    });
    const studyHoursCompleted = studySessions.reduce((sum, s) => sum + (s.durationMins || 0) / 60, 0);

    const activePlan = await prisma.studyPlan.findFirst({
      where: { userId, examId, isActive: true }
    });
    const totalStudyHoursPlanned = activePlan ? activePlan.totalHours : 48.0;
    const studyCompletion = totalStudyHoursPlanned > 0 ? Math.min(1.0, studyHoursCompleted / totalStudyHoursPlanned) : 1.0;

    let avgConfidence = 0.5;
    if (exam.topics.length > 0) {
      let sumConf = 0;
      for (const t of exam.topics) {
        sumConf += confMap.has(t.id) ? confMap.get(t.id) : 0.5;
      }
      avgConfidence = sumConf / exam.topics.length;
    }

    const baseScore = (avgConfidence * 0.4 + (avgQuizScore / 100) * 0.4 + studyCompletion * 0.2) * 100;

    const trials = 10000;
    let scoreSum = 0;
    let countAbove75 = 0;
    let countAbove90 = 0;
    
    const bins = {
      'Under 50%': 0,
      '50-60%': 0,
      '60-70%': 0,
      '70-80%': 0,
      '80-90%': 0,
      '90-100%': 0
    };

    const gaussianRandom = () => {
      let u = 0, v = 0;
      while(u === 0) u = Math.random(); 
      while(v === 0) v = Math.random();
      return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    };

    for (let i = 0; i < trials; i++) {
      const noise = gaussianRandom() * 7.5;
      let simulatedScore = baseScore + noise;
      simulatedScore = Math.max(0, Math.min(100, simulatedScore));

      scoreSum += simulatedScore;
      if (simulatedScore >= 75) countAbove75++;
      if (simulatedScore >= 90) countAbove90++;

      if (simulatedScore < 50) bins['Under 50%']++;
      else if (simulatedScore < 60) bins['50-60%']++;
      else if (simulatedScore < 70) bins['60-70%']++;
      else if (simulatedScore < 80) bins['70-80%']++;
      else if (simulatedScore < 90) bins['80-90%']++;
      else bins['90-100%']++;
    }

    const averageScore = scoreSum / trials;
    const probabilityAbove75 = (countAbove75 / trials) * 100;
    const probabilityAbove90 = (countAbove90 / trials) * 100;

    const distribution = Object.entries(bins).map(([scoreRange, count]) => ({
      scoreRange,
      percentage: (count / trials) * 100
    }));

    let recommendation = 'Your prep is balanced. Keep executing your blocks!';
    if (averageScore < 60) {
      recommendation = '⚠️ Focus: Critical gaps detected. Take high-weightage quizzes to quickly calibrate and boost core topics.';
    } else if (probabilityAbove75 > 80 && probabilityAbove90 < 20) {
      recommendation = '👍 Good Shape: You have a high chance of passing. Focus on your medium-confidence topics to break into the 90%+ range!';
    } else if (probabilityAbove90 > 50) {
      recommendation = '🔥 Excellent! Prepare for minor revisions, rest well, and maintain your streak. You are fully calibrated.';
    }

    return {
      trials,
      averageScore,
      probabilityAbove75,
      probabilityAbove90,
      distribution,
      recommendation
    };
  },
  flashcardStats: async (_, { examId }, { userId }) => {
    requireAuth(userId);

    const exam = await prisma.exam.findUnique({
      where: { id: examId, userId },
      include: { topics: { include: { flashcards: true } } }
    });
    if (!exam) throw new Error('Exam not found');

    const topics = exam.topics;
    const totalCards = topics.reduce((sum, t) => sum + t.flashcards.length, 0);

    const queueItems = await prisma.spacedRepetitionQueue.findMany({
      where: { userId, topicId: { in: topics.map(t => t.id) } }
    });

    const queueMap = new Map(queueItems.map(q => [q.topicId, q]));

    let masteredTopics = 0;
    let learningTopics = 0;
    let notStartedTopics = 0;
    let totalEaseFactor = 0;
    let overdueCount = 0;

    const now = new Date();

    for (const t of topics) {
      const q = queueMap.get(t.id);
      if (!q) {
        notStartedTopics += 1;
      } else {
        totalEaseFactor += q.easeFactor;
        if (new Date(q.nextReviewAt) < now) {
          overdueCount += 1;
        }
        if (q.intervalHours > 24) {
          masteredTopics += 1;
        } else {
          learningTopics += 1;
        }
      }
    }

    const averageEaseFactor = queueItems.length > 0 ? (totalEaseFactor / queueItems.length) : 2.5;

    return {
      totalCards,
      masteredTopics,
      learningTopics,
      notStartedTopics,
      averageEaseFactor,
      overdueCount
    };
  }
};
