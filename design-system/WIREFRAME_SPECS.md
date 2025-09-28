# Social Media Platform - Wireframe Specifications

## Overview
This document provides extracted specifications from the wireframe HTML for implementation in React with 80s retro styling overlay.

## Component Hierarchy

```
App
├── TopNavigation
│   ├── BrandLogo
│   ├── NavMenu
│   │   ├── NavMenuItem (Home)
│   │   ├── NavMenuItem (Explore)
│   │   ├── NavMenuItem (Create)
│   │   ├── NavMenuItem (Messages)
│   │   └── NavMenuItem (Profile)
│   └── UserMenu
│       ├── NotificationBell
│       └── UserDropdown
├── MainLayout
│   ├── LeftSidebar
│   │   ├── SidebarNavigation
│   │   ├── CreatePostButton
│   │   └── UserMiniProfile
│   ├── MainContent
│   │   ├── FeedContainer
│   │   │   └── PostCard[]
│   │   ├── ProfilePage
│   │   │   ├── ProfileHeader
│   │   │   ├── ProfileStats
│   │   │   └── PostGrid
│   │   └── CreatePostModal
│   └── RightPanel
│       ├── SuggestedUsers
│       ├── TrendingTags
│       └── ActivityFeed
└── MobileNavigation (responsive)
```

## Grid System Specifications

### Base Grid
- **System**: 12-column grid
- **Gap**: 20px default
- **Container max-width**: 1400px
- **Padding**: 20px on mobile, 40px on desktop

### Desktop Layout (≥1024px)
```
| Left Sidebar | Main Content | Right Panel |
|    280px     |   Flexible   |    320px    |
```

### Tablet Layout (768px - 1023px)
```
| Collapsible Sidebar | Main Content |
|       80px          |   Flexible   |
```

### Mobile Layout (<768px)
```
| Single Column Stack |
| Hidden Sidebars     |
| Bottom Navigation   |
```

## Component Specifications

### Navigation Components

| Component | Props | State | Implementation Notes |
|-----------|-------|-------|---------------------|
| `TopNavigation` | `currentRoute`, `user`, `notificationCount` | `mobileMenuOpen`, `userMenuOpen` | Fixed position, glass morphism effect with retro borders |
| `BrandLogo` | `animated: boolean`, `linkTo: string` | - | ASCII art logo with neon glow animation |
| `NavMenuItem` | `label`, `icon`, `route`, `active` | `isHovered` | Pixel transition effects, retro sound on hover |
| `UserMenu` | `user`, `onLogout` | `dropdownOpen` | Terminal-style dropdown with green text |

### Profile Components

| Component | Props | State | Implementation Notes |
|-----------|-------|-------|---------------------|
| `ProfilePage` | `handle: string`, `isOwnProfile: boolean` | `activeTab`, `isLoading` | Full page component |
| `ProfileHeader` | `profile`, `isOwnProfile`, `onEditClick` | - | 200px avatar, bio section, action buttons |
| `ProfileStats` | `posts`, `followers`, `following` | - | LCD-style number display with neon glow |
| `PostGrid` | `posts[]`, `onPostClick` | `selectedPost` | 3-column grid, square aspect ratio |
| `EditProfileModal` | `profile`, `onSave`, `onClose` | `formData`, `isSubmitting` | Terminal-style form inputs |

### Feed Components

| Component | Props | State | Implementation Notes |
|-----------|-------|-------|---------------------|
| `FeedContainer` | `posts[]`, `onLoadMore` | `isLoading`, `hasMore` | Infinite scroll implementation |
| `PostCard` | `post`, `currentUser`, `onLike`, `onComment` | `isLiked`, `showComments` | CRT scanline effects on images |
| `PostHeader` | `author`, `timestamp` | - | 50px avatar, username, time ago |
| `PostImage` | `src`, `alt`, `onDoubleClick` | `isLoading` | 400px height, maintain aspect ratio |
| `PostActions` | `likes`, `comments`, `onAction` | `activeAction` | Icon buttons with retro hover states |

### Sidebar Components

| Component | Props | State | Implementation Notes |
|-----------|-------|-------|---------------------|
| `LeftSidebar` | `user`, `currentRoute` | `isCollapsed` | 280px fixed width, collapsible on tablet |
| `SidebarNavigation` | `items[]`, `activeItem` | - | Vertical menu with ASCII borders |
| `CreatePostButton` | `onClick` | - | Primary action, neon pulse animation |
| `RightPanel` | `suggestions`, `trending` | - | 320px fixed width, hidden on mobile |

## Responsive Breakpoints

```scss
// Mobile
@media (max-width: 767px) {
  // Single column
  // Stack navigation
  // Hidden sidebars
  // Bottom tab bar
}

// Tablet
@media (min-width: 768px) and (max-width: 1023px) {
  // Two columns
  // Collapsible sidebar (icon only)
  // No right panel
}

// Desktop
@media (min-width: 1024px) {
  // Full three-column layout
  // All panels visible
  // Hover states enabled
}

// Wide Desktop
@media (min-width: 1440px) {
  // Centered container
  // Maximum width constraints
  // Increased spacing
}
```

## Retro Theme Variables

```css
:root {
  /* Primary Neon Palette */
  --neon-pink: #FF10F0;
  --neon-blue: #00FFFF;
  --neon-green: #39FF14;
  --neon-purple: #9D00FF;
  --neon-yellow: #FFFF00;
  --neon-orange: #FF6600;
  
  /* Background Colors */
  --bg-dark: #0a0a0a;
  --bg-terminal: #000000;
  --bg-crt: #001a00;
  --bg-grid: rgba(57, 255, 20, 0.03);
  
  /* Text Colors */
  --text-primary: #39FF14;
  --text-secondary: #00FFFF;
  --text-muted: #666666;
  --text-warning: #FFFF00;
  --text-error: #FF10F0;
  
  /* Border Styles */
  --border-neon: 2px solid var(--neon-green);
  --border-ascii: 2px dashed var(--neon-blue);
  
  /* Effects */
  --glow-strength: 0 0 20px;
  --scanline-opacity: 0.1;
  --pixel-size: 2px;
  --glitch-intensity: 2px;
  
  /* Spacing */
  --spacing-xs: 8px;
  --spacing-sm: 16px;
  --spacing-md: 24px;
  --spacing-lg: 32px;
  --spacing-xl: 48px;
}
```

## Styling Application Points

### Where to Apply Retro 80s Aesthetics

| Element | Retro Treatment |
|---------|----------------|
| **Buttons** | • Pixel borders using box-shadow<br>• Neon glow on hover<br>• ASCII art icons (►, ▼, ◄, ▲)<br>• Retro sound effects on click |
| **Cards/Panels** | • CRT scanline overlay<br>• Phosphor glow effect<br>• Terminal borders: ┌─┐│└┘<br>• Subtle glitch animation on hover |
| **Typography** | • Primary: Monospace fonts (Courier, Consolas)<br>• Headers: ASCII art generator<br>• Green/amber terminal colors<br>• Blinking cursor for inputs |
| **Forms/Inputs** | • Terminal prompt style (> _)<br>• Command-line aesthetics<br>• Matrix rain background<br>• Typewriter effect on focus |
| **Images** | • CRT screen curve effect<br>• RGB color separation on hover<br>• Scan lines overlay<br>• Polaroid-style borders |
| **Animations** | • Glitch effects (CSS)<br>• Typing animations<br>• Pixel transitions<br>• Neon flicker<br>• Wave/pulse effects |
| **Navigation** | • ASCII art dividers<br>• Retro game menu style<br>• Sound effects<br>• Pixel art icons |

## Implementation Checklist

### Phase 1: Structure
- [ ] Set up component file structure
- [ ] Create base layout components
- [ ] Implement responsive grid system
- [ ] Add routing structure

### Phase 2: Components
- [ ] Build TopNavigation
- [ ] Create ProfilePage components
- [ ] Implement FeedContainer and PostCard
- [ ] Add Sidebar components
- [ ] Create modals (CreatePost, EditProfile)

### Phase 3: Retro Styling
- [ ] Apply color palette from reference sites
- [ ] Add ASCII art elements
- [ ] Implement neon glow effects
- [ ] Add CRT/scanline overlays
- [ ] Create hover animations
- [ ] Add retro sound effects (optional)

### Phase 4: Integration
- [ ] Connect to existing backend APIs
- [ ] Wire up Zustand stores
- [ ] Implement authentication flow
- [ ] Add real-time updates
- [ ] Test responsive behavior

## Data Flow Integration

### Existing Backend Endpoints to Connect
```javascript
// From your API Reference
POST   /auth/register
POST   /auth/login
GET    /auth/profile
PUT    /auth/profile
GET    /profile/{handle}
POST   /posts
GET    /profile/{handle}/posts
DELETE /posts/{postId}
```

### State Management (Zustand)
```javascript
// Existing stores to utilize
useAuthStore    // User authentication state
useProfileStore // Profile data and updates
usePostStore    // Posts and feed management
```

## File Structure Recommendation

```
src/
├── components/
│   ├── layout/
│   │   ├── TopNavigation.tsx
│   │   ├── LeftSidebar.tsx
│   │   ├── RightPanel.tsx
│   │   └── MainLayout.tsx
│   ├── profile/
│   │   ├── ProfilePage.tsx
│   │   ├── ProfileHeader.tsx
│   │   ├── ProfileStats.tsx
│   │   ├── PostGrid.tsx
│   │   └── EditProfileModal.tsx
│   ├── feed/
│   │   ├── FeedContainer.tsx
│   │   ├── PostCard.tsx
│   │   ├── PostActions.tsx
│   │   └── CreatePostModal.tsx
│   └── common/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       └── Avatar.tsx
├── styles/
│   ├── retro-theme.css
│   ├── animations.css
│   └── ascii-borders.css
└── utils/
    ├── ascii-art.ts
    └── retro-sounds.ts
```

## ASCII Art Resources

### Border Characters
```
Box Drawing: ┌─┬─┐│ ├─┼─┤└─┴─┘
Double Line: ╔═╦═╗║ ╠═╬═╣╚═╩═╝
Mixed: ╒═╤═╕│ ╞═╪═╡╘═╧═╛
```

### Common ASCII Decorations
```
Headers: ═══════════════════════════
Dividers: -·-·-·-·-·-·-·-·-·-·-·-
Arrows: ► ▼ ◄ ▲ → ← ↑ ↓
Stars: ✦ ✧ ✶ ✷ ✸ ✹
```

## Notes for Claude Code

1. **Start with structure**: Build the component hierarchy first without styling
2. **Apply theme progressively**: Add retro styling after components work
3. **Use CSS variables**: Makes it easy to swap color schemes from reference sites
4. **Mobile-first approach**: Build for mobile, enhance for desktop
5. **Performance considerations**: Limit heavy animations on mobile devices
6. **Accessibility**: Ensure retro styling doesn't compromise usability

## Reference Integration

When you provide the two reference websites:
1. Extract their color palettes → map to CSS variables
2. Identify their typography styles → apply to appropriate text elements
3. Note their animation patterns → implement similar effects
4. Observe their border/decoration styles → recreate with ASCII/CSS
5. Capture their overall "vibe" → apply throughout the interface

---

*This specification should be used alongside the wireframe.html file for complete implementation guidance.*