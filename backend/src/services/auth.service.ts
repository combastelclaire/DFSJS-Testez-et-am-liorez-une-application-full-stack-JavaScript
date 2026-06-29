import * as bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { generateToken } from '../utils/jwt.util';
import { AppError } from '../errors/AppError';

export const authService = {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError(401, 'Invalid credentials');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new AppError(401, 'Invalid credentials');

    const token = generateToken(user.id);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      admin: user.admin,
      token,
    };
  },

  async register(email: string, password: string, firstName: string, lastName: string) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new AppError(400, 'Email already exists');

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, firstName, lastName, admin: false },
    });

    const token = generateToken(user.id);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      admin: user.admin,
      token,
    };
  },
};
