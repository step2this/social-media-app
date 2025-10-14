import React, { useState, useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './DevMenu.css';

/**
 * DevMenu component props
 */
export interface DevMenuProps {
  /**
   * Developer tools content to display in the menu
   */
  children: ReactNode;
}

/**
 * Developer menu with visible floating action button (FAB) and keyboard shortcuts
 *
 * Provides a slide-in panel from the right side with debugging tools.
 * - **FAB**: Always-visible button in bottom-right corner (🛠️)
 * - **Keyboard**: Ctrl+Shift+D (or Cmd+Shift+D on Mac)
 * - **Escape**: Close menu when open
 * - **Backdrop**: Click outside to close
 *
 * @example
 * ```tsx
 * <DevMenu>
 *   <DevReadStateDebugger posts={posts} />
 *   <DevApiLogger />
 * </DevMenu>
 * ```
 */
export const DevMenu: React.FC<DevMenuProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  /**
   * Toggle menu open/closed
   */
  const toggleMenu = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  /**
   * Close menu
   */
  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  /**
   * Handle keyboard shortcuts
   * - Ctrl+Shift+D or Cmd+Shift+D: Toggle menu
   * - Escape: Close menu when open
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+Shift+D or Cmd+Shift+D (Mac)
      if (
        event.key === 'D' &&
        event.shiftKey &&
        (event.ctrlKey || event.metaKey)
      ) {
        event.preventDefault();
        toggleMenu();
        return;
      }

      // Check for Escape key when menu is open
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        closeMenu();
        return;
      }
    };

    // Add event listener to document
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup on unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, toggleMenu, closeMenu]);

  /**
   * Handle backdrop click to close menu
   */
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    // Only close if clicking directly on backdrop, not on children
    if (event.target === event.currentTarget) {
      closeMenu();
    }
  }, [closeMenu]);

  return (
    <>
      {/* Floating Action Button - Always visible */}
      <button
        className="dev-menu__fab"
        onClick={toggleMenu}
        aria-label="Toggle developer tools"
        title="Developer Tools (Ctrl+Shift+D)"
        type="button"
      >
        🛠️
      </button>

      {/* Slide-in menu panel (only when open) */}
      {isOpen && createPortal(
        <div className="dev-menu">
          {/* Backdrop overlay */}
          <div
            className="dev-menu__backdrop"
            onClick={handleBackdropClick}
            role="button"
            tabIndex={-1}
            aria-label="Close developer menu"
          />

          {/* Slide-in panel */}
          <aside className="dev-menu__panel">
            {/* Header with title and close button */}
            <header className="dev-menu__header">
              <h2 className="dev-menu__title">Developer Tools</h2>
              <button
                className="dev-menu__close-button"
                onClick={closeMenu}
                aria-label="Close developer menu"
                type="button"
              >
                ×
              </button>
            </header>

            {/* Content area for dev tools */}
            <div className="dev-menu__content">
              {children}
            </div>
          </aside>
        </div>,
        document.body
      )}
    </>
  );
};
