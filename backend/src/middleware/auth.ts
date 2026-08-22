/**
 * ApeAI — Auth Middleware
 *
 * Express middleware that validates a Supabase JWT bearer token
 * and attaches the user_id to the request. Mirrors FastAPI's
 * get_current_user dependency.
 */

import { Request, Response, NextFunction } from 'express';
import { getSupabaseClient } from '../db/supabase';

// Extend Express Request to carry userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      detail: 'Missing or malformed Authorization header',
    });
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const client = getSupabaseClient();
    const { data, error } = await client.auth.getUser(token);

    if (error || !data?.user) {
      res.status(401).json({ detail: 'Invalid or expired token' });
      return;
    }

    req.userId = data.user.id;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(401).json({ detail: 'Could not validate credentials' });
  }
}
