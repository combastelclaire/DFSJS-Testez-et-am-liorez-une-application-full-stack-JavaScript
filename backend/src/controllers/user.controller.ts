import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../errors/AppError';

const prisma = new PrismaClient();

export class UserController {
  async getById(req: AuthRequest, res: Response): Promise<void> {
    const userId = parseInt(req.params.id as string);
    if (isNaN(userId)) throw new AppError(400, 'Invalid user ID');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 'User not found');

    res.status(200).json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      admin: user.admin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    const userId = parseInt(req.params.id as string);
    if (isNaN(userId)) throw new AppError(400, 'Invalid user ID');

    if (req.userId !== userId) throw new AppError(403, 'You can only delete your own account');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 'User not found');

    await prisma.user.delete({ where: { id: userId } });
    res.status(200).json({ message: 'User deleted successfully' });
  }

  async promoteSelfToAdmin(req: AuthRequest, res: Response): Promise<void> {
    const isDev = (process.env.NODE_ENV || 'development') === 'development';
    if (!isDev) throw new AppError(403, 'Admin self-promotion is only available in development');

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) throw new AppError(404, 'User not found');

    if (user.admin) {
      res.status(200).json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        admin: user.admin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { admin: true },
    });

    res.status(200).json({
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      admin: updatedUser.admin,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    });
  }
}
