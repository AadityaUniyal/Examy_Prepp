from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class TopicExtract(BaseModel):
    name: str
    subtopics: List[str] = []
    estimated_complexity: float = 0.5


class SyllabusResponse(BaseModel):
    topics: List[TopicExtract]
    total_topics: int
    extraction_method: str


import pdfplumber
import os
import re
import json
import google.generativeai as genai

# Configure Gemini
api_key = os.environ.get("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

@router.post("/extract-syllabus", response_model=SyllabusResponse)
async def extract_syllabus(file: UploadFile = File(...)):
    try:
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files supported")

        logger.info(f"Received syllabus file: {file.filename}")

        # Extract text using pdfplumber
        extracted_text = ""
        with pdfplumber.open(file.file) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    extracted_text += page_text + "\n"

        if not extracted_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from the PDF file")

        topics = []
        method = "heuristic"

        # Try Gemini API if key is available
        if api_key:
            try:
                model = genai.GenerativeModel("gemini-1.5-flash")
                prompt = f"""
                Analyze the following exam syllabus text and extract the high-level topics and their subtopics.
                Assign an estimated complexity between 0.0 (easy) and 1.0 (very hard) for each main topic based on typical academic depth.
                Return the response ONLY as a JSON object inside a markdown code block matching this format:
                ```json
                {{
                  "topics": [
                    {{
                      "name": "Topic Name Here",
                      "subtopics": ["Subtopic A", "Subtopic B"],
                      "estimated_complexity": 0.6
                    }}
                  ]
                }}
                ```
                Syllabus text:
                {extracted_text[:12000]}
                """
                response = model.generate_content(prompt)
                match = re.search(r"```json\s*(.*?)\s*```", response.text, re.DOTALL)
                if match:
                    json_str = match.group(1)
                else:
                    json_str = response.text.strip()
                
                parsed = json.loads(json_str)
                for item in parsed.get("topics", []):
                    topics.append(TopicExtract(
                        name=item.get("name", ""),
                        subtopics=item.get("subtopics", []),
                        estimated_complexity=item.get("estimated_complexity", 0.5)
                    ))
                method = "gemini-1.5-flash"
            except Exception as gemini_err:
                logger.warning(f"Gemini syllabus extraction failed, falling back to heuristic: {gemini_err}")

        # Heuristic Fallback
        if not topics:
            # Parse lines starting with numbers/headers as topics
            lines = extracted_text.split("\n")
            current_topic = None
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                # Match numbered lists or section headers like "1. Physics" or "Chapter 2: Chemistry" or "Introduction"
                if re.match(r"^(?:(?:Chapter|Section|Unit|Module)\s+\d+|[IVXLCDM]+\.|\d+\.\d*)\s+\w+", line, re.IGNORECASE):
                    if current_topic:
                        topics.append(current_topic)
                    current_topic = TopicExtract(
                        name=line,
                        subtopics=[],
                        estimated_complexity=0.5
                    )
                elif current_topic and len(line) < 100:
                    current_topic.subtopics.append(line)
            
            if current_topic:
                topics.append(current_topic)
            
            # If nothing matched, chunk text into general categories
            if not topics:
                topics.append(TopicExtract(
                    name="General Syllabus Overview",
                    subtopics=[lines[i] for i in range(min(5, len(lines)))],
                    estimated_complexity=0.5
                ))

        return SyllabusResponse(
            topics=topics,
            total_topics=len(topics),
            extraction_method=method
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extracting syllabus: {e}")
        raise HTTPException(status_code=500, detail="Error extracting syllabus")


@router.post("/analyze-complexity")
async def analyze_complexity(text: str):
    word_count = len(text.split())
    avg_word_length = sum(len(w) for w in text.split()) / max(word_count, 1)
    complexity = min(1.0, (avg_word_length / 10) * 0.5 + (word_count / 1000) * 0.5)

    return {
        "complexity_score": round(complexity, 3),
        "word_count": word_count,
        "avg_word_length": round(avg_word_length, 2)
    }
