import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Modular Imports
import typeDefs from './schema/typeDefs.js';
import queryResolvers from './resolvers/queries.js';
import mutationResolvers from './resolvers/mutations.js';
import { getAuthContext } from './middleware/auth.js';
import { setupSocketHandlers } from './socket/handlers.js';

dotenv.config();

const prisma = new PrismaClient();
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

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'exameve-backend' });
});

async function startServer() {
  await server.start();
  server.applyMiddleware({ app });

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`GraphQL Server running on http://localhost:${PORT}/graphql`);
    console.log(`Socket.io ready on ws://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Server startup error:', err);
  process.exit(1);
});

export { prisma };
