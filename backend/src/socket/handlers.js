import { detectPanic } from '../services/mlService.js';
import { prisma } from '../prisma.js';
import jwt from 'jsonwebtoken';

/**
 * Set up Socket.io event handlers.
 * Fixes from original:
 *  - socket.disconnect() → socket.on('disconnect', cb)
 *  - Added room joining by userId for targeted emissions
 *  - Integrated ML-based panic detection
 */
export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('[Socket] User connected:', socket.id);

    // Securely verify JWT token passed via handshake or query parameters
    const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    let userId = null;

    if (token) {
      const cleanToken = token.startsWith('Bearer ') ? token.split('Bearer ')[1] : token;
      try {
        const decoded = jwt.verify(cleanToken, JWT_SECRET);
        userId = decoded.userId || decoded.sub || decoded.id;
      } catch (err) {
        console.warn(`[Socket Auth] JWT verification failed for socket ${socket.id}:`, err.message);
      }
    }

    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`[Socket] User ${socket.id} authorized & joined room: user:${userId}`);
    } else {
      console.log(`[Socket] Public connection allowed for socket id: ${socket.id}`);
    }

    // Handle study session start
    socket.on('start-session', (data) => {
      const targetRoom = data.userId || userId;
      if (targetRoom) {
        io.to(`user:${targetRoom}`).emit('session-started', {
          ...data,
          startedAt: new Date().toISOString(),
        });
      } else {
        socket.emit('session-started', {
          ...data,
          startedAt: new Date().toISOString(),
        });
      }
    });

    // Handle panic detection with ML integration and DB persistence
    socket.on('panic-detected', async (data) => {
      try {
        const panicResult = await detectPanic(data);
        const targetRoom = data.userId || userId;

        const payload = {
          ...panicResult,
          detectedAt: new Date().toISOString(),
        };

        // Create PanicEvent row in DB
        const roomUserId = data.userId || userId;
        if (roomUserId) {
          await prisma.panicEvent.create({
            data: {
              userId: roomUserId,
              panicScore: panicResult.panicScore || 0.5,
              behavioralSignals: data,
              interventionType: panicResult.recommendation || 'Breathing exercise'
            }
          });
        }

        if (targetRoom) {
          io.to(`user:${targetRoom}`).emit('panic-mode-activated', payload);
        } else {
          socket.emit('panic-mode-activated', payload);
        }
      } catch (err) {
        console.error('[Socket] Panic detection error:', err.message);
        socket.emit('panic-mode-activated', {
          isPanic: true,
          panicScore: 0.7,
          recommendation: 'Take a short break and breathe deeply.',
          detectedAt: new Date().toISOString(),
        });
      }
    });

    // Handle panic recovery and DB updates
    socket.on('panic-recovered', async (data) => {
      try {
        const targetRoom = data.userId || userId;
        const roomUserId = data.userId || userId;

        if (roomUserId) {
          const unresolved = await prisma.panicEvent.findFirst({
            where: {
              userId: roomUserId,
              resolvedAt: null
            },
            orderBy: { detectedAt: 'desc' }
          });

          if (unresolved) {
            await prisma.panicEvent.update({
              where: { id: unresolved.id },
              data: { resolvedAt: new Date() }
            });
            console.log(`[Socket] Resolved panic event in DB for user: ${roomUserId}`);
          }
        }

        if (targetRoom) {
          io.to(`user:${targetRoom}`).emit('panic-recovery-confirmed', {
            userId: roomUserId,
            resolvedAt: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error('[Socket] Panic recovery confirmation error:', err.message);
      }
    });

    // Handle session progress updates
    socket.on('session-progress', (data) => {
      const targetRoom = data.userId || userId;
      if (targetRoom) {
        io.to(`user:${targetRoom}`).emit('progress-updated', data);
      }
    });

    // Handle Peer Lounge connections for real-time presence
    socket.on('join-lounge', (data) => {
      const { topicId } = data;
      if (topicId) {
        socket.join(`lounge-${topicId}`);
        const clients = io.sockets.adapter.rooms.get(`lounge-${topicId}`);
        const count = clients ? clients.size : 1;
        io.to(`lounge-${topicId}`).emit('lounge-status', {
          topicId,
          activePeersCount: count
        });
        console.log(`[Socket] User ${socket.id} joined lounge-${topicId}. Active peers: ${count}`);
      }
    });

    socket.on('leave-lounge', (data) => {
      const { topicId } = data;
      if (topicId) {
        socket.leave(`lounge-${topicId}`);
        const clients = io.sockets.adapter.rooms.get(`lounge-${topicId}`);
        const count = clients ? clients.size : 0;
        io.to(`lounge-${topicId}`).emit('lounge-status', {
          topicId,
          activePeersCount: count
        });
        console.log(`[Socket] User ${socket.id} left lounge-${topicId}. Active peers: ${count}`);
      }
    });

    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (room.startsWith('lounge-')) {
          const topicId = room.replace('lounge-', '');
          const clients = io.sockets.adapter.rooms.get(room);
          const count = clients ? clients.size - 1 : 0;
          socket.to(room).emit('lounge-status', {
            topicId,
            activePeersCount: count
          });
        }
      }
    });

    // FIX: was socket.disconnect() which immediately disconnects the client
    // Correct: socket.on('disconnect', callback) to listen for disconnect events
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] User disconnected: ${socket.id}, reason: ${reason}`);
    });
  });
}
