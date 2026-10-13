import type { RequestHandler, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const asyncHandler = (handler: RequestHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ message: error.issues.map(issue => issue.message).join('. ') });
    return;
  }
  if (error instanceof HttpError) { res.status(error.status).json({ message: error.message }); return; }
  if (error?.code === 11000) { res.status(409).json({ message: 'This account or record already exists. Please refresh and try again.' }); return; }
  if (error?.type === 'entity.parse.failed') { res.status(400).json({ message: 'Invalid JSON request.' }); return; }
  if (error?.type === 'entity.too.large') { res.status(413).json({ message: 'Request is too large.' }); return; }
  console.error('Request failed:', error instanceof Error ? error.message : 'Unknown error');
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
};
