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
 * Hidden developer menu accessible via Ctrl+Shift+D (or Cmd+Shift+D on Mac)
 *
 * Provides a slide-in panel from the right side with debugging tools.
 * Includes backdrop overlay that closes menu on click.
 * Supports Escape key to close.
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

  // Don't render anything if menu is closed
  if (!isOpen) {
    return null;
  }

  // Render menu using portal to ensure it's on top of everything
  return createPortal(
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
  );
};
