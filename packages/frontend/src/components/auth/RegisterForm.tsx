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

    console.log('📝 RegisterForm: Form submitted with data:', {
      email: formData.email,
      username: formData.username,
      fullName: formData.fullName,
      hasPassword: !!formData.password,
      passwordLength: formData.password.length
    });

    // Check password confirmation
    if (formData.password !== confirmPassword) {
      console.warn('❌ RegisterForm: Password confirmation failed');
      return; // Error shown in UI
    }

    console.log('🚀 RegisterForm: Calling register function...');
    try {
      // Convert empty fullName to undefined for proper optional field validation
      const requestData: RegisterRequest = {
        ...formData,
        fullName: formData.fullName?.trim() || undefined
      };
      const result = await register(requestData);
      console.log('✅ RegisterForm: Registration successful!', result);
      onSuccess?.();
    } catch (error) {
      // Error is handled by the hook and stored in the error state
      console.error('❌ RegisterForm: Registration failed:', error);
      console.error('Error details:', {
        name: (error as any)?.name,
        message: (error as any)?.message,
        status: (error as any)?.status,
        code: (error as any)?.code
      });
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
    <div className="tama-form">
      <h2 className="tama-heading tama-heading--automotive">🥚 Create Your Pet Profile!</h2>
      <p className="tama-text tama-text-automotive" style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
        Join TamaFriends and start raising your virtual pets
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="fullName" className="tama-form-label tama-form-label--automotive">
            Full Name (Optional)
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={formData.fullName}
            onChange={handleChange}
            className="tama-input tama-input--automotive"
            placeholder="Enter your full name"
            autoComplete="name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="username" className="tama-form-label tama-form-label--automotive">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            required
            className="tama-input tama-input--automotive"
            placeholder="Choose your pet keeper name"
            autoComplete="username"
            pattern="[a-zA-Z0-9_]{3,30}"
            title="Username must be 3-30 characters and contain only letters, numbers, and underscores"
          />
        </div>

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
            placeholder="Create a secure password"
            autoComplete="new-password"
            minLength={8}
          />
          <small className="tama-text" style={{ fontSize: 'var(--text-xs)', color: 'var(--tama-gray-600)' }}>
            Password must be at least 8 characters with uppercase, lowercase, number, and special character.
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword" className="tama-form-label tama-form-label--automotive">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            required
            className="tama-input tama-input--automotive"
            style={{ borderColor: showPasswordError ? 'var(--error)' : '' }}
            placeholder="Confirm your password"
            autoComplete="new-password"
          />
          {showPasswordError && (
            <div className="tama-form-error">Passwords do not match</div>
          )}
        </div>

        {error && (
          <div className="tama-alert tama-alert--error" role="alert">
            {error}
            {(error.includes('email already exists') || error.includes('username already exists')) && (
              <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)' }}>
                <p>
                  <strong>Development tip:</strong> You can clear mock data by running:
                </p>
                <code style={{ display: 'block', padding: 'var(--space-2)', background: 'var(--tama-gray-100)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)' }}>
                  fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/dev/reset-mock-data`, {'{ method: \'DELETE\' }'})
                </code>
                <p>in your browser console, or refresh the page to start fresh.</p>
              </div>
            )}
          </div>
        )}

        <div className="modal-actions modal-actions--automotive">
          <button
            type="submit"
            disabled={isLoading || !passwordsMatch}
            className="tama-btn tama-btn--automotive tama-btn--racing-red"
          >
            {isLoading ? '🐣 Creating account...' : '🎉 Start Pet Journey'}
          </button>
        </div>
      </form>

      <div style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
        <p className="tama-text">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="tama-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Sign in to your pets
          </button>
        </p>
      </div>
    </div>
  );
};