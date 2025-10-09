// import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { RegisterForm } from './RegisterForm.js';
import { useAuth } from '../../hooks/useAuth.js';

// Mock the useAuth hook
vi.mock('../../hooks/useAuth.js', () => ({
  useAuth: vi.fn()
}));

const mockUseAuth = useAuth as any;

describe('RegisterForm', () => {
  const mockRegister = vi.fn();
  const mockClearError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      register: mockRegister,
      isLoading: false,
      error: null,
      clearError: mockClearError
    });
  });

  describe('Form Data Processing', () => {
    it('should submit form with valid data', async () => {
      const onSuccess = vi.fn();

      render(<RegisterForm onSuccess={onSuccess} />);

      // Fill in the form
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/username/i), {
        target: { value: 'testuser' }
      });
      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: 'ValidP@ss123' }
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'ValidP@ss123' }
      });

      // Mock successful registration
      mockRegister.mockResolvedValueOnce({
        user: { id: '1', email: 'test@example.com', username: 'testuser' },
        message: 'Success'
      });

      // Submit the form
      fireEvent.click(screen.getByRole('button', { name: /start pet journey/i }));

      // Wait for the register function to be called
      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledTimes(1);
      });

      // Verify form data submitted correctly
      const callArgs = mockRegister.mock.calls[0][0];
      expect(callArgs).toEqual({
        email: 'test@example.com',
        username: 'testuser',
        password: 'ValidP@ss123'
      });
    });
  });
});