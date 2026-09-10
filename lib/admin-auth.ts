import { NextRequest } from 'next/server';
import { requireUser } from './auth';

export async function requireAdmin(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return null;
  if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) return null;
  return user;
}
