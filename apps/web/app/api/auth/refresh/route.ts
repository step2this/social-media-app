import { NextResponse } from 'next/server';
import { getRefreshToken, setAuthCookies } from '@/lib/auth/cookies';
import { refreshAccessToken } from '@/lib/auth/service';
import { logger } from '@/lib/logger';

export async function POST() {
  logger.debug('Token refresh request received');

  try {
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      logger.warn('Token refresh failed - no refresh token');
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
    }

    const result = await refreshAccessToken(refreshToken);
    await setAuthCookies(result.tokens);

    logger.debug('Token refreshed successfully');

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error({ error }, 'Token refresh failed - invalid token');
    return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
  }
}
