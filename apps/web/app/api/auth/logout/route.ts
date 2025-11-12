import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/session';
import { clearAuthCookies, getRefreshToken } from '@/lib/auth/cookies';
import { logoutUser } from '@/lib/auth/service';

export async function POST() {
  try {
    const session = await requireSession();
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token found' },
        { status: 401 }
      );
    }

    // Invalidate session on server
    await logoutUser(refreshToken, session.userId);

    // Clear cookies
    await clearAuthCookies();

    return NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}
