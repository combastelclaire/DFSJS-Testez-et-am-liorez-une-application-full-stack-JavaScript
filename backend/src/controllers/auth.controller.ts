import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt.util';
import { AppError } from '../errors/AppError';

const prisma = new PrismaClient();

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    if (!email) throw new AppError(400, 'Email is required');
    if (!password) throw new AppError(400, 'Password is required');
    if (typeof email !== 'string') throw new AppError(400, 'Email must be a string');
    if (typeof password !== 'string') throw new AppError(400, 'Password must be a string');

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError(401, 'Invalid credentials');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new AppError(401, 'Invalid credentials');

    const token = generateToken(user.id);

    res.status(200).json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      admin: user.admin,
      token,
    });
  }

  async register(req: Request, res: Response): Promise<void> {
    const { email, password, firstName, lastName } = req.body;

    if (!email) throw new AppError(400, 'Email is required');
    if (!password) throw new AppError(400, 'Password is required');
    if (!firstName) throw new AppError(400, 'First name is required');
    if (!lastName) throw new AppError(400, 'Last name is required');
    if (password.length < 8) throw new AppError(400, 'Password must be at least 8 characters');

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new AppError(400, 'Email already exists');

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, firstName, lastName, admin: false },
    });

    const token = generateToken(user.id);

    res.status(201).json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      admin: user.admin,
      token,
    });
  }
}
