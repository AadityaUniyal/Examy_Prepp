import { detectPanic } from '../services/mlService.js';

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

    // Join a user-specific room for targeted emissions
    const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
    if (userId) {
      socket.join(userId);
      console.log(`[Socket] User ${socket.id} joined room: ${userId}`);
    }

    // Handle study session start
    socket.on('start-session', (data) => {
      const targetRoom = data.userId || userId;
      if (targetRoom) {
        io.to(targetRoom).emit('session-started', {
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

    // Handle panic detection with ML integration
    socket.on('panic-detected', async (data) => {
      try {
        const panicResult = await detectPanic(data);
        const targetRoom = data.userId || userId;

        const payload = {
          ...panicResult,
          detectedAt: new Date().toISOString(),
        };

        if (targetRoom) {
          io.to(targetRoom).emit('panic-mode-activated', payload);
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

    // Handle session progress updates
    socket.on('session-progress', (data) => {
      const targetRoom = data.userId || userId;
      if (targetRoom) {
        io.to(targetRoom).emit('progress-updated', data);
      }
    });

    // FIX: was socket.disconnect() which immediately disconnects the client
    // Correct: socket.on('disconnect', callback) to listen for disconnect events
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] User disconnected: ${socket.id}, reason: ${reason}`);
    });
  });
}
