import React, { useState, useCallback } from 'react';
import { useActionState } from 'react';
import { flushSync } from 'react-dom';
import { useAuth } from '../../hooks/useAuth.js';
import type { RegisterRequest } from '@social-media-app/shared';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

interface RegisterFormActionState {
  success?: boolean;
  error?: string;
}

const initialActionState: RegisterFormActionState = {};

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onSwitchToLogin
}) => {
  const { register } = useAuth();
  const [formData, setFormData] = useState<RegisterRequest>({
    email: '',
    password: '',
    username: ''
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [displayError, setDisplayError] = useState<string | null>(null);

  // Action function for registration
  const registerAction = useCallback(async (
    _prevState: RegisterFormActionState,
    _formData: FormData
  ): Promise<RegisterFormActionState> => {
    // eslint-disable-next-line no-console
    console.log('📝 RegisterForm: Form submitted with data:', {
      email: formData.email,
      username: formData.username,
      hasPassword: !!formData.password,
      passwordLength: formData.password.length
    });

    // Check password confirmation
    if (formData.password !== confirmPassword) {
      // eslint-disable-next-line no-console
      console.warn('❌ RegisterForm: Password confirmation failed');
      setIsSubmitting(false);
      const errorMsg = 'Passwords do not match';
      setDisplayError(errorMsg);
      return { success: false, error: errorMsg };
    }

    // eslint-disable-next-line no-console
    console.log('🚀 RegisterForm: Calling register function...');
    try {
      const result = await register(formData);
      // eslint-disable-next-line no-console
      console.log('✅ RegisterForm: Registration successful!', result);

      setIsSubmitting(false);

      // Call success callback
      onSuccess?.();

      return { success: true };
    } catch (error: unknown) {
      setIsSubmitting(false);

      // Error is handled by the hook and stored in the error state
      // eslint-disable-next-line no-console
      console.error('❌ RegisterForm: Registration failed:', error);
      // eslint-disable-next-line no-console
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        status: (error as { status?: number })?.status,
        code: (error as { code?: string })?.code
      });

      const errorMsg = error instanceof Error ? error.message : 'Registration failed. Please try again.';
      setDisplayError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [formData, confirmPassword, register, onSuccess]);

  const [actionState, formAction] = useActionState(registerAction, initialActionState);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordsMatch) {
      return;
    }

    flushSync(() => {
      setIsSubmitting(true);
    });

    const formDataObj = new FormData();
    formAction(formDataObj);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (displayError) {
      setDisplayError(null);
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);

    // Clear error when user starts typing
    if (displayError) {
      setDisplayError(null);
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

        {(displayError || actionState.error) && (
          <div className="tama-alert tama-alert--error" role="alert">
            {displayError || actionState.error}
            {((displayError || actionState.error)?.includes('email already exists') ||
              (displayError || actionState.error)?.includes('username already exists')) && (
              <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)' }}>
                <p>
                  <strong>Development tip:</strong> You can clear mock data by running:
                </p>
                <code style={{ display: 'block', padding: 'var(--space-2)', background: 'var(--tama-gray-100)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)' }}>
                  fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/dev/reset-mock-data', {'{ method: \'DELETE\' }'})
                </code>
                <p>in your browser console, or refresh the page to start fresh.</p>
              </div>
            )}
          </div>
        )}

        <div className="modal-actions modal-actions--automotive">
          <button
            type="submit"
            disabled={isSubmitting || !passwordsMatch}
            className="tama-btn tama-btn--automotive tama-btn--racing-red"
          >
            {isSubmitting ? '🐣 Creating account...' : '🎉 Start Pet Journey'}
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
