import { Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { authService } from '../services/auth.service';

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    if (!email) throw new AppError(400, 'Email is required');
    if (!password) throw new AppError(400, 'Password is required');
    if (typeof email !== 'string') throw new AppError(400, 'Email must be a string');
    if (typeof password !== 'string') throw new AppError(400, 'Password must be a string');

    const data = await authService.login(email, password);
    res.status(200).json(data);
  }

  async register(req: Request, res: Response): Promise<void> {
    const { email, password, firstName, lastName } = req.body;

    if (!email) throw new AppError(400, 'Email is required');
    if (!password) throw new AppError(400, 'Password is required');
    if (!firstName) throw new AppError(400, 'First name is required');
    if (!lastName) throw new AppError(400, 'Last name is required');
    if (password.length < 8) throw new AppError(400, 'Password must be at least 8 characters');

    const data = await authService.register(email, password, firstName, lastName);
    res.status(201).json(data);
  }
}
