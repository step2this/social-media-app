import { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Log in to your account',
};

export default function LoginPage() {
  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: '1.5rem', textAlign: 'center' }}>
        Log In
      </h2>
      <LoginForm />
    </div>
  );
}
