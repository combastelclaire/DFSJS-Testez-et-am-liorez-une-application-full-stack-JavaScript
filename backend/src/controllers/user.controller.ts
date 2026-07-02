import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../errors/AppError';
import { userService } from '../services/user.service';

export class UserController {
  async getById(req: AuthRequest, res: Response): Promise<void> {
    const userId = parseInt(req.params.id as string);
    if (isNaN(userId)) throw new AppError(400, 'Invalid user ID');

    const user = await userService.getById(userId);
    res.status(200).json(user);
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    const userId = parseInt(req.params.id as string);
    if (isNaN(userId)) throw new AppError(400, 'Invalid user ID');

    await userService.delete(userId, req.userId!);
    res.status(200).json({ message: 'User deleted successfully' });
  }

  async promoteSelfToAdmin(req: AuthRequest, res: Response): Promise<void> {
    const user = await userService.promoteSelfToAdmin(req.userId!);
    res.status(200).json(user);
  }
}
