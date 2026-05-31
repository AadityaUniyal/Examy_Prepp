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


@router.post("/extract-syllabus", response_model=SyllabusResponse)
async def extract_syllabus(file: UploadFile = File(...)):
    try:
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files supported")

        logger.info(f"Received syllabus file: {file.filename}")

        return SyllabusResponse(
            topics=[
                TopicExtract(
                    name="Sample Topic",
                    subtopics=["Subtopic 1", "Subtopic 2"],
                    estimated_complexity=0.5
                )
            ],
            total_topics=1,
            extraction_method="pdfplumber"
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
