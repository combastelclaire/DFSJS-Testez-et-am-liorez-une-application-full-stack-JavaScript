import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../errors/AppError';
import { sessionService } from '../services/session.service';
import { CreateSessionSchema, UpdateSessionSchema } from '../dto/session.dto';

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
    const result = CreateSessionSchema.safeParse(req.body);
    if (!result.success) throw new AppError(400, result.error.issues[0]?.message ?? 'Validation error');

    const session = await sessionService.create(result.data, req.userId!);
    res.status(201).json(session);
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    const sessionId = parseInt(req.params.id as string);
    if (isNaN(sessionId)) throw new AppError(400, 'Invalid session ID');

    const result = UpdateSessionSchema.safeParse(req.body);
    if (!result.success) throw new AppError(400, result.error.issues[0]?.message ?? 'Validation error');

    const session = await sessionService.update(sessionId, result.data, req.userId!);
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
