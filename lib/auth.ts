import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { queryOne } from './db';

export interface AuthUser {
  id: string;
  phone: string;
  role: string;
  username: string | null;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(user: { id: string; phone: string; role: string; username: string | null }): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): { id: string; phone: string; role: string; username: string | null } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; phone: string; role: string; username: string | null };
    return decoded;
  } catch {
    return null;
  }
}

function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function requireUser(request: NextRequest): Promise<AuthUser | null> {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded) return null;
  const user = await queryOne<AuthUser>('SELECT id, phone, role, username FROM users WHERE id = $1', [decoded.id]);
  return user;
}

export async function requireAdmin(request: NextRequest): Promise<AuthUser | null> {
  const user = await requireUser(request);
  if (!user) return null;
  if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) return null;
  return user;
}

export async function requirePharmacy(request: NextRequest): Promise<AuthUser | null> {
  const user = await requireUser(request);
  if (!user) return null;
  if (!['PHARMACY_ADMIN', 'PHARMACY_USER'].includes(user.role)) return null;
  return user;
}
