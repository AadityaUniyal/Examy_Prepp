from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
import logging
import chromadb
from sentence_transformers import SentenceTransformer
import google.generativeai as genai

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize ChromaDB persistent client and collection
try:
    chroma_client = chromadb.PersistentClient(path="data/chroma_db")
    collection = chroma_client.get_or_create_collection(name="pyq_collection")
    logger.info("Connected to ChromaDB pyq_collection")
except Exception as e:
    logger.error(f"Failed to connect to ChromaDB: {e}")
    collection = None

# Initialize SentenceTransformer embedding model
try:
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    logger.info("Loaded SentenceTransformer all-MiniLM-L6-v2 model")
except Exception as e:
    logger.error(f"Failed to load SentenceTransformer: {e}")
    embedding_model = None

# Initialize Gemini API for RAG responses
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel("gemini-1.5-flash")
else:
    gemini_model = None

class PYQRequest(BaseModel):
    subject: str
    question: str
    solution: Optional[str] = None

class SimilarQuestionModel(BaseModel):
    question: str
    solution: Optional[str] = None
    subject: str

class PYQResponse(BaseModel):
    hints: str
    predicted_questions: List[str]
    similar_questions: List[SimilarQuestionModel]

@router.post("/pyq-assistant", response_model=PYQResponse)
async def pyq_assistant(request: PYQRequest):
    try:
        similar_results = []
        context_str = ""
        
        if collection is not None and embedding_model is not None:
            try:
                count = collection.count()
                if count > 0:
                    query_vector = embedding_model.encode(request.question).tolist()
                    results = collection.query(
                        query_embeddings=[query_vector],
                        n_results=min(3, count)
                    )
                    
                    if results and "documents" in results and results["documents"]:
                        documents = results["documents"][0]
                        metadatas = results["metadatas"][0] if "metadatas" in results else []
                        
                        for idx, doc in enumerate(documents):
                            meta = metadatas[idx] if idx < len(metadatas) else {}
                            sol = meta.get("solution", "")
                            sub = meta.get("subject", "")
                            similar_results.append(
                                SimilarQuestionModel(
                                    question=doc,
                                    solution=sol,
                                    subject=sub
                                )
                            )
                            context_str += f"\n- Similar PYQ on {sub}: {doc}\n  Solution / Steps: {sol if sol else 'Not provided'}\n"
            except Exception as db_err:
                logger.error(f"Failed to query ChromaDB for similar questions: {db_err}")
        
        if gemini_model is not None:
            prompt = (
                f"You are an expert academic tutor and exam predictor. A student has submitted a previous year question (PYQ) or doubt.\n"
                f"Analyze the concept of the question and provide:\n"
                f"1. Hints & Steps: A clear explanation of the core concept and step-by-step guidance/hints on how to solve this question.\n"
                f"2. Possible/Predicted Questions: Exactly 3 potential new questions that can test this same core concept under different scenarios or numbers.\n\n"
                f"Student Subject: {request.subject}\n"
                f"Student Question: {request.question}\n"
                f"Student Provided Solution: {request.solution if request.solution else 'None'}\n\n"
            )
            
            if context_str:
                prompt += (
                    f"Here is some relevant context from previous questions the student has solved successfully:\n"
                    f"{context_str}\n"
                    f"Use this context to tailor your hint explanation and make connections if appropriate.\n\n"
                )
                
            prompt += (
                "Provide your response in the following structured format:\n"
                "---HINTS---\n"
                "[Your step-by-step guidance and hints here]\n"
                "---QUESTIONS---\n"
                "Question 1: [Predicted question 1]\n"
                "Question 2: [Predicted question 2]\n"
                "Question 3: [Predicted question 3]\n"
            )
            
            response = gemini_model.generate_content(
                prompt,
                generation_config={"temperature": 0.3}
            )
            text_response = response.text
            
            hints = ""
            predicted_questions = []
            
            if "---HINTS---" in text_response and "---QUESTIONS---" in text_response:
                parts = text_response.split("---QUESTIONS---")
                hints = parts[0].replace("---HINTS---", "").strip()
                questions_raw = parts[1].strip().split("\n")
                for q in questions_raw:
                    q_clean = q.strip()
                    if q_clean.lower().startswith("question"):
                        if ":" in q_clean:
                            predicted_questions.append(q_clean.split(":", 1)[1].strip())
                        else:
                            predicted_questions.append(q_clean)
            else:
                hints = text_response
                predicted_questions = [
                    "What are the main assumptions of the model described?",
                    "Can you apply this concept to a different set of boundary conditions?",
                    "Describe a practical application of this principle."
                ]
        else:
            hints = (
                f"To solve this **{request.subject}** question, follow these steps:\n"
                f"1. Identify the core parameters and what the question is asking for.\n"
                f"2. Recall the relevant formulas for {request.subject} models.\n"
                f"3. Break the problem into sub-problems: calculate intermediate variables first.\n"
                f"(Note: Gemini API Key is missing, this is a simulated response)."
            )
            predicted_questions = [
                f"Derive the formula used to solve the question for {request.subject}.",
                f"What happens to the outcome if we double the main input variable?",
                f"Explain the primary physical/theoretical limits of this concept."
            ]

        if collection is not None and embedding_model is not None:
            try:
                import hashlib
                doc_id = hashlib.md5(request.question.encode("utf-8")).hexdigest()
                vector = embedding_model.encode(request.question).tolist()
                
                collection.add(
                    documents=[request.question],
                    embeddings=[vector],
                    metadatas=[{
                        "subject": request.subject,
                        "solution": request.solution if request.solution else (hints if gemini_model else "Mock solution")
                    }],
                    ids=[doc_id]
                )
                logger.info(f"Successfully added question {doc_id} to ChromaDB pyq_collection")
            except Exception as e:
                logger.error(f"Failed to save question to ChromaDB: {e}")

        return PYQResponse(
            hints=hints,
            predicted_questions=predicted_questions,
            similar_questions=similar_results
        )

    except Exception as e:
        logger.error(f"Error in pyq-assistant router: {e}")
        raise HTTPException(status_code=500, detail=str(e))
