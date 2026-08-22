/**
 * ApeAI — Global Error Handler Middleware
 *
 * Catches all errors passed to next(err) and returns consistent
 * JSON error responses. Mirrors FastAPI's global_exception_handler.
 */

import { Request, Response, NextFunction } from 'express';

const CONNECTION_ERROR_TERMS = [
  'Name or service not known',
  'Connection refused',
  'ConnectError',
  'ECONNREFUSED',
  'ENOTFOUND',
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const message = err.message ?? String(err);

  const isConnectionError = CONNECTION_ERROR_TERMS.some((term) =>
    message.includes(term),
  );

  if (isConnectionError) {
    res.status(503).json({ detail: `Database unavailable: ${message}` });
    return;
  }

  console.error('Unhandled exception:', err);
  res.status(500).json({ detail: `Internal server error: ${message}` });
}
