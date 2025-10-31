/**
 * Relay Provider Component
 *
 * Wraps the application (or parts of it) with RelayEnvironmentProvider
 * to make the Relay Environment available to all child components.
 *
 * TDD Note: This is a simple wrapper component - tested via integration
 */

import type { ReactNode } from 'react';
import { RelayEnvironmentProvider } from 'react-relay';
import { RelayEnvironment } from './RelayEnvironment.js';

/**
 * Props for RelayProvider
 */
export interface RelayProviderProps {
  readonly children: ReactNode;
}

/**
 * RelayProvider Component
 *
 * Provides the Relay Environment to the component tree.
 * Similar to how React Context works, any component within this provider
 * can use Relay hooks (useLazyLoadQuery, useMutation, etc.)
 *
 * @example
 * ```tsx
 * // Wrap your app or specific features
 * function App() {
 *   return (
 *     <RelayProvider>
 *       <YourComponents />
 *     </RelayProvider>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Or wrap specific feature areas
 * function NotificationBell() {
 *   return (
 *     <RelayProvider>
 *       <NotificationBellRelay />
 *     </RelayProvider>
 *   );
 * }
 * ```
 */
export function RelayProvider({ children }: RelayProviderProps): JSX.Element {
  return (
    <RelayEnvironmentProvider environment={RelayEnvironment}>
      {children}
    </RelayEnvironmentProvider>
  );
}
