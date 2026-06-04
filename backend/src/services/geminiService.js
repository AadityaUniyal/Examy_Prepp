import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'mock_gemini_key');

/**
 * Perform a web search using Tavily API (free tier) or fallback to mock web results
 */
export async function searchWeb(query) {
  const apiKey = process.env.TAVILY_API_KEY;
  console.log(`[GeminiService] Searching the web for: "${query}"...`);

  if (!apiKey || apiKey === 'your_tavily_api_key_here') {
    console.warn('[GeminiService] TAVILY_API_KEY is not configured. Falling back to local educational reference mock.');
    // Educational mock fallback data for search queries
    return [
      {
        title: `${query} Overview`,
        content: `Search results for ${query}: This topic covers core concepts, calculations, and standard exam questions typically asked in secondary and university board exams.`,
        url: 'https://en.wikipedia.org/wiki/Special:Search?search=' + encodeURIComponent(query)
      },
      {
        title: `${query} Study Resources`,
        content: `Study guides and Previous Year Questions (PYQs) with step-by-step solutions for ${query}.`,
        url: 'https://khanacademy.org'
      }
    ];
  }

  try {
    const response = await axios.post('https://api.tavily.com/search', {
      api_key: apiKey,
      query: query,
      search_depth: 'basic',
      include_answer: false,
      max_results: 3
    });
    return response.data.results || [];
  } catch (err) {
    console.error('[GeminiService] Tavily search error:', err.message);
    return [];
  }
}

/**
 * Generate comprehensive study notes using Gemini 1.5 Flash (Free Tier)
 */
export async function generateStudyNotes({ topicName, syllabusContext }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'mock_gemini_key') {
    console.warn('[GeminiService] GEMINI_API_KEY not configured. Generating mock study notes.');
    return `
# Study Notes: ${topicName}

## 1. Core Introduction
This section details the fundamental aspects of **${topicName}** as aligned with the syllabus criteria.

## 2. Key Concepts & Formulas
* **Concept A**: Key definition, formula variations, and practical significance.
* **Concept B**: Interaction of variables, common mistakes to avoid during board prep.

## 3. Recommended Practice Questions
1. Define the core mechanism of ${topicName}.
2. Explain the step-by-step derivation of the primary formula.
    `;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const prompt = `
SYSTEM INSTRUCTIONS:
You are an elite exam preparation optimizer.
Your goal is to generate high-yield, structured, and comprehensive study notes optimized for active recall.

RULES:
1. Ground your explanations in concrete facts and clear equations.
2. Structure the notes with clear Markdown headers, bold definitions, key formulas, and bullet points.
3. Keep the tone academic, clear, and focused on quick understanding (sprinting).
4. Provide exactly 3 diverse practice questions (multiple choice, short answer, and calculation if applicable) mapped to Leitner active recall review steps.

FEW-SHOT TEMPLATE EXAMPLE:
Input Topic: "Mitosis"
Output Example:
# Study Notes: Mitosis
## 1. Overview
Mitosis is a process of nuclear division in eukaryotic cells that occurs when a parent cell divides to produce two identical daughter cells.
## 2. Key Stages
* **Prophase**: Chromatin condenses into visible chromosomes.
* **Metaphase**: Chromosomes align at the equator of the cell.
* **Anaphase**: Sister chromatids are pulled apart to opposite poles.
* **Telophase**: Nuclear envelopes reform around the two new nuclei.
## 3. Practice Questions
1. (Recall) What is the main structural event of Metaphase?
2. (Identify) In which stage do sister chromatids separate?
3. (Detail) Differentiate between cytokinesis and mitosis.

Target Topic to generate now: "${topicName}"
Syllabus Context:
${syllabusContext || 'General Exam Preparation'}
    `
    const result = await model.generateContent(prompt)
    return result.response.text()
  } catch (err) {
    console.error('[GeminiService] Study notes generation failed:', err.message);
    throw err;
  }
}

/**
 * Parse past paper text and generate structured PYQ set with answers (enriched by web search results)
 */
export async function generatePYQSet({ rawText, examName }) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  // 1. Enrich questions using free web search
  console.log(`[GeminiService] Extracting topics from PYQ text to initiate web search calibration...`);
  const searchQueries = [examName + ' practice questions', 'important questions for ' + examName];
  
  let webReferences = [];
  for (const q of searchQueries) {
    const results = await searchWeb(q);
    webReferences.push(...results);
  }

  const webContextText = webReferences.map(r => `Source: ${r.title}\nContent: ${r.content}`).join('\n\n');

  if (!apiKey || apiKey === 'mock_gemini_key') {
    return [
      {
        question: `Explain the core conceptual mechanism of ${examName}.`,
        answer: `Answer compiled using mock search data:\n${webContextText.substring(0, 300) || 'Conceptual outline details.'}`,
        marks: 5
      },
      {
        question: `Calculate or describe the primary formula variables relevant to ${examName}.`,
        answer: `Step-by-step derivation outline details based on references.`,
        marks: 10
      }
    ];
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const prompt = `
SYSTEM INSTRUCTIONS:
You are an expert exam coordinator and syllabus analyzer.
Your task is to parse raw Previous Year Question (PYQ) texts, extract clear questions, and generate comprehensive answers enriched by web search data.

RULES:
1. Identify individual questions from the raw text.
2. Write step-by-step, pedagogical answers using the provided web search context to ensure accuracy.
3. Estimate reasonable marks (e.g., 5 or 10 marks) based on question complexity.
4. Output ONLY a valid JSON array of objects as formatted in the schema below. No markdown wrappers (\`\`\`json), no trailing text.

OUTPUT SCHEMA:
[
  {
    "question": "The question string",
    "answer": "Detailed step-by-step verified answer",
    "marks": 5
  }
]

FEW-SHOT TEMPLATE EXAMPLE:
Web Search Context: "Photosynthesis is the process by which green plants use sunlight to synthesize nutrients from carbon dioxide and water. The light-dependent reactions occur in the thylakoid membranes."
Raw PYQ Text: "Q1. Detail the light reactions of photosynthesis. (5 marks)"
Output Example:
[
  {
    "question": "Detail the light reactions of photosynthesis.",
    "answer": "Photosynthesis light-dependent reactions occur in the thylakoid membranes of chloroplasts. Chlorophyll absorbs solar energy, splitting water molecules into oxygen and hydrogen ions (photolysis). This generates ATP and NADPH, which are subsequently utilized in the light-independent Calvin cycle.",
    "marks": 5
  }
]

Target Text to process now:
${rawText}

Web Search Reference Context:
${webContextText}
    `

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    
    // Simple json extractor helper in case the LLM wrapped it in markdown codeblocks
    const jsonStart = text.indexOf('[');
    const jsonEnd = text.lastIndexOf(']');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const cleanJson = text.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(cleanJson);
    }
    return JSON.parse(text);
  } catch (err) {
    console.error('[GeminiService] PYQ generation error:', err.message);
    // Safe fallback array
    return [
      {
        question: `Basic concept overview of ${examName}`,
        answer: `Refer to textbooks for full guidelines. Compiled search resources: ${webReferences.map(r => r.title).join(', ')}`,
        marks: 5
      }
    ];
  }
}
