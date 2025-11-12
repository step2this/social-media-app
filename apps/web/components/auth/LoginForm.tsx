'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { LoginRequest } from '@social-media-app/shared';

export function LoginForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      // Success - redirect to home
      router.push('/');
      router.refresh(); // Refresh server components
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && (
        <div style={{
          padding: '0.75rem',
          background: '#fee',
          color: '#c00',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem' }}>
          Email
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
        />
      </div>

      <div>
        <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem' }}>
          Password
        </label>
        <input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          padding: '0.75rem',
          background: '#1976d2',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontWeight: 600,
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          opacity: isSubmitting ? 0.6 : 1,
        }}
      >
        {isSubmitting ? 'Logging in...' : 'Log In'}
      </button>

      <p style={{ textAlign: 'center', marginTop: '1rem' }}>
        Don&apos;t have an account?{' '}
        <Link href="/register" style={{ color: '#1976d2', textDecoration: 'underline' }}>
          Register
        </Link>
      </p>
    </form>
  );
}
