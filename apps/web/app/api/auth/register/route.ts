import { NextRequest, NextResponse } from 'next/server';
import { RegisterRequestSchema } from '@social-media-app/shared';
import { registerUser } from '@/lib/auth/service';
import { setAuthCookies } from '@/lib/auth/cookies';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = RegisterRequestSchema.parse(body);

    const result = await registerUser(validated);

    // Set auth cookies if tokens are provided (auto-login after registration)
    if (result.tokens) {
      await setAuthCookies(result.tokens);
    }

    return NextResponse.json(
      {
        user: result.user,
        message: result.message
      },
      { status: 201 }
    );
  } catch (error) {
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
