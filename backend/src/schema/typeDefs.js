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
    googleId: String
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
    finalScore: Float
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

  type AuthResponse {
    token: String!
    user: User!
  }

  type Notification {
    id: ID!
    type: String!
    message: String!
    readAt: String
    createdAt: String!
  }

  type Flashcard {
    id: ID!
    topicId: ID!
    question: String!
    answer: String!
    createdAt: String!
  }

  type SimulationRun {
    trials: Int!
    averageScore: Float!
    probabilityAbove75: Float!
    probabilityAbove90: Float!
    distribution: [SimulationPoint!]!
    recommendation: String!
  }

  type SimulationPoint {
    scoreRange: String!
    percentage: Float!
  }

  type SpacedRepetitionQueue {
    id: ID!
    topicId: ID!
    nextReviewAt: String!
    intervalHours: Float!
    repetitionNum: Int!
    easeFactor: Float!
  }

  type SimilarQuestion {
    question: String!
    solution: String
    subject: String!
  }

  type PYQResponse {
    hints: String!
    predictedQuestions: [String!]!
    similarQuestions: [SimilarQuestion!]!
  }

  type FlashcardStats {
    totalCards: Int!
    masteredTopics: Int!
    learningTopics: Int!
    notStartedTopics: Int!
    averageEaseFactor: Float!
    overdueCount: Int!
  }

  type MockExamQuestion {
    id: ID!
    question: String!
    options: [String!]!
    correctIndex: Int!
    explanation: String!
    topicId: ID!
  }

  type MockExamGrade {
    score: Float!
    feedback: String!
    questionsCorrect: Int!
    totalQuestions: Int!
  }

  type Query {
    me: User
    user(id: ID, email: String): User
    exam(id: ID!): Exam
    myExams: [Exam!]!
    topic(id: ID!): Topic
    topicConfidence(topicId: ID!): TopicConfidence
    activePlan: StudyPlan
    predictScore(examId: ID!): PredictionResult
    quizQuestions(topicId: ID!, count: Int): [QuizQuestion!]!
    myAnalytics: Analytics!
    myNotifications: [Notification!]!
    myFlashcards(topicId: ID!): [Flashcard!]!
    monteCarloSimulation(examId: ID!): SimulationRun!
    flashcardStats(examId: ID!): FlashcardStats!
  }

  type Mutation {
    loginWithGoogle(email: String!, name: String!, googleId: String): AuthResponse!
    createExam(name: String!, examDate: String!, board: String!): Exam!
    addTopics(examId: ID!, topics: [TopicInput!]!): [Topic!]!
    updateConfidence(topicId: ID!, score: Float!): TopicConfidence!
    generatePlan(examId: ID!, planType: String!): StudyPlan!
    startSession(planBlockId: ID!): StudySession!
    endSession(sessionId: ID!, energyLevel: Int!): StudySession!
    saveQuizAttempt(topicId: ID!, examId: ID!, score: Float!, questions: JSON!, timeTakenSecs: Int!): QuizAttempt!
    markNotificationAsRead(id: ID!): Notification!
    submitFeedback(rating: Int!, feedbackType: String!, message: String!): Boolean!
    askAI(topicId: ID!, message: String!, chatHistory: JSON): String!
    generateFlashcards(topicId: ID!): [Flashcard!]!
    reviewFlashcard(topicId: ID!, isCorrect: Boolean!): SpacedRepetitionQueue!
    setExamScore(examId: ID!, score: Float!): Exam!
    askPYQAssistant(subject: String!, question: String!, solution: String): PYQResponse!
    generateMockExam(examId: ID!): [MockExamQuestion!]!
    gradeMockExam(examId: ID!, answers: [Int!]!, questionsJson: String!): MockExamGrade!
  }
`;

export default typeDefs;
