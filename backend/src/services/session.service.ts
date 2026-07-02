import { prisma } from '../lib/prisma';
import { AppError } from '../errors/AppError';

const sessionInclude = {
  teacher: true,
  participants: { include: { user: true } },
} as const;

type SessionWithRelations = {
  id: number;
  name: string;
  date: Date;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  teacher: { id: number; firstName: string; lastName: string };
  participants: { user: { id: number } }[];
};

function formatSession(session: SessionWithRelations) {
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

export const sessionService = {
  async getAll() {
    const sessions = await prisma.session.findMany({ include: sessionInclude });
    return sessions.map(formatSession);
  },

  async getById(id: number) {
    const session = await prisma.session.findUnique({ where: { id }, include: sessionInclude });
    if (!session) throw new AppError(404, 'Session not found');
    return formatSession(session);
  },

  async create(
    body: { name: string; date: string; description: string; teacherId: number },
    requestUserId: number,
  ) {
    const user = await prisma.user.findUnique({ where: { id: requestUserId } });
    if (!user?.admin) throw new AppError(403, 'Admin access required');

    const teacher = await prisma.teacher.findUnique({ where: { id: body.teacherId } });
    if (!teacher) throw new AppError(404, 'Teacher not found');

    const session = await prisma.session.create({
      data: {
        name: body.name,
        date: new Date(body.date),
        description: body.description,
        teacherId: body.teacherId,
      },
      include: sessionInclude,
    });

    return formatSession(session);
  },

  async update(
    id: number,
    body: { name?: string; date?: string; description?: string; teacherId?: number },
    requestUserId: number,
  ) {
    const user = await prisma.user.findUnique({ where: { id: requestUserId } });
    if (!user?.admin) throw new AppError(403, 'Admin access required');

    const existing = await prisma.session.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Session not found');

    if (body.teacherId) {
      const teacher = await prisma.teacher.findUnique({ where: { id: body.teacherId } });
      if (!teacher) throw new AppError(404, 'Teacher not found');
    }

    const updateData: { name?: string; date?: Date; description?: string; teacherId?: number } = {};
    if (body.name) updateData.name = body.name;
    if (body.date) updateData.date = new Date(body.date);
    if (body.description) updateData.description = body.description;
    if (body.teacherId) updateData.teacherId = body.teacherId;

    const session = await prisma.session.update({
      where: { id },
      data: updateData,
      include: sessionInclude,
    });

    return formatSession(session);
  },

  async delete(id: number, requestUserId: number) {
    const user = await prisma.user.findUnique({ where: { id: requestUserId } });
    if (!user?.admin) throw new AppError(403, 'Admin access required');

    const existing = await prisma.session.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Session not found');

    await prisma.session.delete({ where: { id } });
  },

  async participate(sessionId: number, userId: number) {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new AppError(404, 'Session not found');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 'User not found');

    const existing = await prisma.sessionParticipation.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
    });
    if (existing) throw new AppError(400, 'User already participating in this session');

    await prisma.sessionParticipation.create({ data: { sessionId, userId } });
  },

  async unparticipate(sessionId: number, userId: number) {
    const participation = await prisma.sessionParticipation.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
    });
    if (!participation) throw new AppError(404, 'Participation not found');

    await prisma.sessionParticipation.delete({
      where: { sessionId_userId: { sessionId, userId } },
    });
  },
};
