# ExamEve — AI-Powered Exam Panic Optimizer

Smart exam preparation platform helping students study efficiently in 48-96 hours.

## Quick Start

```bash
# Start with Docker Compose (recommended)
docker-compose up

# Or start services individually
cd frontend && npm install && npm run dev      # localhost:3000
cd backend && npm install && npm run dev       # localhost:4000
cd ml-service && pip install -r requirements.txt && python -m uvicorn app.main:app --reload  # localhost:8000
```

## Project Structure

- **frontend/** - Next.js 14 React app
- **backend/** - Node.js + Apollo GraphQL
- **ml-service/** - Python FastAPI ML microservice

## Features

- AI-driven study plan generation
- Confidence calibration using ML
- Panic detection from behavioral signals
- Spaced repetition nudges
- Adaptive quiz engine
- Pre-exam cheat sheet generation

## Tech Stack

Frontend: Next.js, React, Tailwind, Zustand, Apollo Client
Backend: Node.js, Express, Apollo GraphQL, PostgreSQL, Prisma
ML: Python, FastAPI, scikit-learn, XGBoost, spaCy
Real-time: Socket.io
Queue: BullMQ + Redis
Auth: NextAuth.js

## Environment Variables

See `.env.example` files in each service folder.

## Development

1. Install dependencies: `npm install` (frontend/backend), `pip install` (ml-service)
2. Create `.env` files from `.env.example`
3. Start databases: `docker-compose up postgres redis`
4. Run services in separate terminals

## Deployment

Vercel (frontend), Render (backend), Supabase (database), Upstash (redis), Cloudinary (files)

---

Build it. Ship it. Own it.
