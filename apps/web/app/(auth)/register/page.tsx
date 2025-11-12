import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Register',
};

export default function RegisterPage() {
  return (
    <div>
      <h2>Create Account</h2>
      <p className="info-text">Registration form will be implemented in Phase 2</p>
      <p><Link href="/login">Login</Link></p>
    </div>
  );
}
