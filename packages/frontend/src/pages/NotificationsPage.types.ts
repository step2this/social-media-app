/**
 * NotificationsPage Advanced TypeScript Types
 *
 * Applies advanced TypeScript patterns from the TypeScript Advanced Types guide:
 * - Discriminated unions for state management
 * - Generic types for reusable patterns
 * - Mapped types for transformations
 * - Utility types (Pick, Omit, Record) for type manipulation
 * - Template literal types for CSS class names
 * - Conditional types for type-safe operations
 */

import type { Notification, NotificationType } from '@social-media-app/shared';

/**
 * ====================
 * DISCRIMINATED UNIONS
 * ====================
 * Type-safe state management using discriminated unions
 * Each state has a unique 'status' discriminator
 */

/**
 * Loading state - data is being fetched
 */
export type LoadingState = {
  status: 'loading';
};

/**
 * Success state - data loaded successfully
 */
export type SuccessState<T> = {
  status: 'success';
  data: T;
};

/**
 * Error state - something went wrong
 */
export type ErrorState = {
  status: 'error';
  error: string;
};

/**
 * Empty state - no data available
 */
export type EmptyState = {
  status: 'empty';
};

/**
 * Async state discriminated union
 * Enables exhaustive type checking with switch/case
 */
export type AsyncState<T> =
  | LoadingState
  | SuccessState<T>
  | ErrorState
  | EmptyState;

/**
 * Notification page state - uses discriminated union
 */
export type NotificationPageState = AsyncState<Notification[]>;

/**
 * ====================
 * UTILITY TYPES
 * ====================
 * Using TypeScript's built-in utility types for type manipulation
 */

/**
 * Readonly notification - prevents mutations
 * Uses Readonly utility type for immutability
 */
export type ReadonlyNotification = Readonly<Notification>;

/**
 * Notification with only required fields for display
 * Uses Pick utility type to select specific properties
 */
export type NotificationDisplayProps = Pick<
  Notification,
  'id' | 'type' | 'status' | 'message' | 'createdAt' | 'actor' | 'target'
>;

/**
 * Notification without internal metadata
 * Uses Omit utility type to exclude properties
 */
export type PublicNotification = Omit<Notification, 'metadata' | 'deliveryChannels'>;

/**
 * Partial notification for updates
 * Uses Partial utility type to make all fields optional
 */
export type NotificationUpdate = Partial<Pick<Notification, 'status' | 'readAt'>>;

/**
 * ====================
 * MAPPED TYPES
 * ====================
 * Transform existing types by iterating over properties
 */

/**
 * Notification group configuration map
 * Uses Record mapped type for type-safe configuration
 */
export type NotificationGroupConfig = Record<TimeGroupKey, {
  readonly title: string;
  readonly order: number;
  readonly maxAgeDays: number;
}>;

/**
 * Time group keys for organizing notifications
 */
export type TimeGroupKey = 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'earlier';

/**
 * Notification groups mapped by time period
 * Uses Record type for type-safe grouping
 */
export type NotificationGroups = Record<TimeGroupKey, ReadonlyArray<Notification>>;

/**
 * ====================
 * TEMPLATE LITERAL TYPES
 * ====================
 * Create string-based types with pattern matching
 */

/**
 * CSS class name prefix
 */
type CSSPrefix = 'notification-icon';

/**
 * Notification icon color classes
 * Uses template literal types for type-safe CSS class names
 */
export type NotificationIconColor =
  | `${CSSPrefix}--like`
  | `${CSSPrefix}--comment`
  | `${CSSPrefix}--follow`
  | `${CSSPrefix}--mention`
  | `${CSSPrefix}--reply`
  | `${CSSPrefix}--repost`
  | `${CSSPrefix}--quote`
  | `${CSSPrefix}--system`
  | '';

/**
 * Notification item CSS classes
 * Uses template literal types for component class names
 */
export type NotificationItemClass =
  | 'notification-item'
  | 'notification-item--unread'
  | 'notification-item--read';

/**
 * ====================
 * CONDITIONAL TYPES
 * ====================
 * Types that depend on conditions for sophisticated type logic
 */

/**
 * Extract notification types that have actors
 * Uses conditional type to filter notification types
 */
export type NotificationWithActor = Extract<
  NotificationType,
  'like' | 'comment' | 'follow' | 'mention' | 'reply' | 'repost' | 'quote'
>;

/**
 * Extract notification types without actors
 * Uses conditional type to exclude notification types
 */
export type NotificationWithoutActor = Exclude<
  NotificationType,
  NotificationWithActor
>;

/**
 * Check if notification type has target
 * Uses conditional type for type checking
 */
export type HasTarget<T extends NotificationType> =
  T extends 'like' | 'comment' | 'mention' | 'reply' | 'repost' | 'quote'
    ? true
    : false;

/**
 * ====================
 * GENERIC TYPES
 * ====================
 * Reusable type-flexible components with type constraints
 */

/**
 * Generic event handler type with constraints
 * T must extend HTMLElement for DOM events
 */
export type EventHandler<T extends HTMLElement = HTMLElement> = (
  event: React.MouseEvent<T>
) => void | Promise<void>;

/**
 * Generic async operation result
 * Wraps any type in a success/error result
 */
export type OperationResult<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Generic callback with no return value
 * Accepts any arguments, returns void or Promise<void>
 */
export type VoidCallback<TArgs extends unknown[] = []> = (...args: TArgs) => void | Promise<void>;

/**
 * ====================
 * COMPONENT PROP TYPES
 * ====================
 * Type-safe props for components using utility types
 */

/**
 * Base notification item props
 * Uses Pick to select only needed properties
 */
export type BaseNotificationItemProps = {
  readonly notification: ReadonlyNotification;
  readonly onClick: VoidCallback<[Notification]>;
  readonly onDelete: VoidCallback<[string, React.MouseEvent]>;
};

/**
 * Notification avatar props
 * Uses conditional types for optional properties
 */
export type NotificationAvatarProps = {
  readonly avatarUrl?: string;
  readonly displayName?: string;
  readonly handle?: string;
  readonly notificationType: NotificationType;
};

/**
 * Notification content props
 * Extracts only content-related fields
 */
export type NotificationContentProps = Pick<
  Notification,
  'type' | 'message' | 'createdAt' | 'actor'
> & {
  readonly preview?: string;
};

/**
 * Notification thumbnail props
 * Uses conditional type to require thumbnailUrl when present
 */
export type NotificationThumbnailProps = {
  readonly thumbnailUrl: string;
  readonly altText?: string;
};

/**
 * Notification unread dot props
 * Simple boolean prop with ARIA support
 */
export type NotificationUnreadDotProps = {
  readonly isUnread: boolean;
  readonly ariaLabel?: string;
};

/**
 * ====================
 * HELPER FUNCTION TYPES
 * ====================
 * Type-safe function signatures
 */

/**
 * Notification grouping function type
 * Takes notifications array, returns grouped notifications
 */
export type GroupNotificationsFn = (
  notifications: ReadonlyArray<Notification>
) => NotificationGroups;

/**
 * Notification text formatter function type
 * Takes notification, returns formatted text
 */
export type FormatNotificationTextFn = (
  notification: ReadonlyNotification
) => string;

/**
 * Timestamp formatter function type
 * Takes ISO timestamp, returns human-readable string
 */
export type FormatTimestampFn = (timestamp: string) => string;

/**
 * Icon resolver function type
 * Takes notification type, returns Material Icon name
 */
export type GetIconNameFn = (type: NotificationType) => string;

/**
 * Color resolver function type
 * Takes notification type, returns CSS class name
 */
export type GetIconColorFn = (type: NotificationType) => NotificationIconColor;

/**
 * ====================
 * BRANDED TYPES
 * ====================
 * Prevent mixing incompatible string types
 */

/**
 * Branded type for notification IDs
 * Prevents accidentally using regular strings as IDs
 */
export type NotificationId = string & { readonly __brand: 'NotificationId' };

/**
 * Branded type for timestamps
 * Ensures ISO 8601 format strings
 */
export type ISOTimestamp = string & { readonly __brand: 'ISOTimestamp' };

/**
 * Type guard to check if string is valid notification ID
 */
export function isNotificationId(value: string): value is NotificationId {
  return value.length > 0 && /^[a-zA-Z0-9-]+$/.test(value);
}

/**
 * Type guard to check if string is valid ISO timestamp
 */
export function isISOTimestamp(value: string): value is ISOTimestamp {
  return !isNaN(Date.parse(value));
}

/**
 * ====================
 * TYPE TESTS
 * ====================
 * Compile-time type tests to verify type behavior
 */
