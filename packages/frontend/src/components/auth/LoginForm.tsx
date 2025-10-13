import React, { useState, useCallback } from 'react';
import { useActionState } from 'react';
import { flushSync } from 'react-dom';
import { useAuth } from '../../hooks/useAuth.js';
import type { LoginRequest } from '@social-media-app/shared';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

interface LoginFormActionState {
  success?: boolean;
  error?: string;
}

const initialActionState: LoginFormActionState = {};

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onSwitchToRegister
}) => {
  const { login } = useAuth();
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [displayError, setDisplayError] = useState<string | null>(null);

  // Action function for login
  const loginAction = useCallback(async (
    _prevState: LoginFormActionState,
    _formData: FormData
  ): Promise<LoginFormActionState> => {
    // eslint-disable-next-line no-console
    console.log('📝 LoginForm: Form submitted with data:', {
      email: formData.email,
      hasPassword: !!formData.password,
      passwordLength: formData.password.length
    });

    // eslint-disable-next-line no-console
    console.log('🚀 LoginForm: Calling login function...');
    try {
      const result = await login(formData);
      // eslint-disable-next-line no-console
      console.log('✅ LoginForm: Login successful!', result);

      setIsSubmitting(false);

      // Call success callback
      onSuccess?.();

      return { success: true };
    } catch (error: unknown) {
      setIsSubmitting(false);

      // Error is handled by the hook and stored in the error state
      // eslint-disable-next-line no-console
      console.error('❌ LoginForm: Login failed:', error);
      // eslint-disable-next-line no-console
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        status: (error as { status?: number })?.status,
        code: (error as { code?: string })?.code
      });

      const errorMsg = error instanceof Error ? error.message : 'Login failed. Please try again.';
      setDisplayError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [formData, login, onSuccess]);

  const [actionState, formAction] = useActionState(loginAction, initialActionState);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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

        {(displayError || actionState.error) && (
          <div className="tama-alert tama-alert--error" role="alert">
            {displayError || actionState.error}
          </div>
        )}

        <div className="modal-actions modal-actions--automotive">
          <button
            type="submit"
            disabled={isSubmitting}
            className="tama-btn tama-btn--automotive tama-btn--racing-red"
          >
            {isSubmitting ? '🐣 Signing in...' : '🌟 Sign In'}
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
