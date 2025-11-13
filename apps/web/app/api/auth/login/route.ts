import { NextRequest, NextResponse } from 'next/server';
import { LoginRequestSchema } from '@social-media-app/shared';
import { loginUser } from '@/lib/auth/service';
import { setAuthCookies } from '@/lib/auth/cookies';
import { logger, logAuth } from '@/lib/logger';

export async function POST(request: NextRequest) {
  logger.info('Login request received');

  try {
    const body = await request.json();
    logger.debug({ email: body.email }, 'Login attempt');

    // Validate with Zod
    const validated = LoginRequestSchema.parse(body);
    logger.debug('Login validation successful');

    // Call auth service (reuses backend logic)
    const result = await loginUser(validated);

    // Set HTTP-only cookies
    await setAuthCookies(result.tokens);

    logger.info({ userId: result.user.id, email: result.user.email }, 'User logged in successfully');
    logAuth('login', result.user.id);

    // Return user data (no tokens in response body)
    return NextResponse.json({ user: result.user }, { status: 200 });
  } catch (error) {
    logger.error({ error }, 'Login failed');
    logAuth('failed');

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
