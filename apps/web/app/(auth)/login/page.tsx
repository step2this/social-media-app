import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Log in to your account',
};

export default function LoginPage() {
  return (
    <div>
      <h2>Log In</h2>
      <p className="info-text">Login form will be implemented in Phase 2</p>
      <p>
        <Link href="/register">Don&apos;t have an account? Register</Link>
      </p>
    </div>
  );
}
