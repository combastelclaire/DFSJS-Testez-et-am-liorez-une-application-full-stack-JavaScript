import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../errors/AppError';
import { teacherService } from '../services/teacher.service';

export class TeacherController {
  async getAll(_req: AuthRequest, res: Response): Promise<void> {
    const teachers = await teacherService.getAll();
    res.status(200).json(teachers);
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    const teacherId = parseInt(req.params.id as string);
    if (isNaN(teacherId)) throw new AppError(400, 'Invalid teacher ID');

    const teacher = await teacherService.getById(teacherId);
    res.status(200).json(teacher);
  }
}
