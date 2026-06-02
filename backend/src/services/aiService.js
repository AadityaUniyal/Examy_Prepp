import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';
let genAI = null;
let model = null;

if (apiKey) {
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  } catch (err) {
    console.error('[AIService] Failed to initialize Gemini API Client:', err.message);
  }
}

/**
 * Ask the Gemini study assistant for a topic
 */
export async function askStudyAssistant({ topicName, subtopics, message, chatHistory }) {
  console.log(`[AIService] Assistant query for topic: ${topicName}`);

  if (!model) {
    console.warn('[AIService] Gemini model not configured. Using mock study buddy response...');
    return `Hello! (Note: Gemini API key is missing. This is a simulated Study Buddy response).

Studying **${topicName}** is essential. Here's a brief review:
- Subtopics include: ${subtopics && subtopics.length > 0 ? subtopics.join(', ') : 'General concepts'}.
- Key Tip: Break this topic into small parts and write summary notes.

You asked: "${message}". Let me know if you want to generate practice flashcards for this topic!`;
  }

  // Format chat history for Gemini API
  // Gemini expects history formatted with role: "user" | "model" and parts: [{ text: "..." }]
  const formattedHistory = (chatHistory || []).map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const systemInstruction = `You are a helpful, encouraging, and highly intelligent AI study assistant named ExamEve Study Buddy.
You are helping a student prepare for their exam on the topic "${topicName}".
The topic covers subtopics: ${subtopics && subtopics.length > 0 ? subtopics.join(', ') : 'general curriculum outline'}.
Explain concepts clearly. Use formatting like bullet points and bold headers. Keep answers relatively concise and easy to read.`;

  try {
    const chat = model.startChat({
      history: formattedHistory,
      systemInstruction: systemInstruction
    });

    const result = await chat.sendMessage(message);
    return result.response.text();
  } catch (err) {
    console.error('[AIService] Gemini query failed:', err.message);
    throw new Error('AI Assistant request failed: ' + err.message);
  }
}

/**
 * Generate 5 active-recall flashcards for a topic
 */
export async function generateFlashcardsForTopic({ topicName, subtopics }) {
  console.log(`[AIService] Generating flashcards for topic: ${topicName}`);

  if (!model) {
    console.warn('[AIService] Gemini model not configured. Returning mock flashcards...');
    return [
      {
        question: `What is the primary objective of studying ${topicName}?`,
        answer: `To understand the core mechanisms and foundational concepts of ${topicName} as outlined in the syllabus.`
      },
      {
        question: `List the major subtopics involved in ${topicName}.`,
        answer: `The primary subtopics include: ${subtopics && subtopics.length > 0 ? subtopics.join(', ') : 'general overview and application modules'}.`
      },
      {
        question: `Name one common mistake students make when studying ${topicName}.`,
        answer: `Focusing only on passive reading rather than utilizing active recall and mock quiz questions.`
      },
      {
        question: `How does ${topicName} relate to other exam subjects?`,
        answer: `It serves as a key building block that connects theoretical concepts to practical problem-solving formats.`
      },
      {
        question: `Give a key study tip for mastering ${topicName}.`,
        answer: `Do active practice quizzes and review flashcards repeatedly over space-separated study sessions.`
      }
    ];
  }

  const prompt = `You are an expert tutor. Create exactly 5 review flashcards for the topic "${topicName}" with subtopics: ${subtopics && subtopics.length > 0 ? subtopics.join(', ') : 'general curriculum outline'}.
Each flashcard must contain:
1. "question": A concise, clear question designed for active recall.
2. "answer": A comprehensive, clear explanation.

Return the response ONLY as a JSON array inside a markdown code block matching this format:
\`\`\`json
[
  {
    "question": "Question text here?",
    "answer": "Answer explanation here."
  }
]
\`\`\`
Do not include any additional commentary or text.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    let jsonStr = match ? match[1] : text.trim();

    // Parse cards
    const cards = JSON.parse(jsonStr);
    if (!Array.isArray(cards)) {
      throw new Error('Response is not a JSON array');
    }

    return cards.map(c => ({
      question: c.question || 'Review Question?',
      answer: c.answer || 'Review Answer.'
    }));
  } catch (err) {
    console.error('[AIService] Failed to parse generated flashcards:', err.message);
    throw new Error('Flashcard generation failed: ' + err.message);
  }
}

/**
 * Generate 5 active-recall mock exam questions for selected topics
 */
export async function generateMockExamForTopics({ topics }) {
  console.log(`[AIService] Generating mock exam for topics: ${topics.map(t => t.name).join(', ')}`);

  if (!model) {
    console.warn('[AIService] Gemini model not configured. Returning mock exam questions...');
    return [
      {
        id: "mock-q-1",
        question: `Which of the following is a primary concept covered in ${topics[0]?.name || 'the curriculum'}?`,
        options: ["Passive reading only", "Active recall and spaced repetition", "Cramming the night before", "Skipping practice questions"],
        correctIndex: 1,
        explanation: "Active recall and spaced repetition are scientifically proven study methods that maximize memory retention.",
        topicId: topics[0]?.id || "topic-1"
      },
      {
        id: "mock-q-2",
        question: `When analyzing ${topics[1]?.name || 'difficult subjects'}, what does a low confidence score indicate?`,
        options: ["You are ready for the exam", "You should skip studying this topic", "You should prioritize revision and focus blocks", "You have completed the syllabus"],
        correctIndex: 2,
        explanation: "Low confidence scores flag areas where conceptual understanding is weak, signaling that study blocks should be scheduled.",
        topicId: topics[1]?.id || topics[0]?.id || "topic-1"
      },
      {
        id: "mock-q-3",
        question: `How does the ExamEve scheduler optimize blocks for ${topics[2]?.name || topics[0]?.name || 'key topics'}?`,
        options: ["By scheduling 10-hour cram sessions", "By dynamic prioritization, interleaving revision and break blocks", "By keeping the schedule static", "By ignoring quiz attempts"],
        correctIndex: 1,
        explanation: "ExamEve employs dynamic prioritization to structure study, revision, and break blocks around key concepts.",
        topicId: topics[2]?.id || topics[0]?.id || "topic-1"
      },
      {
        id: "mock-q-4",
        question: "What is the key benefit of taking mock exams during preparation?",
        options: ["Increasing exam-day anxiety", "Calibrating self-reported confidence against actual scores", "Avoiding revision cycles", "Decreasing study consistency"],
        correctIndex: 1,
        explanation: "Mock exams provide a telemetry loop that calibrates confidence scores against objective performance outcomes.",
        topicId: topics[0]?.id || "topic-1"
      },
      {
        id: "mock-q-5",
        question: "How does the Spaced Repetition ease factor adjust after a correct response?",
        options: ["It decreases significantly", "It remains completely unchanged", "It increases, lengthening the interval until next review", "It resets to 1.0"],
        correctIndex: 2,
        explanation: "Correct reviews increase the ease factor, which lengthens intervals between reviews according to the SM2 algorithm.",
        topicId: topics[0]?.id || "topic-1"
      }
    ];
  }

  const prompt = `You are an expert academic evaluator. Create a high-quality mock exam consisting of exactly 5 multiple choice questions.
The questions must focus on the following topics:
${topics.map(t => `- Topic Name: "${t.name}" (ID: "${t.id}")`).join('\n')}

For each question:
1. Provide a clear, challenging question.
2. Provide exactly 4 options.
3. Specify the "correctIndex" (0, 1, 2, or 3).
4. Provide a detailed "explanation" of the correct answer.
5. Set "topicId" to the specific Topic ID listed above that the question addresses.

Return the response ONLY as a JSON array inside a markdown code block matching this format:
\`\`\`json
[
  {
    "id": "q-1",
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Explanation here.",
    "topicId": "topic-id-from-input"
  }
]
\`\`\`
Do not include any additional commentary or text.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    let jsonStr = match ? match[1] : text.trim();

    const questions = JSON.parse(jsonStr);
    if (!Array.isArray(questions)) {
      throw new Error('Response is not a JSON array');
    }

    return questions.map((q, idx) => ({
      id: q.id || `exam-q-${idx + 1}`,
      question: q.question || 'Exam Question?',
      options: q.options || ['Option A', 'Option B', 'Option C', 'Option D'],
      correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
      explanation: q.explanation || 'No explanation provided.',
      topicId: q.topicId || topics[0]?.id || 'topic-id'
    }));
  } catch (err) {
    console.error('[AIService] Failed to parse generated mock exam questions:', err.message);
    throw new Error('Mock exam generation failed: ' + err.message);
  }
}

