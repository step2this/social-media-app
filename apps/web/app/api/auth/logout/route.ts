import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { clearAuthCookies, getRefreshToken } from '@/lib/auth/cookies';
import { logoutUser } from '@/lib/auth/service';
import { logger, logAuth } from '@/lib/logger';

export async function POST() {
  logger.info('Logout request received');

  try {
    const session = await requireSession();
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      logger.warn({ userId: session.userId }, 'Logout failed - no refresh token');
      return NextResponse.json({ error: 'No refresh token found' }, { status: 401 });
    }

    // Invalidate session on server
    await logoutUser(refreshToken, session.userId);

    // Clear cookies
    await clearAuthCookies();

    logger.info({ userId: session.userId }, 'User logged out successfully');
    logAuth('logout', session.userId);

    return NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
  } catch (error) {
    logger.error({ error }, 'Logout failed - unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
