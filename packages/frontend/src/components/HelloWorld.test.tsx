import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HelloWorld } from './HelloWorld';
import { apiClient } from '../services/apiClient';
import { useHelloStore } from '../stores/helloStore';

vi.mock('../services/apiClient', () => ({
  apiClient: {
    sendHello: vi.fn()
  }
}));

describe('HelloWorld Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useHelloStore.getState().reset();
  });

  it('should render input and button', () => {
    render(<HelloWorld />);

    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Say Hello' })).toBeInTheDocument();
  });

  it('should send hello request with entered name', async () => {
    const mockResponse = {
      message: 'Hello John!',
      name: 'John',
      timestamp: '2024-01-01T00:00:00.000Z',
      serverTime: '2024-01-01T00:00:00.000Z'
    };
    vi.mocked(apiClient.sendHello).mockResolvedValue(mockResponse);

    const user = userEvent.setup();
    render(<HelloWorld />);

    const input = screen.getByPlaceholderText('Enter your name');
    const button = screen.getByRole('button', { name: 'Say Hello' });

    await user.type(input, 'John');
    await user.click(button);

    await waitFor(() => {
      expect(apiClient.sendHello).toHaveBeenCalledWith({ name: 'John' });
      expect(screen.getByText('Hello John!')).toBeInTheDocument();
    });
  });

  it('should use default name when input is empty', async () => {
    const mockResponse = {
      message: 'Hello World!',
      name: 'World',
      timestamp: '2024-01-01T00:00:00.000Z',
      serverTime: '2024-01-01T00:00:00.000Z'
    };
    vi.mocked(apiClient.sendHello).mockResolvedValue(mockResponse);

    const user = userEvent.setup();
    render(<HelloWorld />);

    const button = screen.getByRole('button', { name: 'Say Hello' });
    await user.click(button);

    await waitFor(() => {
      expect(apiClient.sendHello).toHaveBeenCalledWith({ name: 'World' });
      expect(screen.getByText('Hello World!')).toBeInTheDocument();
    });
  });

  it('should display error message on failure', async () => {
    const errorMessage = 'Network error';
    vi.mocked(apiClient.sendHello).mockRejectedValue(new Error(errorMessage));

    const user = userEvent.setup();
    render(<HelloWorld />);

    const button = screen.getByRole('button', { name: 'Say Hello' });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
    });
  });

  it('should disable button while loading', async () => {
    vi.mocked(apiClient.sendHello).mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, 100))
    );

    const user = userEvent.setup();
    render(<HelloWorld />);

    const button = screen.getByRole('button', { name: 'Say Hello' });
    await user.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Sending...');
  });

  it('should display server time in response', async () => {
    const serverTime = '2024-01-01T12:30:45.000Z';
    const mockResponse = {
      message: 'Hello Test!',
      name: 'Test',
      timestamp: '2024-01-01T00:00:00.000Z',
      serverTime
    };
    vi.mocked(apiClient.sendHello).mockResolvedValue(mockResponse);

    const user = userEvent.setup();
    render(<HelloWorld />);

    const button = screen.getByRole('button', { name: 'Say Hello' });
    await user.type(screen.getByPlaceholderText('Enter your name'), 'Test');
    await user.click(button);

    await waitFor(() => {
      const expectedTime = new Date(serverTime).toLocaleString();
      expect(screen.getByText(`Server time: ${expectedTime}`)).toBeInTheDocument();
    });
  });
});