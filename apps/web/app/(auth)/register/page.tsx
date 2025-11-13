import { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata: Metadata = {
  title: 'Register',
  description: 'Create a new account',
};

export default function RegisterPage() {
  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: '1.5rem', textAlign: 'center' }}>
        Create Account
      </h2>
      <RegisterForm />
    </div>
  );
}
