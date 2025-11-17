import { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';
import { logger } from '@/lib/logger';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Log in to your account',
};

export default function LoginPage() {
  logger.info('Login page rendered');

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: '1.5rem', textAlign: 'center' }}>
        Log In
      </h2>
      <LoginForm />
    </div>
  );
}
