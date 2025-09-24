import React from 'react';
import { Navigation } from './Navigation';
import './AppLayout.css';

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, className = '' }) => (
  <div className={`app-layout ${className}`}>
    <Navigation />
    <main className="app-layout__main">
      <div className="app-layout__container">
        {children}
      </div>
    </main>
  </div>
);

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