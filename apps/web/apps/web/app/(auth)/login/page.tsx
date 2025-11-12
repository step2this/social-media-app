import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Login',
};

export default function LoginPage() {
  return (
    <div>
      <h2>Log In</h2>
      <p style={{background:"#e3f2fd",padding:"1rem",borderRadius:"8px",color:"#1976d2"}}>Login form will be implemented in Phase 2</p>
      <p><Link href="/register">Register</Link></p>
    </div>
  );
}
