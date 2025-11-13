import { NextRequest, NextResponse } from 'next/server';
import { RegisterRequestSchema } from '@social-media-app/shared';
import { registerUser } from '@/lib/auth/service';
import { setAuthCookies } from '@/lib/auth/cookies';

export async function POST(request: NextRequest) {
  console.log('📝 [API] Registration request received');

  try {
    const body = await request.json();
    console.log('📝 [API] Request body:', { ...body, password: '[REDACTED]' });

    const validated = RegisterRequestSchema.parse(body);
    console.log('📝 [API] Validation successful');

    const result = await registerUser(validated);
    console.log('📝 [API] User registered:', { userId: result.user?.userId, email: result.user?.email });

    // Set auth cookies if tokens are provided (auto-login after registration)
    if (result.tokens) {
      await setAuthCookies(result.tokens);
      console.log('📝 [API] Auth cookies set');
    }

    return NextResponse.json(
      {
        user: result.user,
        message: result.message
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ [API] Registration error:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
