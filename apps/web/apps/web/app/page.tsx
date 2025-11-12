import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Welcome to Social Media App</h1>
      <p>Next.js Migration - Phase 0 Complete!</p>
      <nav style={{ marginTop: '2rem' }}>
        <Link href="/login" style={{ margin: '0 1rem' }}>Login</Link>
        <Link href="/register" style={{ margin: '0 1rem' }}>Register</Link>
      </nav>
    </div>
  );
}
