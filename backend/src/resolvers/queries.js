import { prisma } from '../index.js';
import { requireAuth } from '../middleware/auth.js';
import { predictScore as mlPredictScore } from '../services/mlService.js';

export default {
  me: async (_, __, { userId }) => {
    requireAuth(userId);
    return prisma.user.findUnique({ where: { id: userId } });
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

    // Delegate prediction to ML service
    const predictionResult = await mlPredictScore({ confidences });
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
  }
};
