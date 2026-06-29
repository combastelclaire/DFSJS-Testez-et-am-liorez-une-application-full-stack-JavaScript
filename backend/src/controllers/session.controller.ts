import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../errors/AppError';

const prisma = new PrismaClient();

function formatSession(session: {
  id: number;
  name: string;
  date: Date;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  teacher: { id: number; firstName: string; lastName: string };
  participants: { user: { id: number } }[];
}) {
  return {
    id: session.id,
    name: session.name,
    date: session.date,
    description: session.description,
    teacher: {
      id: session.teacher.id,
      firstName: session.teacher.firstName,
      lastName: session.teacher.lastName,
    },
    users: session.participants.map((p) => p.user.id),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

const sessionInclude = {
  teacher: true,
  participants: { include: { user: true } },
} as const;

export class SessionController {
  async getAll(_req: AuthRequest, res: Response): Promise<void> {
    const sessions = await prisma.session.findMany({ include: sessionInclude });
    res.status(200).json(sessions.map(formatSession));
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    const sessionId = parseInt(req.params.id as string);
    if (isNaN(sessionId)) throw new AppError(400, 'Invalid session ID');

    const session = await prisma.session.findUnique({ where: { id: sessionId }, include: sessionInclude });
    if (!session) throw new AppError(404, 'Session not found');

    res.status(200).json(formatSession(session));
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    const { name, date, description, teacherId } = req.body;

    if (!name) throw new AppError(400, 'Name is required');
    if (!date) throw new AppError(400, 'Date is required');
    if (!description) throw new AppError(400, 'Description is required');
    if (!teacherId) throw new AppError(400, 'Teacher ID is required');

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.admin) throw new AppError(403, 'Admin access required');

    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) throw new AppError(404, 'Teacher not found');

    const session = await prisma.session.create({
      data: { name, date: new Date(date), description, teacherId },
      include: sessionInclude,
    });

    res.status(201).json(formatSession(session));
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    const sessionId = parseInt(req.params.id as string);
    if (isNaN(sessionId)) throw new AppError(400, 'Invalid session ID');

    const { name, date, description, teacherId } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.admin) throw new AppError(403, 'Admin access required');

    const existing = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!existing) throw new AppError(404, 'Session not found');

    if (teacherId) {
      const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
      if (!teacher) throw new AppError(404, 'Teacher not found');
    }

    const updateData: { name?: string; date?: Date; description?: string; teacherId?: number } = {};
    if (name) updateData.name = name;
    if (date) updateData.date = new Date(date);
    if (description) updateData.description = description;
    if (teacherId) updateData.teacherId = teacherId;

    const session = await prisma.session.update({
      where: { id: sessionId },
      data: updateData,
      include: sessionInclude,
    });

    res.status(200).json(formatSession(session));
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    const sessionId = parseInt(req.params.id as string);
    if (isNaN(sessionId)) throw new AppError(400, 'Invalid session ID');

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.admin) throw new AppError(403, 'Admin access required');

    const existing = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!existing) throw new AppError(404, 'Session not found');

    await prisma.session.delete({ where: { id: sessionId } });
    res.status(200).json({ message: 'Session deleted successfully' });
  }

  async participate(req: AuthRequest, res: Response): Promise<void> {
    const sessionId = parseInt(req.params.id as string);
    const userId = parseInt(req.params.userId as string);
    if (isNaN(sessionId)) throw new AppError(400, 'Invalid session ID');
    if (isNaN(userId)) throw new AppError(400, 'Invalid user ID');

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new AppError(404, 'Session not found');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 'User not found');

    const existing = await prisma.sessionParticipation.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
    });
    if (existing) throw new AppError(400, 'User already participating in this session');

    await prisma.sessionParticipation.create({ data: { sessionId, userId } });
    res.status(200).json({ message: 'Successfully joined the session' });
  }

  async unparticipate(req: AuthRequest, res: Response): Promise<void> {
    const sessionId = parseInt(req.params.id as string);
    const userId = parseInt(req.params.userId as string);
    if (isNaN(sessionId)) throw new AppError(400, 'Invalid session ID');
    if (isNaN(userId)) throw new AppError(400, 'Invalid user ID');

    const participation = await prisma.sessionParticipation.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
    });
    if (!participation) throw new AppError(404, 'Participation not found');

    await prisma.sessionParticipation.delete({
      where: { sessionId_userId: { sessionId, userId } },
    });
    res.status(200).json({ message: 'Successfully left the session' });
  }
}
