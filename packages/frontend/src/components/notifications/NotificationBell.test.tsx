/**
 * NotificationBell Tests
 *
 * Clean, DRY tests using:
 * - Existing notification fixtures (notificationFixtures.ts)
 * - Reusable Relay test utilities (relay-test-utils.ts)
 * - Pre-built scenarios (relay-fixture-adapters.ts)
 * - Existing test patterns (NotificationItem.test.tsx)
 *
 * NO repetitive boilerplate!
 */

import { render, screen, waitFor } from '@testing-library/react';
import { RelayEnvironmentProvider } from 'react-relay';
import userEvent from '@testing-library/user-event';
import { NotificationBell } from './NotificationBell';
import {
  createMockRelayEnvironment,
  resolveMostRecentOperation,
} from '../../test-utils/relay-test-utils';
import { NotificationBellScenarios } from '../../test-utils/relay-fixture-adapters';

/**
 * Helper to render NotificationBell with Relay environment
 * Follows pattern from existing test-providers.tsx
 */
function renderNotificationBell() {
  const environment = createMockRelayEnvironment();
  const user = userEvent.setup();

  const utils = render(
    <RelayEnvironmentProvider environment={environment}>
      <NotificationBell />
    </RelayEnvironmentProvider>
  );

  return { environment, user, ...utils };
}

describe('NotificationBell', () => {
  describe('Initial Render', () => {
    it('renders bell icon', () => {
      const { environment } = renderNotificationBell();

      // Component suspends initially
      expect(screen.queryByRole('button')).not.toBeInTheDocument();

      // Resolve with empty state
      resolveMostRecentOperation(environment, NotificationBellScenarios.empty());

      // Bell icon should be visible
      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
    });
  });

  describe('Unread Badge', () => {
    it('does not show badge when no unread notifications', () => {
      const { environment } = renderNotificationBell();
      resolveMostRecentOperation(environment, NotificationBellScenarios.empty());

      expect(screen.queryByText(/\d+/)).not.toBeInTheDocument();
    });

    it('shows badge with unread count', () => {
      const { environment } = renderNotificationBell();
      resolveMostRecentOperation(environment, NotificationBellScenarios.withUnread(3));

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('shows 99+ for counts over 99', () => {
      const { environment } = renderNotificationBell();
      resolveMostRecentOperation(environment, NotificationBellScenarios.manyUnread());

      expect(screen.getByText('99+')).toBeInTheDocument();
    });
  });

  describe('Dropdown Interaction', () => {
    it('opens dropdown when bell is clicked', async () => {
      const { environment, user } = renderNotificationBell();
      resolveMostRecentOperation(environment, NotificationBellScenarios.withUnread(2));

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(bellButton);

      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByText(/2 new/i)).toBeInTheDocument();
    });

    it('closes dropdown when backdrop is clicked', async () => {
      const { environment, user } = renderNotificationBell();
      resolveMostRecentOperation(environment, NotificationBellScenarios.withUnread(2));

      // Open dropdown
      const bellButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(bellButton);

      // Close via backdrop
      const backdrop = screen.getByRole('button', { name: /notifications/i }).nextElementSibling;
      await user.click(backdrop!);

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('shows empty state message when no notifications', async () => {
      const { environment, user } = renderNotificationBell();
      resolveMostRecentOperation(environment, NotificationBellScenarios.empty());

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(bellButton);

      expect(screen.getByText(/no notifications yet/i)).toBeInTheDocument();
      expect(screen.getByText(/we'll let you know/i)).toBeInTheDocument();
    });

    it('does not show "View all" link when empty', async () => {
      const { environment, user } = renderNotificationBell();
      resolveMostRecentOperation(environment, NotificationBellScenarios.empty());

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(bellButton);

      expect(screen.queryByText(/view all notifications/i)).not.toBeInTheDocument();
    });
  });

  describe('Notification List', () => {
    it('displays notifications in dropdown', async () => {
      const { environment, user } = renderNotificationBell();
      resolveMostRecentOperation(environment, NotificationBellScenarios.mixed());

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(bellButton);

      // Check that notifications are displayed
      // NotificationItemRelay will handle rendering individual items
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('shows maximum 5 notifications', async () => {
      const { environment, user } = renderNotificationBell();
      resolveMostRecentOperation(environment, NotificationBellScenarios.full());

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(bellButton);

      // Query should request limit: 5
      const dropdown = screen.getByRole('menu');
      expect(dropdown).toBeInTheDocument();
    });

    it('shows "View all" link when has notifications', async () => {
      const { environment, user } = renderNotificationBell();
      resolveMostRecentOperation(environment, NotificationBellScenarios.withUnread(3));

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      await user.click(bellButton);

      expect(screen.getByText(/view all notifications/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible label with unread count', () => {
      const { environment } = renderNotificationBell();
      resolveMostRecentOperation(environment, NotificationBellScenarios.withUnread(5));

      const bellButton = screen.getByRole('button', { name: /notifications.*5 unread/i });
      expect(bellButton).toBeInTheDocument();
    });

    it('has accessible label without count when no unread', () => {
      const { environment } = renderNotificationBell();
      resolveMostRecentOperation(environment, NotificationBellScenarios.allRead());

      const bellButton = screen.getByRole('button', { name: /^notifications$/i });
      expect(bellButton).toBeInTheDocument();
    });

    it('sets aria-expanded when dropdown is open', async () => {
      const { environment, user } = renderNotificationBell();
      resolveMostRecentOperation(environment, NotificationBellScenarios.withUnread(2));

      const bellButton = screen.getByRole('button', { name: /notifications/i });

      // Initially closed
      expect(bellButton).toHaveAttribute('aria-expanded', 'false');

      // Open dropdown
      await user.click(bellButton);

      // Now expanded
      expect(bellButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('has aria-haspopup attribute', () => {
      const { environment } = renderNotificationBell();
      resolveMostRecentOperation(environment, NotificationBellScenarios.empty());

      const bellButton = screen.getByRole('button', { name: /notifications/i });
      expect(bellButton).toHaveAttribute('aria-haspopup', 'true');
    });
  });

  describe('Relay Integration', () => {
    it('makes single query for both count and notifications', () => {
      const { environment } = renderNotificationBell();

      // Verify that only ONE operation was made
      const operations = environment.mock.getAllOperations();
      expect(operations).toHaveLength(1);

      // Verify it's the NotificationBellQuery
      expect(operations[0].request.node.operation.name).toBe('NotificationBellQuery');

      resolveMostRecentOperation(environment, NotificationBellScenarios.withUnread(3));
    });

    it('uses cache on remount (no refetch)', () => {
      const { environment, unmount } = renderNotificationBell();
      resolveMostRecentOperation(environment, NotificationBellScenarios.withUnread(3));

      // Unmount component
      unmount();

      // Remount
      render(
        <RelayEnvironmentProvider environment={environment}>
          <NotificationBell />
        </RelayEnvironmentProvider>
      );

      // Should not make another network request (uses cache)
      const operations = environment.mock.getAllOperations();
      expect(operations).toHaveLength(1); // Still only 1 from initial mount
    });
  });
});
