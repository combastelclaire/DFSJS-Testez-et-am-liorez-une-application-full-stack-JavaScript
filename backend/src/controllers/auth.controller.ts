import { Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { authService } from '../services/auth.service';
import { LoginSchema, RegisterSchema } from '../dto/auth.dto';

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    const result = LoginSchema.safeParse(req.body);
    if (!result.success) throw new AppError(400, result.error.issues[0]?.message ?? 'Validation error');

    const data = await authService.login(result.data.email, result.data.password);
    res.status(200).json(data);
  }

  async register(req: Request, res: Response): Promise<void> {
    const result = RegisterSchema.safeParse(req.body);
    if (!result.success) throw new AppError(400, result.error.issues[0]?.message ?? 'Validation error');

    const { email, password, firstName, lastName } = result.data;
    const data = await authService.register(email, password, firstName, lastName);
    res.status(201).json(data);
  }
}
