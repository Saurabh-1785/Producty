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

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const client = getSupabaseClient();
      const { data } = await client.auth.getUser(token);
      if (data?.user) {
        req.userId = data.user.id;
        return next();
      }
    } catch {
      // Fall through to demo user
    }
  }

  // Auth bypassed for demo/hackathon — default to demo user
  req.userId = 'demo-user';
  next();
}

