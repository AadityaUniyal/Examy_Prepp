const typeDefs = `
  scalar JSON

  enum UserRole {
    STUDENT
    ADMIN
    INSTITUTION_ADMIN
  }

  type User {
    id: ID!
    name: String!
    email: String!
    role: UserRole!
    createdAt: String!
    updatedAt: String!
  }

  type Exam {
    id: ID!
    name: String!
    examDate: String!
    board: String!
    totalMarks: Int
    topics: [Topic!]!
    createdAt: String!
  }

  type Topic {
    id: ID!
    name: String!
    weightage: Float!
    complexityScore: Float!
    estimatedHours: Float!
    parentTopicId: String
    subTopics: [Topic!]!
    createdAt: String!
  }

  type TopicConfidence {
    id: ID!
    selfScore: Float!
    calibratedScore: Float!
    revisionCount: Int!
    lastRevisedAt: String
  }

  type StudyPlan {
    id: ID!
    planType: String!
    totalHours: Float!
    isActive: Boolean!
    blocks: [PlanBlock!]!
    createdAt: String!
  }

  type PlanBlock {
    id: ID!
    topic: Topic!
    scheduledStart: String!
    durationMins: Int!
    blockType: String!
    status: String!
    priorityRank: Int!
  }

  type StudySession {
    id: ID!
    startedAt: String!
    endedAt: String
    durationMins: Int
  }

  type PredictionResult {
    lowScore: Float!
    highScore: Float!
    confidence: Float!
  }

  type QuizQuestion {
    id: ID!
    question: String!
    options: [String!]!
    correctIndex: Int!
    explanation: String!
    topic: String!
  }

  type Analytics {
    totalStudyHours: Float!
    sessionsCompleted: Int!
    averageEnergy: Float!
    topicBreakdown: [TopicBreakdownItem!]!
    weeklyHours: [Float!]!
  }

  type TopicBreakdownItem {
    topicName: String!
    hours: Float!
    confidence: Float!
  }

  type QuizAttempt {
    id: ID!
    score: Float!
    timeTakenSecs: Int!
    attemptedAt: String!
  }

  input TopicInput {
    name: String!
    weightage: Float!
    estimatedHours: Float!
  }

  type Query {
    me: User
    exam(id: ID!): Exam
    myExams: [Exam!]!
    topic(id: ID!): Topic
    topicConfidence(topicId: ID!): TopicConfidence
    activePlan: StudyPlan
    predictScore(examId: ID!): PredictionResult
    quizQuestions(topicId: ID!, count: Int): [QuizQuestion!]!
    myAnalytics: Analytics!
  }

  type Mutation {
    createExam(name: String!, examDate: String!, board: String!): Exam!
    addTopics(examId: ID!, topics: [TopicInput!]!): [Topic!]!
    updateConfidence(topicId: ID!, score: Float!): TopicConfidence!
    generatePlan(examId: ID!, planType: String!): StudyPlan!
    startSession(planBlockId: ID!): StudySession!
    endSession(sessionId: ID!, energyLevel: Int!): StudySession!
    saveQuizAttempt(topicId: ID!, examId: ID!, score: Float!, questions: JSON!, timeTakenSecs: Int!): QuizAttempt!
  }
`;

export default typeDefs;
