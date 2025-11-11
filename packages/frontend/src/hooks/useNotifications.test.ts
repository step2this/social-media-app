/**
 * useNotifications Hook Tests
 *
 * TDD approach: Write tests first
 * Tests the custom hook for fetching and managing notifications
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useNotifications } from './useNotifications.js';
import { createMockNotifications } from '../services/__tests__/fixtures/notificationFixtures.js';
import type { INotificationDataService } from '../services/interfaces/INotificationDataService.js';

// Mock notification data service
const createMockNotificationDataService = (): INotificationDataService => ({
  getNotifications: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  deleteNotification: vi.fn(),
  getUnreadCount: vi.fn(),
});

describe('useNotifications', () => {
  let mockService: INotificationDataService;

  beforeEach(() => {
    mockService = createMockNotificationDataService();
  });

  describe('Initial State', () => {
    it('should start in loading state', () => {
      vi.mocked(mockService.getNotifications).mockResolvedValue({
        status: 'success',
        data: []
      });

      const { result } = renderHook(() => useNotifications(mockService));

      expect(result.current.loading).toBe(true);
      expect(result.current.notifications).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Loading Notifications', () => {
    it('should load notifications on mount', async () => {
      const notifications = createMockNotifications(5);
      vi.mocked(mockService.getNotifications).mockResolvedValue({
        status: 'success',
        data: notifications
      });

      const { result } = renderHook(() => useNotifications(mockService));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.notifications).toEqual(notifications);
      expect(result.current.error).toBeNull();
      expect(mockService.getNotifications).toHaveBeenCalledWith({ limit: 100 });
    });

    it('should handle loading errors', async () => {
      vi.mocked(mockService.getNotifications).mockResolvedValue({
        status: 'error',
        error: 'Failed to load'
      });

      const { result } = renderHook(() => useNotifications(mockService));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load notifications. Please try again.');
      expect(result.current.notifications).toEqual([]);
    });

    it('should handle network exceptions', async () => {
      vi.mocked(mockService.getNotifications).mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() => useNotifications(mockService));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load notifications. Please try again.');
    });
  });

  describe('Retry Functionality', () => {
    it('should retry loading notifications', async () => {
      vi.mocked(mockService.getNotifications).mockResolvedValue({
        status: 'error',
        error: 'Failed to load'
      });

      const { result } = renderHook(() => useNotifications(mockService));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Now succeed on retry
      const notifications = createMockNotifications(3);
      vi.mocked(mockService.getNotifications).mockResolvedValue({
        status: 'success',
        data: notifications
      });

      result.current.retry();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.notifications).toEqual(notifications);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Pagination', () => {
    it('should track hasMore based on result count', async () => {
      const notifications = createMockNotifications(100);
      vi.mocked(mockService.getNotifications).mockResolvedValue({
        status: 'success',
        data: notifications
      });

      const { result } = renderHook(() => useNotifications(mockService));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasMore).toBe(true);
    });

    it('should set hasMore to false when fewer results returned', async () => {
      const notifications = createMockNotifications(5);
      vi.mocked(mockService.getNotifications).mockResolvedValue({
        status: 'success',
        data: notifications
      });

      const { result } = renderHook(() => useNotifications(mockService));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasMore).toBe(false);
    });

    it('should load more notifications', async () => {
      const initialNotifications = createMockNotifications(100);
      const moreNotifications = createMockNotifications(50);

      vi.mocked(mockService.getNotifications)
        .mockResolvedValueOnce({
          status: 'success',
          data: initialNotifications
        })
        .mockResolvedValueOnce({
          status: 'success',
          data: moreNotifications
        });

      const { result } = renderHook(() => useNotifications(mockService));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.loadMore();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.notifications).toHaveLength(150);
      expect(result.current.hasMore).toBe(false);
    });
  });

  describe('Unread Count', () => {
    it('should calculate unread count correctly', async () => {
      const notifications = [
        ...createMockNotifications(3, { status: 'unread' }),
        ...createMockNotifications(2, { status: 'read' })
      ];

      vi.mocked(mockService.getNotifications).mockResolvedValue({
        status: 'success',
        data: notifications
      });

      const { result } = renderHook(() => useNotifications(mockService));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasUnreadNotifications).toBe(true);
    });

    it('should return false when no unread notifications', async () => {
      const notifications = createMockNotifications(3, { status: 'read' });

      vi.mocked(mockService.getNotifications).mockResolvedValue({
        status: 'success',
        data: notifications
      });

      const { result } = renderHook(() => useNotifications(mockService));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasUnreadNotifications).toBe(false);
    });
  });

  describe('State Setter Exposure', () => {
    it('should expose setNotifications for external state updates', async () => {
      vi.mocked(mockService.getNotifications).mockResolvedValue({
        status: 'success',
        data: []
      });

      const { result } = renderHook(() => useNotifications(mockService));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.setNotifications).toBe('function');

      // Test that external state updates work
      const newNotifications = createMockNotifications(3);
      act(() => {
        result.current.setNotifications(newNotifications);
      });

      expect(result.current.notifications).toEqual(newNotifications);
    });

    it('should allow functional updates via setNotifications', async () => {
      const initialNotifications = createMockNotifications(2);
      vi.mocked(mockService.getNotifications).mockResolvedValue({
        status: 'success',
        data: initialNotifications
      });

      const { result } = renderHook(() => useNotifications(mockService));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Test functional update pattern
      act(() => {
        result.current.setNotifications(prev =>
          prev.map(n => ({ ...n, status: 'read' as const }))
        );
      });

      expect(result.current.notifications.every(n => n.status === 'read')).toBe(true);
    });
  });
});
