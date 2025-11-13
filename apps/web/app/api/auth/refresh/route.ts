import { NextResponse } from 'next/server';
import { getRefreshToken, setAuthCookies } from '@/lib/auth/cookies';
import { refreshAccessToken } from '@/lib/auth/service';

export async function POST() {
  try {
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token' },
        { status: 401 }
      );
    }

    const result = await refreshAccessToken(refreshToken);
    await setAuthCookies(result.tokens);

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid refresh token' },
      { status: 401 }
    );
  }
}
