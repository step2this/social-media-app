import { NextRequest, NextResponse } from 'next/server';
import { RegisterRequestSchema } from '@social-media-app/shared';
import { registerUser } from '@/lib/auth/service';
import { setAuthCookies } from '@/lib/auth/cookies';
import { logger, logAuth } from '@/lib/logger';

export async function POST(request: NextRequest) {
  logger.info('Registration request received');

  try {
    const body = await request.json();
    logger.debug({ body: { ...body, password: '[REDACTED]' } }, 'Request body received');

    const validated = RegisterRequestSchema.parse(body);
    logger.debug('Validation successful');

    const result = await registerUser(validated);
    logger.info(
      { userId: result.user?.id, email: result.user?.email },
      'User registered successfully'
    );
    logAuth('register', result.user?.id);

    // Set auth cookies if tokens are provided (auto-login after registration)
    if (result.tokens) {
      await setAuthCookies(result.tokens);
      logger.debug({ userId: result.user?.id }, 'Auth cookies set');
    }

    return NextResponse.json(
      {
        user: result.user,
        message: result.message,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error({ error }, 'Registration failed');
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
