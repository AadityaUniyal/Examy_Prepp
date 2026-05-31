import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

/**
 * Extract and verify the user identity from the Authorization header.
 * - Verifies JWT tokens when a valid Bearer token is provided.
 * - Falls back to 'mock-student-123' ONLY in development mode.
 * - Returns null userId in production if no valid token is present.
 */
export function getAuthContext(req) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return { userId: decoded.userId || decoded.sub || decoded.id };
      } catch (err) {
        // Token verification failed
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Auth] JWT verification failed, using dev fallback:', err.message);
          return { userId: 'mock-student-123' };
        }
        return { userId: null };
      }
    }
  }

  // No auth header provided
  if (process.env.NODE_ENV === 'development') {
    return { userId: 'mock-student-123' };
  }

  return { userId: null };
}

/**
 * Helper to enforce authentication in resolvers.
 * Throws if userId is missing.
 */
export function requireAuth(userId) {
  if (!userId) {
    throw new Error('Not authenticated. Please provide a valid JWT token.');
  }
  return userId;
}
