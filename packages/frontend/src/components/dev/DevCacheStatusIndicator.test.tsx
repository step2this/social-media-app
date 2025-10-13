import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, beforeEach, afterEach, describe, test, expect } from 'vitest';
import { DevCacheStatusIndicator } from './DevCacheStatusIndicator';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('DevCacheStatusIndicator', () => {
  const mockSuccessResponse = {
    redis: {
      connected: true,
      latency: 5
    },
    stats: {
      hits: 700,
      misses: 100,
      hitRate: 0.875
    },
    kinesis: {
      streamName: 'feed-events-local',
      status: 'ACTIVE'
    },
    environment: 'development'
  };

  const mockRedisErrorResponse = {
    redis: {
      connected: false,
      error: 'Connection refused'
    },
    stats: {
      hits: 0,
      misses: 0,
      hitRate: 0
    },
    kinesis: {
      streamName: 'feed-events-local',
      status: 'ACTIVE'
    },
    environment: 'development'
  };

  const mockKinesisErrorResponse = {
    redis: {
      connected: true,
      latency: 5
    },
    stats: {
      hits: 700,
      misses: 100,
      hitRate: 0.875
    },
    kinesis: {
      streamName: 'feed-events-local',
      status: 'UNKNOWN',
      error: 'Stream not found'
    },
    environment: 'development'
  };

  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  test('renders loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<DevCacheStatusIndicator />);

    expect(screen.getByText(/Cache & Streaming Status/i)).toBeInTheDocument();
    expect(screen.getByText(/Loading status.../i)).toBeInTheDocument();
  });

  test('fetches and displays cache status successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSuccessResponse
    } as Response);

    render(<DevCacheStatusIndicator />);

    await waitFor(() => {
      expect(screen.getByText(/✅ Connected/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/5ms latency/i)).toBeInTheDocument();
    expect(screen.getByText(/87.5%/i)).toBeInTheDocument();
    expect(screen.getByText(/700\/800 requests/i)).toBeInTheDocument();
    expect(screen.getByText(/🟢 ACTIVE/i)).toBeInTheDocument();
    expect(screen.getByText(/feed-events-local/i)).toBeInTheDocument();
  });

  test('displays Redis disconnected state', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRedisErrorResponse
    } as Response);

    render(<DevCacheStatusIndicator />);

    await waitFor(() => {
      expect(screen.getByText(/❌ Disconnected/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Connection refused/i)).toBeInTheDocument();
  });

  test('displays Kinesis error state', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockKinesisErrorResponse
    } as Response);

    render(<DevCacheStatusIndicator />);

    await waitFor(() => {
      expect(screen.getByText(/⚪ UNKNOWN/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Stream not found/i)).toBeInTheDocument();
  });

  test('handles fetch error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<DevCacheStatusIndicator />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch status/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Network error/i)).toBeInTheDocument();
  });

  test('handles HTTP error responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden'
    } as Response);

    render(<DevCacheStatusIndicator />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch status/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/HTTP 403: Forbidden/i)).toBeInTheDocument();
  });

  test('sets up polling interval on mount', async () => {
    const mockSetInterval = vi.spyOn(global, 'setInterval');

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockSuccessResponse
    } as Response);

    render(<DevCacheStatusIndicator pollingInterval={100} />);

    // Wait for initial fetch
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Verify setInterval was called with correct interval
    expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 100);

    mockSetInterval.mockRestore();
  });

  test('uses correct API endpoint from environment', async () => {
    import.meta.env.VITE_API_URL = 'http://test-api:3001';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSuccessResponse
    } as Response);

    render(<DevCacheStatusIndicator />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://test-api:3001/dev/cache-status',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );
    });
  });

  test('displays hit rate correctly when no requests made', async () => {
    const noRequestsResponse = {
      ...mockSuccessResponse,
      stats: {
        hits: 0,
        misses: 0,
        hitRate: 0
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => noRequestsResponse
    } as Response);

    render(<DevCacheStatusIndicator />);

    await waitFor(() => {
      expect(screen.getByText(/0.0%/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/0\/0 requests/i)).toBeInTheDocument();
  });

  test('displays different Kinesis status emojis', async () => {
    const statuses = [
      { status: 'ACTIVE', emoji: '🟢' },
      { status: 'CREATING', emoji: '🟡' },
      { status: 'DELETING', emoji: '🔴' },
      { status: 'UPDATING', emoji: '🟠' },
      { status: 'UNKNOWN', emoji: '⚪' }
    ] as const;

    for (const { status, emoji } of statuses) {
      const response = {
        ...mockSuccessResponse,
        kinesis: {
          ...mockSuccessResponse.kinesis,
          status
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => response
      } as Response);

      const { unmount } = render(<DevCacheStatusIndicator />);

      await waitFor(() => {
        expect(screen.getByText(new RegExp(`${emoji}.*${status}`, 'i'))).toBeInTheDocument();
      });

      unmount();
    }
  });

  test('displays last updated time', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockSuccessResponse
    } as Response);

    render(<DevCacheStatusIndicator />);

    // Wait for initial fetch
    await waitFor(() => {
      expect(screen.getByText(/0s ago/i)).toBeInTheDocument();
    });

    // Verify timestamp is displayed
    expect(screen.getByText(/Last Updated:/i)).toBeInTheDocument();
  });

  test('displays environment badge', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSuccessResponse
    } as Response);

    render(<DevCacheStatusIndicator />);

    await waitFor(() => {
      expect(screen.getByText(/development/i)).toBeInTheDocument();
    });
  });

  test('cleans up intervals on unmount', async () => {
    const mockClearInterval = vi.spyOn(global, 'clearInterval');

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockSuccessResponse
    } as Response);

    const { unmount } = render(<DevCacheStatusIndicator pollingInterval={100} />);

    // Wait for initial fetch
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Unmount the component
    unmount();

    // Verify clearInterval was called (for both polling and clock intervals)
    expect(mockClearInterval).toHaveBeenCalled();

    mockClearInterval.mockRestore();
  });

  test('error state shows appropriate error message', async () => {
    // First call fails
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<DevCacheStatusIndicator />);

    // Should show error state
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch status/i)).toBeInTheDocument();
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });
});
