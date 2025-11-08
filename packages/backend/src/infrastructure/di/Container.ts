/**
 * Dependency Injection Container for Backend Lambda Handlers
 *
 * Lightweight DI container for managing service dependencies in Lambda handlers.
 * Provides type-safe service registration and resolution with lazy initialization.
 *
 * @example
 * ```typescript
 * const container = new Container();
 *
 * // Register services with factory functions (lazy initialization)
 * container.register('DynamoDBClient', () => createDynamoDBClient());
 * container.register('AuthService', () => {
 *   const client = container.resolve('DynamoDBClient');
 *   return createDefaultAuthService(client, tableName, jwtProvider);
 * });
 *
 * // Resolve services when needed
 * const authService = container.resolve<AuthService>('AuthService');
 * ```
 */

export class Container {
  private services = new Map<string, () => any>();
  private singletons = new Map<string, any>();

  /**
   * Register a service with a factory function.
   *
   * The factory function will be called lazily when the service is first resolved.
   * Services are singletons - the factory is only called once per service name.
   *
   * @param name - Unique service identifier
   * @param factory - Function that creates the service instance
   *
   * @example
   * ```typescript
   * container.register('PostService', () => new PostService(dynamoClient, tableName));
   * ```
   */
  register<T>(name: string, factory: () => T): void {
    if (this.services.has(name)) {
      throw new Error(`Service "${name}" is already registered`);
    }
    this.services.set(name, factory as () => any);
  }

  /**
   * Resolve a service by name.
   *
   * Returns the singleton instance, creating it on first access.
   * Throws if the service is not registered.
   *
   * @param name - Service identifier
   * @returns The resolved service instance
   *
   * @example
   * ```typescript
   * const postService = container.resolve<PostService>('PostService');
   * ```
   */
  resolve<T>(name: string): T {
    // Check if already instantiated (singleton pattern)
    if (this.singletons.has(name)) {
      return this.singletons.get(name) as T;
    }

    // Get factory function
    const factory = this.services.get(name);
    if (!factory) {
      throw new Error(`Service "${name}" is not registered`);
    }

    // Create instance and cache it
    const instance = factory();
    this.singletons.set(name, instance);
    return instance as T;
  }

  /**
   * Check if a service is registered.
   *
   * @param name - Service identifier
   * @returns True if the service is registered
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Clear all registered services and singletons.
   * Useful for testing or hot-reloading scenarios.
   */
  clear(): void {
    this.services.clear();
    this.singletons.clear();
  }

  /**
   * Get all registered service names.
   * Useful for debugging or inspection.
   */
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }
}
