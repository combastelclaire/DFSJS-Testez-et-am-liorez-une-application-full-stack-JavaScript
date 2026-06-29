import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../errors/AppError';
import { sessionService } from '../services/session.service';

export class SessionController {
  async getAll(_req: AuthRequest, res: Response): Promise<void> {
    const sessions = await sessionService.getAll();
    res.status(200).json(sessions);
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    const sessionId = parseInt(req.params.id as string);
    if (isNaN(sessionId)) throw new AppError(400, 'Invalid session ID');

    const session = await sessionService.getById(sessionId);
    res.status(200).json(session);
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    const { name, date, description, teacherId } = req.body;

    if (!name) throw new AppError(400, 'Name is required');
    if (!date) throw new AppError(400, 'Date is required');
    if (!description) throw new AppError(400, 'Description is required');
    if (!teacherId) throw new AppError(400, 'Teacher ID is required');

    const session = await sessionService.create({ name, date, description, teacherId }, req.userId!);
    res.status(201).json(session);
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    const sessionId = parseInt(req.params.id as string);
    if (isNaN(sessionId)) throw new AppError(400, 'Invalid session ID');

    const session = await sessionService.update(sessionId, req.body, req.userId!);
    res.status(200).json(session);
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    const sessionId = parseInt(req.params.id as string);
    if (isNaN(sessionId)) throw new AppError(400, 'Invalid session ID');

    await sessionService.delete(sessionId, req.userId!);
    res.status(200).json({ message: 'Session deleted successfully' });
  }

  async participate(req: AuthRequest, res: Response): Promise<void> {
    const sessionId = parseInt(req.params.id as string);
    const userId = parseInt(req.params.userId as string);
    if (isNaN(sessionId)) throw new AppError(400, 'Invalid session ID');
    if (isNaN(userId)) throw new AppError(400, 'Invalid user ID');

    await sessionService.participate(sessionId, userId);
    res.status(200).json({ message: 'Successfully joined the session' });
  }

  async unparticipate(req: AuthRequest, res: Response): Promise<void> {
    const sessionId = parseInt(req.params.id as string);
    const userId = parseInt(req.params.userId as string);
    if (isNaN(sessionId)) throw new AppError(400, 'Invalid session ID');
    if (isNaN(userId)) throw new AppError(400, 'Invalid user ID');

    await sessionService.unparticipate(sessionId, userId);
    res.status(200).json({ message: 'Successfully left the session' });
  }
}
