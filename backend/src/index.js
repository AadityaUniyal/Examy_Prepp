import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import axios from 'axios';
import { prisma } from './prisma.js';

// Modular Imports
import typeDefs from './schema/typeDefs.js';
import queryResolvers from './resolvers/queries.js';
import mutationResolvers from './resolvers/mutations.js';
import { getAuthContext } from './middleware/auth.js';
import { setupSocketHandlers } from './socket/handlers.js';
import { startNotificationScheduler } from './services/notificationService.js';

dotenv.config();

// Fail-fast checks in production for critical secrets
if (process.env.NODE_ENV === 'production') {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret === 'dev-secret-change-in-production' || jwtSecret === 'dev_secret_key_change_in_production') {
    console.error('CRITICAL ERROR: JWT_SECRET is not configured or uses a default value in production!');
    process.exit(1);
  }
}

const app = express();
const httpServer = createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const io = new Server(httpServer, {
  cors: { origin: FRONTEND_URL }
});

// Configure Restricted CORS
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json());

const resolvers = {
  Query: queryResolvers,
  Mutation: mutationResolvers
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    return getAuthContext(req);
  }
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

    // Forward file to FastAPI
    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append('file', blob, req.file.originalname);

    const mlResponse = await axios.post(
      `${process.env.ML_SERVICE_URL || 'http://localhost:8000'}/api/ml/extract-syllabus`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-Internal-Token': process.env.ML_INTERNAL_TOKEN || 'dev_internal_token'
        }
      }
    );

    const { topics } = mlResponse.data;

    // Create Syllabus in Database
    let syllabus = await prisma.syllabus.findUnique({
      where: { examId }
    });

    if (!syllabus) {
      syllabus = await prisma.syllabus.create({
        data: {
          examId,
          extractionStatus: 'DONE'
        }
      });
    }

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

    res.json({ success: true, topics: createdTopics });
  } catch (err) {
    console.error('Syllabus upload error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to extract syllabus' });
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
