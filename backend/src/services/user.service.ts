import { prisma } from '../lib/prisma';
import { AppError } from '../errors/AppError';

export const userService = {
  async getById(id: number) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError(404, 'User not found');
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      admin: user.admin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  },

  async delete(id: number, requestUserId: number) {
    if (requestUserId !== id) throw new AppError(403, 'You can only delete your own account');

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError(404, 'User not found');

    await prisma.user.delete({ where: { id } });
  },

  async promoteSelfToAdmin(requestUserId: number) {
    const isDev = (process.env.NODE_ENV || 'development') === 'development';
    if (!isDev) throw new AppError(403, 'Admin self-promotion is only available in development');

    const user = await prisma.user.findUnique({ where: { id: requestUserId } });
    if (!user) throw new AppError(404, 'User not found');

    if (user.admin) {
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        admin: user.admin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { admin: true },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      admin: updatedUser.admin,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  },
};
