import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DevMenu } from './DevMenu';

describe('DevMenu', () => {
  beforeEach(() => {
    // Clear any existing event listeners
    vi.clearAllMocks();
  });

  describe('Visibility', () => {
    it('should be hidden by default', () => {
      render(
        <DevMenu>
          <div data-testid="dev-content">Dev Tools</div>
        </DevMenu>
      );

      expect(screen.queryByTestId('dev-content')).not.toBeInTheDocument();
      expect(screen.queryByText('Developer Tools')).not.toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should open on Ctrl+Shift+D', async () => {
      const user = userEvent.setup();
      render(
        <DevMenu>
          <div data-testid="dev-content">Dev Tools</div>
        </DevMenu>
      );

      // Verify menu is initially closed
      expect(screen.queryByTestId('dev-content')).not.toBeInTheDocument();

      // Press Ctrl+Shift+D
      await user.keyboard('{Control>}{Shift>}D{/Shift}{/Control}');

      // Verify menu is now visible
      await waitFor(() => {
        expect(screen.getByTestId('dev-content')).toBeInTheDocument();
        expect(screen.getByText('Developer Tools')).toBeInTheDocument();
      });
    });

    it('should close on Ctrl+Shift+D when already open', async () => {
      const user = userEvent.setup();
      render(
        <DevMenu>
          <div data-testid="dev-content">Dev Tools</div>
        </DevMenu>
      );

      // Open menu
      await user.keyboard('{Control>}{Shift>}D{/Shift}{/Control}');
      await waitFor(() => {
        expect(screen.getByTestId('dev-content')).toBeInTheDocument();
      });

      // Close menu with same shortcut
      await user.keyboard('{Control>}{Shift>}D{/Shift}{/Control}');
      await waitFor(() => {
        expect(screen.queryByTestId('dev-content')).not.toBeInTheDocument();
      });
    });

    it('should close on Escape key when open', async () => {
      const user = userEvent.setup();
      render(
        <DevMenu>
          <div data-testid="dev-content">Dev Tools</div>
        </DevMenu>
      );

      // Open menu
      await user.keyboard('{Control>}{Shift>}D{/Shift}{/Control}');
      await waitFor(() => {
        expect(screen.getByTestId('dev-content')).toBeInTheDocument();
      });

      // Press Escape to close
      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByTestId('dev-content')).not.toBeInTheDocument();
      });
    });

    it('should support Cmd+Shift+D on Mac', async () => {
      const user = userEvent.setup();
      render(
        <DevMenu>
          <div data-testid="dev-content">Dev Tools</div>
        </DevMenu>
      );

      // Press Cmd+Shift+D (Meta key for Mac)
      await user.keyboard('{Meta>}{Shift>}D{/Shift}{/Meta}');

      // Verify menu is now visible
      await waitFor(() => {
        expect(screen.getByTestId('dev-content')).toBeInTheDocument();
      });
    });
  });

  describe('Backdrop Interaction', () => {
    it('should close on backdrop click', async () => {
      const user = userEvent.setup();
      render(
        <DevMenu>
          <div data-testid="dev-content">Dev Tools</div>
        </DevMenu>
      );

      // Open menu
      await user.keyboard('{Control>}{Shift>}D{/Shift}{/Control}');
      await waitFor(() => {
        expect(screen.getByTestId('dev-content')).toBeInTheDocument();
      });

      // Click backdrop
      const backdrop = document.querySelector('.dev-menu__backdrop');
      expect(backdrop).toBeInTheDocument();

      await user.click(backdrop as Element);

      // Verify menu is closed
      await waitFor(() => {
        expect(screen.queryByTestId('dev-content')).not.toBeInTheDocument();
      });
    });
  });

  describe('UI Structure', () => {
    it('should render with backdrop overlay when open', async () => {
      const user = userEvent.setup();
      render(
        <DevMenu>
          <div data-testid="dev-content">Dev Tools</div>
        </DevMenu>
      );

      // Open menu
      await user.keyboard('{Control>}{Shift>}D{/Shift}{/Control}');

      await waitFor(() => {
        const menu = document.querySelector('.dev-menu');
        const backdrop = document.querySelector('.dev-menu__backdrop');
        const panel = document.querySelector('.dev-menu__panel');

        expect(menu).toBeInTheDocument();
        expect(backdrop).toBeInTheDocument();
        expect(panel).toBeInTheDocument();
      });
    });

    it('should render header with title and close button', async () => {
      const user = userEvent.setup();
      render(
        <DevMenu>
          <div data-testid="dev-content">Dev Tools</div>
        </DevMenu>
      );

      // Open menu
      await user.keyboard('{Control>}{Shift>}D{/Shift}{/Control}');

      await waitFor(() => {
        expect(screen.getByText('Developer Tools')).toBeInTheDocument();
        // Look for button by text content (×)
        const closeButton = document.querySelector('.dev-menu__close-button');
        expect(closeButton).toBeInTheDocument();
      });
    });

    it('should close when clicking close button', async () => {
      const user = userEvent.setup();
      render(
        <DevMenu>
          <div data-testid="dev-content">Dev Tools</div>
        </DevMenu>
      );

      // Open menu
      await user.keyboard('{Control>}{Shift>}D{/Shift}{/Control}');

      await waitFor(() => {
        expect(screen.getByTestId('dev-content')).toBeInTheDocument();
      });

      // Click close button using class selector to avoid ambiguity
      const closeButton = document.querySelector('.dev-menu__close-button');
      expect(closeButton).toBeInTheDocument();
      await user.click(closeButton as Element);

      // Verify menu is closed
      await waitFor(() => {
        expect(screen.queryByTestId('dev-content')).not.toBeInTheDocument();
      });
    });
  });

  describe('Children Rendering', () => {
    it('should render children when menu is open', async () => {
      const user = userEvent.setup();
      render(
        <DevMenu>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </DevMenu>
      );

      // Open menu
      await user.keyboard('{Control>}{Shift>}D{/Shift}{/Control}');

      await waitFor(() => {
        expect(screen.getByTestId('child-1')).toBeInTheDocument();
        expect(screen.getByTestId('child-2')).toBeInTheDocument();
      });
    });
  });

  describe('Cleanup', () => {
    it('should clean up keyboard listeners on unmount', async () => {
      const { unmount } = render(
        <DevMenu>
          <div data-testid="dev-content">Dev Tools</div>
        </DevMenu>
      );

      // Spy on removeEventListener
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      // Unmount component
      unmount();

      // Verify event listeners were removed
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });
});
