import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import depthLimit from 'graphql-depth-limit';
import { getComplexity, simpleEstimator } from 'graphql-query-complexity';
import { prisma } from './prisma.js';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import Papa from 'papaparse';
import { generateStudyNotes, generatePYQSet } from './services/geminiService.js';

// Modular Imports
import typeDefs from './schema/typeDefs.js';
import queryResolvers from './resolvers/queries.js';
import mutationResolvers from './resolvers/mutations.js';
import { getAuthContext } from './middleware/auth.js';
import { setupSocketHandlers } from './socket/handlers.js';
import { startNotificationScheduler } from './services/notificationService.js';

dotenv.config();

// Fail-fast checks for critical secrets (Dev & Prod)
const jwtSecret = process.env.JWT_SECRET;
const nextauthSecret = process.env.NEXTAUTH_SECRET;
const mlInternalToken = process.env.ML_INTERNAL_TOKEN;

const invalidSecrets = [
  'dev-secret-change-in-production',
  'dev_secret_key_change_in_production',
  'your_jwt_secret_key_here',
  'your_nextauth_secret_here',
  'dev_secret_change_in_production',
  'dev_internal_token',
  'your_ml_internal_token_here'
];

if (!jwtSecret || invalidSecrets.includes(jwtSecret) || jwtSecret.length < 32) {
  console.error('CRITICAL ERROR: JWT_SECRET is not configured, is a default value, or is shorter than 32 characters!');
  process.exit(1);
}

if (!nextauthSecret || invalidSecrets.includes(nextauthSecret)) {
  console.error('CRITICAL ERROR: NEXTAUTH_SECRET is not configured or uses a default value!');
  process.exit(1);
}

if (!mlInternalToken || invalidSecrets.includes(mlInternalToken)) {
  console.error('CRITICAL ERROR: ML_INTERNAL_TOKEN is not configured or uses a default value!');
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const io = new Server(httpServer, {
  cors: { origin: FRONTEND_URL }
});

// Configure Restricted CORS & Middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100, // max 100 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

const resolvers = {
  Query: queryResolvers,
  Mutation: mutationResolvers
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req, res }) => {
    const authContext = getAuthContext(req);
    return { ...authContext, res };
  },
  validationRules: [
    depthLimit(7),
    (context) => {
      const complexity = getComplexity({
        schema: context.getSchema(),
        query: context.getDocument(),
        variables: context.getVariables(),
        estimators: [simpleEstimator({ defaultComplexity: 1 })],
      });
      if (complexity > 1000) {
        throw new Error(`Query complexity of ${complexity} exceeds the maximum allowed of 1000.`);
      }
      return context;
    }
  ]
});

// Set up Socket.io connection and event handlers
setupSocketHandlers(io);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB file size limit to protect memory
});

app.post('/api/upload-syllabus', upload.single('file'), async (req, res) => {
  try {
    const auth = getAuthContext(req);
    if (!auth.userId) {
      return res.status(401).json({ error: 'Not authenticated. Please log in.' });
    }
    const { examId } = req.body;
    if (!examId) {
      return res.status(400).json({ error: 'examId is required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // --- Mock S3 Cloud Storage Save ---
    const uploadsDir = './uploads';
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filename = `${Date.now()}-${req.file.originalname}`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, req.file.buffer);
    const mockS3Url = `s3://exameve-syllabuses/${filename}`;

    // --- Parsing Logic ---
    let topics = [];

    if (req.file.originalname.endsWith('.pdf') || req.file.mimetype === 'application/pdf') {
      const parsedPdf = await pdf(req.file.buffer);
      const text = parsedPdf.text || '';
      const lines = text
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 3 && l.length < 100 && !l.toLowerCase().includes('syllabus') && !l.toLowerCase().includes('page'));
      
      const uniqueLines = [...new Set(lines)].slice(0, 12);
      topics = uniqueLines.map(line => ({
        name: line,
        estimated_complexity: 0.5
      }));
    } else if (req.file.originalname.endsWith('.csv') || req.file.mimetype === 'text/csv') {
      const csvString = req.file.buffer.toString('utf-8');
      const parsedCsv = Papa.parse(csvString, { header: true, skipEmptyLines: true });
      topics = parsedCsv.data
        .map(row => {
          const name = row.name || row.topic || row.title || Object.values(row)[0];
          const estimated_complexity = parseFloat(row.complexity || row.complexityScore || row.estimated_complexity) || 0.5;
          return { name: name?.trim(), estimated_complexity };
        })
        .filter(t => t.name && t.name.length > 0);
    } else {
      const text = req.file.buffer.toString('utf-8');
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      topics = lines.slice(0, 10).map(line => ({
        name: line,
        estimated_complexity: 0.5
      }));
    }

    if (topics.length === 0) {
      topics = [
        { name: 'Introduction to Course Materials', estimated_complexity: 0.3 },
        { name: 'Core Conceptual Foundations', estimated_complexity: 0.6 },
        { name: 'Advanced Topics & Application', estimated_complexity: 0.8 }
      ];
    }

    // Create Syllabus in Database
    let syllabus = await prisma.syllabus.findUnique({
      where: { examId }
    });

    if (!syllabus) {
      syllabus = await prisma.syllabus.create({
        data: {
          examId,
          rawPdfUrl: mockS3Url,
          extractionStatus: 'DONE'
        }
      });
    } else {
      syllabus = await prisma.syllabus.update({
        where: { examId },
        data: {
          rawPdfUrl: mockS3Url,
          extractionStatus: 'DONE'
        }
      });
    }

    // Clean up existing topics for this syllabus/exam if re-uploading
    await prisma.topic.deleteMany({
      where: { examId }
    });

    // Create topics in DB
    const createdTopics = await Promise.all(
      topics.map(async (t) => {
        return prisma.topic.create({
          data: {
            name: t.name,
            weightage: 100.0 / Math.max(topics.length, 1),
            complexityScore: t.estimated_complexity || 0.5,
            estimatedHours: 2.0,
            examId,
            syllabusId: syllabus.id
          }
        });
      })
    );

    res.json({ success: true, topics: createdTopics, rawPdfUrl: mockS3Url });
  } catch (err) {
    console.error('Syllabus upload error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to extract syllabus' });
  }
});

app.post('/api/generate-pyq-set', upload.single('file'), async (req, res) => {
  try {
    const auth = getAuthContext(req);
    if (!auth.userId) {
      return res.status(401).json({ error: 'Not authenticated. Please log in.' });
    }
    const { examId } = req.body;
    if (!examId) {
      return res.status(400).json({ error: 'examId is required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No past paper file uploaded' });
    }

    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const uploadsDir = './uploads';
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filename = `pyq-${Date.now()}-${req.file.originalname}`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, req.file.buffer);

    let rawText = '';
    if (req.file.originalname.endsWith('.pdf') || req.file.mimetype === 'application/pdf') {
      const parsedPdf = await pdf(req.file.buffer);
      rawText = parsedPdf.text || '';
    } else {
      rawText = req.file.buffer.toString('utf-8');
    }

    const questionsAndAnswers = await generatePYQSet({
      rawText,
      examName: exam.name
    });

    const pyqSet = await prisma.pYQSet.create({
      data: {
        examId,
        filename: req.file.originalname,
        fileUrl: `s3://exameve-pyqs/${filename}`,
        questions: questionsAndAnswers
      }
    });

    res.json({ success: true, pyqSet });
  } catch (err) {
    console.error('PYQ generation error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to process PYQ' });
  }
});

app.post('/api/generate-notes', async (req, res) => {
  try {
    const auth = getAuthContext(req);
    if (!auth.userId) {
      return res.status(401).json({ error: 'Not authenticated. Please log in.' });
    }
    const { examId, topicName } = req.body;
    if (!examId || !topicName) {
      return res.status(400).json({ error: 'examId and topicName are required' });
    }

    const syllabus = await prisma.syllabus.findUnique({
      where: { examId },
      include: { topics: true }
    });

    const syllabusContext = syllabus
      ? `Syllabus consists of: ${syllabus.topics.map(t => t.name).join(', ')}`
      : 'General context';

    const content = await generateStudyNotes({
      topicName,
      syllabusContext
    });

    const studyNote = await prisma.studyNote.create({
      data: {
        examId,
        title: `${topicName} Study Notes`,
        content
      }
    });

    res.json({ success: true, studyNote });
  } catch (err) {
    console.error('Study notes generation error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to generate study notes' });
  }
});

app.post('/api/autopilot-recalibrate', async (req, res) => {
  try {
    const auth = getAuthContext(req);
    if (!auth.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const activePlan = await prisma.studyPlan.findFirst({
      where: {
        userId: auth.userId,
        isActive: true
      },
      include: {
        blocks: {
          where: {
            status: 'PENDING'
          },
          include: {
            topic: true
          },
          orderBy: {
            scheduledStart: 'asc'
          }
        }
      }
    });

    if (!activePlan) {
      return res.status(200).json({ success: false, message: 'No active study plan found to recalibrate.' });
    }

    const blocksToRecalibrate = activePlan.blocks.slice(0, 3);
    const updatedBlocks = [];

    for (let i = 0; i < blocksToRecalibrate.length; i++) {
      const block = blocksToRecalibrate[i];
      let newBlockType = block.blockType;
      let newDuration = block.durationMins;

      if (i === 0) {
        newBlockType = 'BREAK';
        newDuration = 15;
      } else if (block.blockType === 'STUDY') {
        newBlockType = 'REVISION';
        newDuration = Math.max(15, Math.round(block.durationMins * 0.6));
      }

      const updated = await prisma.planBlock.update({
        where: { id: block.id },
        data: {
          blockType: newBlockType,
          durationMins: newDuration
        }
      });
      updatedBlocks.push(updated);
    }

    res.json({
      success: true,
      message: 'Autopilot successfully recalibrated study plan to reduce cognitive load.',
      recalibratedBlocksCount: updatedBlocks.length
    });
  } catch (err) {
    console.error('[Autopilot] Recalibration failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/auth/refresh', (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token missing' });
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    
    const newAccessToken = jwt.sign({ userId: decoded.userId }, JWT_SECRET, { expiresIn: '15m' });
    const newRefreshToken = jwt.sign({ userId: decoded.userId }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.json({ token: newAccessToken });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'exameve-backend' });
});

app.get('/api/ml-telemetry', async (req, res) => {
  try {
    const internalToken = req.headers['x-internal-token'];
    const expectedToken = process.env.ML_INTERNAL_TOKEN || 'dev_internal_token';
    if (!internalToken || internalToken !== expectedToken) {
      return res.status(403).json({ error: 'Access forbidden' });
    }

    const events = await prisma.mLEvent.findMany({
      where: {
        examScore: { not: null }
      }
    });

    res.json(events);
  } catch (err) {
    console.error('[Telemetry REST] Error fetching telemetry:', err.message);
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  await server.start();
  server.applyMiddleware({ app });

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`GraphQL Server running on http://localhost:${PORT}/graphql`);
    console.log(`Socket.io ready on ws://localhost:${PORT}`);
    startNotificationScheduler();
  });
}

startServer().catch(err => {
  console.error('Server startup error:', err);
  process.exit(1);
});
