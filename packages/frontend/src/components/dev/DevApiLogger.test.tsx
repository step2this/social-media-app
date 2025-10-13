import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { DevApiLogger } from './DevApiLogger';
import type { ApiLogEntry } from './DevApiLogger';

describe('DevApiLogger', () => {
  const mockLogs: ApiLogEntry[] = [
    {
      id: '1',
      timestamp: new Date('2025-01-01T12:00:00Z'),
      method: 'GET',
      endpoint: '/api/posts',
      status: 'success',
      statusCode: 200,
      responseTime: 150
    },
    {
      id: '2',
      timestamp: new Date('2025-01-01T12:01:00Z'),
      method: 'POST',
      endpoint: '/api/posts/like',
      status: 'success',
      statusCode: 201,
      responseTime: 250
    },
    {
      id: '3',
      timestamp: new Date('2025-01-01T12:02:00Z'),
      method: 'DELETE',
      endpoint: '/api/posts/123',
      status: 'error',
      statusCode: 404,
      responseTime: 100
    }
  ];

  test('renders empty log initially', () => {
    render(<DevApiLogger logs={[]} />);
    expect(screen.getByText(/API Call Log/i)).toBeInTheDocument();
    expect(screen.getByText(/No API calls/i)).toBeInTheDocument();
  });

  test('displays logged API calls', () => {
    render(<DevApiLogger logs={mockLogs} />);
    expect(screen.queryByText(/No API calls/i)).not.toBeInTheDocument();
    expect(screen.getByText('/api/posts')).toBeInTheDocument();
    expect(screen.getByText('/api/posts/like')).toBeInTheDocument();
    expect(screen.getByText('/api/posts/123')).toBeInTheDocument();
  });

  test('shows timestamp for each call', () => {
    render(<DevApiLogger logs={mockLogs} />);
    // Check for time display (e.g., "12:00:00")
    expect(screen.getByText(/12:00/)).toBeInTheDocument();
  });

  test('displays HTTP method badge for GET', () => {
    render(<DevApiLogger logs={mockLogs} />);
    expect(screen.getByText('GET')).toBeInTheDocument();
  });

  test('displays HTTP method badge for POST', () => {
    render(<DevApiLogger logs={mockLogs} />);
    expect(screen.getByText('POST')).toBeInTheDocument();
  });

  test('displays HTTP method badge for DELETE', () => {
    render(<DevApiLogger logs={mockLogs} />);
    expect(screen.getByText('DELETE')).toBeInTheDocument();
  });

  test('shows endpoint path', () => {
    render(<DevApiLogger logs={mockLogs} />);
    expect(screen.getByText('/api/posts')).toBeInTheDocument();
    expect(screen.getByText('/api/posts/like')).toBeInTheDocument();
  });

  test('indicates success status with proper styling', () => {
    const { container } = render(<DevApiLogger logs={[mockLogs[0]]} />);
    const entry = container.querySelector('.dev-api-logger__entry--success');
    expect(entry).toBeInTheDocument();
  });

  test('indicates error status with proper styling', () => {
    const { container } = render(<DevApiLogger logs={[mockLogs[2]]} />);
    const entry = container.querySelector('.dev-api-logger__entry--error');
    expect(entry).toBeInTheDocument();
  });

  test('clears log on clear button click', () => {
    const onClear = vi.fn();
    render(<DevApiLogger logs={mockLogs} onClear={onClear} />);
    const clearButton = screen.getByRole('button', { name: /clear/i });
    fireEvent.click(clearButton);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  test('limits log display to 50 most recent entries', () => {
    const manyLogs: ApiLogEntry[] = Array.from({ length: 60 }, (_, i) => ({
      id: `log-${i}`,
      timestamp: new Date(),
      method: 'GET',
      endpoint: `/api/item/${i}`,
      status: 'success',
      statusCode: 200
    }));

    render(<DevApiLogger logs={manyLogs} />);

    // Should only display 50 entries
    const entries = screen.queryAllByText(/\/api\/item\//);
    expect(entries.length).toBe(50);
  });

  test('displays most recent logs first', () => {
    const orderedLogs: ApiLogEntry[] = [
      {
        id: 'oldest',
        timestamp: new Date('2025-01-01T10:00:00Z'),
        method: 'GET',
        endpoint: '/api/old',
        status: 'success'
      },
      {
        id: 'newest',
        timestamp: new Date('2025-01-01T12:00:00Z'),
        method: 'GET',
        endpoint: '/api/new',
        status: 'success'
      }
    ];

    const { container } = render(<DevApiLogger logs={orderedLogs} />);
    const entries = container.querySelectorAll('.dev-api-logger__entry');

    // First entry should be the newest
    expect(entries[0]?.textContent).toContain('/api/new');
  });

  test('displays status code when available', () => {
    render(<DevApiLogger logs={mockLogs} />);
    expect(screen.getByText(/200/)).toBeInTheDocument();
    expect(screen.getByText(/404/)).toBeInTheDocument();
  });

  test('handles logs without status code gracefully', () => {
    const logsWithoutStatusCode: ApiLogEntry[] = [
      {
        id: '1',
        timestamp: new Date(),
        method: 'GET',
        endpoint: '/api/test',
        status: 'success'
      }
    ];

    render(<DevApiLogger logs={logsWithoutStatusCode} />);
    expect(screen.getByText('/api/test')).toBeInTheDocument();
  });
});