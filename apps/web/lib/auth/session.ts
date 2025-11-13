import { cookies } from 'next/headers';
import { verifyAccessToken } from '@social-media-app/auth-utils';
import { logger } from '@/lib/logger';

export interface Session {
  userId: string;
  email: string;
}

export async function getServerSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  if (!token) {
    return null;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    logger.error('JWT_SECRET not configured - cannot verify session');
    return null;
  }

  try {
    const payload = await verifyAccessToken(token, secret);
    if (!payload) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
    };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<Session> {
  const session = await getServerSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}
