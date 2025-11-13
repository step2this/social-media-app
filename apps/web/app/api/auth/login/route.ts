import { NextRequest, NextResponse } from 'next/server';
import { LoginRequestSchema } from '@social-media-app/shared';
import { loginUser } from '@/lib/auth/service';
import { setAuthCookies } from '@/lib/auth/cookies';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate with Zod
    const validated = LoginRequestSchema.parse(body);

    // Call auth service (reuses backend logic)
    const result = await loginUser(validated);

    // Set HTTP-only cookies
    await setAuthCookies(result.tokens);

    // Return user data (no tokens in response body)
    return NextResponse.json(
      { user: result.user },
      { status: 200 }
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
