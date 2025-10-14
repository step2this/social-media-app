import React, { useEffect, useState } from 'react';
import { LeftSidebar } from './LeftSidebar';
import { RightPanel } from './RightPanel';
import { MobileNavigation } from './MobileNavigation';
import { DevMenu, DevCacheStatusIndicator, DevKinesisMonitor } from '../dev';
import './AppLayout.css';

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Hook to detect responsive breakpoints for Instagram-style layout
 * - mobile: ≤767px (bottom nav only)
 * - medium-tablet: 768px-1023px (icon-only sidebar)
 * - large-tablet: 1024px-1399px (icon-only sidebar with right panel)
 * - desktop: ≥1400px (full sidebar with right panel)
 */
const useResponsiveLayout = () => {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'medium-tablet' | 'large-tablet' | 'desktop'>('desktop');
  const [sidebarState, setSidebarState] = useState<'hidden' | 'collapsed' | 'expanded'>('expanded');

  useEffect(() => {
    const checkBreakpoint = () => {
      if (window.matchMedia('(max-width: 767px)').matches) {
        setBreakpoint('mobile');
        setSidebarState('hidden');
      } else if (window.matchMedia('(min-width: 768px) and (max-width: 1023px)').matches) {
        setBreakpoint('medium-tablet');
        setSidebarState('collapsed');
      } else if (window.matchMedia('(min-width: 1024px) and (max-width: 1399px)').matches) {
        setBreakpoint('large-tablet');
        setSidebarState('collapsed');
      } else {
        setBreakpoint('desktop');
        setSidebarState('expanded');
      }
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  return { breakpoint, sidebarState };
};

/**
 * Instagram-style layout with fixed positioned sidebar
 * - Mobile: ≤767px - Single column + bottom navigation
 * - Medium Tablet: 768-1023px - Icon-only fixed sidebar + main content
 * - Large Tablet: 1024-1399px - Icon-only fixed sidebar + main content + right panel
 * - Desktop: ≥1400px - Full fixed sidebar + main content + right panel
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ children, className = '' }) => {
  const { breakpoint, sidebarState } = useResponsiveLayout();

  if (breakpoint === 'mobile') {
    return (
      <div className={`app-layout app-layout--mobile ${className}`}>
        <main className="app-layout__main app-layout__main--mobile">
          <div className="app-layout__container app-layout__container--mobile">
            {children}
          </div>
        </main>
        <MobileNavigation />
        {/* Global developer tools - available on all pages */}
        {import.meta.env.DEV && (
          <DevMenu>
            <DevCacheStatusIndicator />
            <DevKinesisMonitor />
          </DevMenu>
        )}
      </div>
    );
  }

  return (
    <div className={`app-layout app-layout--instagram app-layout--${breakpoint} ${className}`}>
      {/* Fixed positioned left sidebar that sticks to screen edge */}
      <LeftSidebar
        collapsed={sidebarState === 'collapsed'}
        className="app-layout__left-sidebar--fixed"
      />
      {/* Main content with dynamic left margin based on sidebar state */}
      <main className={`app-layout__main app-layout__main--instagram app-layout__main--${sidebarState}`}>
        <div className="app-layout__container app-layout__container--instagram">
          {children}
        </div>
      </main>
      {/* Right panel only shows on large-tablet and desktop */}
      {(breakpoint === 'large-tablet' || breakpoint === 'desktop') && <RightPanel />}
      {/* Global developer tools - available on all pages */}
      {import.meta.env.DEV && (
        <DevMenu>
          <DevCacheStatusIndicator />
          <DevKinesisMonitor />
        </DevMenu>
      )}
    </div>
  );
};

// Instagram-inspired content layouts
interface ContentLayoutProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

export const ContentLayout: React.FC<ContentLayoutProps> = ({
  children,
  maxWidth = 'md',
  className = ''
}) => (
  <div className={`content-layout content-layout--${maxWidth} ${className}`}>
    {children}
  </div>
);

// Feed Layout (Instagram-style)
interface FeedLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  className?: string;
}

export const FeedLayout: React.FC<FeedLayoutProps> = ({
  children,
  sidebar,
  className = ''
}) => (
  <div className={`feed-layout ${className}`}>
    <div className="feed-layout__main">
      {children}
    </div>
    {sidebar && (
      <aside className="feed-layout__sidebar hidden-mobile">
        {sidebar}
      </aside>
    )}
  </div>
);

// Profile Layout
interface ProfileLayoutProps {
  children: React.ReactNode;
  header: React.ReactNode;
  className?: string;
}

export const ProfileLayout: React.FC<ProfileLayoutProps> = ({
  children,
  header,
  className = ''
}) => (
  <div className={`profile-layout ${className}`}>
    <div className="profile-layout__header">
      {header}
    </div>
    <div className="profile-layout__content">
      {children}
    </div>
  </div>
);

// Card Component (Instagram post-style)
interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'retro' | 'neon';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  role?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  role
}) => (
  <div className={`card card--${variant} card--padding-${padding} ${className}`} role={role}>
    {children}
  </div>
);

// Story Ring (Instagram-style)
interface StoryRingProps {
  children: React.ReactNode;
  hasStory?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StoryRing: React.FC<StoryRingProps> = ({
  children,
  hasStory = false,
  size = 'md',
  className = ''
}) => (
  <div className={`story-ring story-ring--${size} ${hasStory ? 'story-ring--active' : ''} ${className}`}>
    <div className="story-ring__inner">
      {children}
    </div>
  </div>
);