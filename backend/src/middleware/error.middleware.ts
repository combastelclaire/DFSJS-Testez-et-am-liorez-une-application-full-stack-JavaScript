import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

export function errorHandlingMiddleware(err: Error, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    return next(err);
  }
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
}
