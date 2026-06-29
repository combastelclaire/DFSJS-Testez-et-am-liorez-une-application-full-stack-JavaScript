import { prisma } from '../lib/prisma';
import { AppError } from '../errors/AppError';

export const teacherService = {
  async getAll() {
    const teachers = await prisma.teacher.findMany({ orderBy: { createdAt: 'desc' } });
    return teachers.map((teacher) => ({
      id: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt,
    }));
  },

  async getById(id: number) {
    const teacher = await prisma.teacher.findUnique({ where: { id } });
    if (!teacher) throw new AppError(404, 'Teacher not found');
    return {
      id: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt,
    };
  },
};
