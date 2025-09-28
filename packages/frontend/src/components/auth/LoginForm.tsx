import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import type { LoginRequest } from '@social-media-app/shared';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onSwitchToRegister
}) => {
  const { login, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await login(formData);
      onSuccess?.();
    } catch {
      // Error is handled by the hook and stored in the error state
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (error) {
      clearError();
    }
  };

  return (
    <div className="tama-form">
      <h2 className="tama-heading tama-heading--automotive">🐾 Welcome Back!</h2>
      <p className="tama-text tama-text-automotive" style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
        Sign in to continue caring for your virtual pets
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email" className="tama-form-label tama-form-label--automotive">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="tama-input tama-input--automotive"
            placeholder="Enter your email"
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password" className="tama-form-label tama-form-label--automotive">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="tama-input tama-input--automotive"
            placeholder="Enter your password"
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="tama-alert tama-alert--error" role="alert">
            {error}
          </div>
        )}

        <div className="modal-actions modal-actions--automotive">
          <button
            type="submit"
            disabled={isLoading}
            className="tama-btn tama-btn--automotive tama-btn--racing-red"
          >
            {isLoading ? '🐣 Signing in...' : '🌟 Sign In'}
          </button>
        </div>
      </form>

      <div style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
        <p className="tama-text">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="tama-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Create your pet profile
          </button>
        </p>
      </div>
    </div>
  );
};