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
 * Developer menu with persistent always-visible panel
 *
 * Provides a sticky panel from the right side with debugging tools that stays open.
 * - **FAB**: Always-visible button in bottom-right corner (🛠️)
 * - **Keyboard**: Ctrl+Shift+D (or Cmd+Shift+D on Mac) to toggle collapse/expand
 * - **Always Open**: Panel is always visible, can be collapsed to header bar
 * - **Backdrop**: Non-interactive, just provides visual separation
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  /**
   * Toggle between collapsed and expanded states
   */
  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  /**
   * Handle keyboard shortcuts
   * - Ctrl+Shift+D or Cmd+Shift+D: Toggle collapse/expand
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
        toggleCollapse();
        return;
      }
    };

    // Add event listener to document
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup on unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleCollapse]);


  return (
    <>
      {/* Floating Action Button - Always visible */}
      <button
        className="dev-menu__fab"
        onClick={toggleCollapse}
        aria-label={isCollapsed ? "Expand developer tools" : "Collapse developer tools"}
        title={`Developer Tools (Ctrl+Shift+D) - ${isCollapsed ? 'Expand' : 'Collapse'}`}
        type="button"
      >
        {isCollapsed ? '⬆️' : '⬇️'}
      </button>

      {/* Always-visible panel - can be collapsed to header only */}
      {createPortal(
        <div className={`dev-menu ${isCollapsed ? 'dev-menu--collapsed' : ''}`}>
          {/* Non-interactive backdrop overlay for visual separation */}
          <div className="dev-menu__backdrop" aria-hidden="true" />

          {/* Persistent panel */}
          <aside className={`dev-menu__panel ${isCollapsed ? 'dev-menu__panel--collapsed' : ''}`}>
            {/* Header with title and collapse button */}
            <header className="dev-menu__header">
              <h2 className="dev-menu__title">Developer Tools</h2>
              <button
                className="dev-menu__collapse-button"
                onClick={toggleCollapse}
                aria-label={isCollapsed ? "Expand developer tools" : "Collapse developer tools"}
                type="button"
                title={isCollapsed ? "Expand" : "Collapse"}
              >
                {isCollapsed ? '⬆️' : '⬇️'}
              </button>
            </header>

            {/* Content area for dev tools - hidden when collapsed */}
            {!isCollapsed && (
              <div className="dev-menu__content">
                {children}
              </div>
            )}
          </aside>
        </div>,
        document.body
      )}
    </>
  );
};
