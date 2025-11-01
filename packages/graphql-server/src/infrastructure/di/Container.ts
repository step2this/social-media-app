/**
 * Container - Simple Service Container for Dependency Injection
 *
 * Provides type-safe service registration and resolution.
 * Uses the Service Locator pattern with constructor injection.
 *
 * This container enables:
 * - Type Safety: Generic methods preserve type information
 * - Simplicity: No external dependencies, just a Map
 * - Testability: Easy to mock services in tests
 * - Flexibility: Lazy initialization via factory functions
 *
 * @example
 * ```typescript
 * const container = new Container();
 *
 * // Register a service
 * container.register<IProfileRepository>('ProfileRepository', () =>
 *   new ProfileServiceAdapter(profileService)
 * );
 *
 * // Resolve a service
 * const repo = container.resolve<IProfileRepository>('ProfileRepository');
 * ```
 */

/**
 * Factory function type for creating service instances.
 *
 * Factories enable:
 * - Lazy initialization (service created only when needed)
 * - Dynamic dependencies (can resolve other services)
 * - Testability (easy to provide mocks)
 *
 * @template T - The service type
 */
export type ServiceFactory<T> = () => T;

/**
 * Simple Dependency Injection Container.
 *
 * Manages service registration and resolution using the Service Locator pattern.
 * Services are registered with string keys and factory functions.
 *
 * @example
 * ```typescript
 * const container = new Container();
 *
 * // Register services
 * container.register('Config', () => ({ apiUrl: 'http://localhost' }));
 * container.register('ProfileRepository', () =>
 *   new ProfileServiceAdapter(profileService)
 * );
 * container.register('GetProfileUseCase', () =>
 *   new GetProfile(container.resolve('ProfileRepository'))
 * );
 *
 * // Resolve services
 * const useCase = container.resolve<GetProfile>('GetProfileUseCase');
 * ```
 */
export class Container {
  private services: Map<string, ServiceFactory<unknown>> = new Map();

  /**
   * Register a service with a unique key.
   *
   * The factory function will be called each time the service is resolved.
   * For singleton behavior, wrap the factory with memoization.
   *
   * @param key - Unique service identifier (typically the class name)
   * @param factory - Function that creates the service instance
   *
   * @example
   * ```typescript
   * container.register<IProfileRepository>('ProfileRepository', () =>
   *   new ProfileServiceAdapter(profileService)
   * );
   * ```
   */
  register<T>(key: string, factory: ServiceFactory<T>): void {
    this.services.set(key, factory as ServiceFactory<unknown>);
  }

  /**
   * Resolve a service by its key.
   *
   * Executes the factory function and returns the service instance.
   * Throws an error if the service is not registered.
   *
   * @param key - The service identifier
   * @returns The service instance
   * @throws {Error} If service not found
   *
   * @example
   * ```typescript
   * const repo = container.resolve<IProfileRepository>('ProfileRepository');
   * ```
   */
  resolve<T>(key: string): T {
    const factory = this.services.get(key);
    if (!factory) {
      throw new Error(`Service not found: ${key}`);
    }
    return factory() as T;
  }

  /**
   * Check if a service is registered.
   *
   * Useful for conditional logic or testing.
   *
   * @param key - The service identifier
   * @returns true if registered, false otherwise
   *
   * @example
   * ```typescript
   * if (container.has('OptionalService')) {
   *   const service = container.resolve<OptionalService>('OptionalService');
   * }
   * ```
   */
  has(key: string): boolean {
    return this.services.has(key);
  }

  /**
   * Clear all registered services.
   *
   * Useful for resetting state in tests.
   *
   * @example
   * ```typescript
   * afterEach(() => {
   *   container.clear();
   * });
   * ```
   */
  clear(): void {
    this.services.clear();
  }
}
