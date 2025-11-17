import { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { logger } from '@/lib/logger';

export const metadata: Metadata = {
  title: 'Register',
  description: 'Create a new account',
};

export default function RegisterPage() {
  logger.info('Register page rendered');

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: '1.5rem', textAlign: 'center' }}>
        Create Account
      </h2>
      <RegisterForm />
    </div>
  );
}
