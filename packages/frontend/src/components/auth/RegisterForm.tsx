import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import type { RegisterRequest } from '@social-media-app/shared';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onSwitchToLogin
}) => {
  const { register, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState<RegisterRequest>({
    email: '',
    password: '',
    username: '',
    fullName: ''
  });
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check password confirmation
    if (formData.password !== confirmPassword) {
      return; // Error shown in UI
    }

    try {
      await register(formData);
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

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);

    // Clear error when user starts typing
    if (error) {
      clearError();
    }
  };

  const passwordsMatch = formData.password === confirmPassword;
  const showPasswordError = confirmPassword && !passwordsMatch;

  return (
    <div className="auth-form">
      <h2>Create Account</h2>

      <form onSubmit={handleSubmit} className="auth-form__form">
        <div className="form-group">
          <label htmlFor="fullName" className="form-label">
            Full Name (Optional)
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={formData.fullName}
            onChange={handleChange}
            className="form-input"
            placeholder="Enter your full name"
            autoComplete="name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="username" className="form-label">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            required
            className="form-input"
            placeholder="Choose a username"
            autoComplete="username"
            pattern="[a-zA-Z0-9_]{3,30}"
            title="Username must be 3-30 characters and contain only letters, numbers, and underscores"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email" className="form-label">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="form-input"
            placeholder="Enter your email"
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="form-input"
            placeholder="Create a password"
            autoComplete="new-password"
            minLength={8}
          />
          <small className="form-help">
            Password must be at least 8 characters with uppercase, lowercase, number, and special character.
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword" className="form-label">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            required
            className={`form-input ${showPasswordError ? 'form-input--error' : ''}`}
            placeholder="Confirm your password"
            autoComplete="new-password"
          />
          {showPasswordError && (
            <small className="form-error">Passwords do not match</small>
          )}
        </div>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !passwordsMatch}
          className="btn btn-primary"
        >
          {isLoading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div className="auth-form__footer">
        <p>
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="link-button"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};