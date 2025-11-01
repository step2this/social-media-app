/**
 * ResolverBuilder - Middleware-based Resolver Composition
 *
 * Provides a builder pattern for composing resolvers with middlewares.
 * Enables clean separation of cross-cutting concerns (auth, logging, validation).
 *
 * This pattern enables:
 * - Middleware Chain: Execute multiple middlewares in sequence
 * - Type Safety: Full TypeScript support for middleware stack
 * - Testability: Each middleware can be tested in isolation
 * - Reusability: Share middleware across resolvers
 * - Composability: Mix and match middleware as needed
 *
 * @example
 * ```typescript
 * // Create resolver with authentication and logging
 * const meResolver = new ResolverBuilder<any, GraphQLContext, any>()
 *   .use(authMiddleware)
 *   .use(loggingMiddleware)
 *   .resolve(async (_parent, _args, context) => {
 *     return profileService.getById(context.userId);
 *   });
 *
 * // Create public resolver with just logging
 * const profileResolver = new ResolverBuilder<any, GraphQLContext, ProfileArgs>()
 *   .use(loggingMiddleware)
 *   .resolve(async (_parent, args, _context) => {
 *     return profileService.getByHandle(args.handle);
 *   });
 * ```
 */

import type { GraphQLFieldResolver } from 'graphql';

/**
 * Middleware function type.
 *
 * A middleware can:
 * - Inspect/modify the context
 * - Short-circuit the request (not call next)
 * - Execute code before/after the resolver
 * - Handle errors
 *
 * @template TContext - The context type
 */
export type Middleware<TContext> = (
  context: TContext,
  next: () => Promise<unknown>
) => Promise<unknown>;

/**
 * Builder for composing resolvers with middleware.
 *
 * Provides a fluent API for adding middlewares and defining the resolver.
 * Middlewares are executed in the order they are added.
 *
 * @template TSource - The parent object type
 * @template TContext - The context type
 * @template TArgs - The arguments type
 *
 * @example
 * ```typescript
 * const builder = new ResolverBuilder<any, GraphQLContext, PostArgs>();
 *
 * const resolver = builder
 *   .use(async (context, next) => {
 *     console.log('Before resolver');
 *     const result = await next();
 *     console.log('After resolver');
 *     return result;
 *   })
 *   .resolve(async (_parent, args, _context) => {
 *     return postService.getById(args.id);
 *   });
 * ```
 */
export class ResolverBuilder<TSource, TContext, TArgs> {
  private middlewares: Middleware<TContext>[] = [];

  /**
   * Add a middleware to the chain.
   *
   * Middlewares are executed in the order they are added.
   * Each middleware must call `next()` to continue the chain.
   *
   * @param middleware - The middleware function to add
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * builder.use(async (context, next) => {
   *   // Code before resolver
   *   const result = await next();
   *   // Code after resolver
   *   return result;
   * });
   * ```
   */
  use(middleware: Middleware<TContext>): this {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Define the resolver function and build the final resolver.
   *
   * The resolver will be wrapped with all middlewares added via `use()`.
   * Middlewares execute in order, with the resolver executing last.
   *
   * @param resolver - The resolver function
   * @returns A GraphQL field resolver with all middlewares applied
   *
   * @example
   * ```typescript
   * const resolver = builder.resolve(async (_parent, args, context) => {
   *   // This executes after all middlewares
   *   return postService.getById(args.id);
   * });
   * ```
   */
  resolve(
    resolver: GraphQLFieldResolver<TSource, TContext, TArgs>
  ): GraphQLFieldResolver<TSource, TContext, TArgs> {
    return async (source, args, context, info) => {
      let index = 0;

      const next = async (): Promise<unknown> => {
        if (index < this.middlewares.length) {
          const middleware = this.middlewares[index++];
          return middleware(context, next);
        }
        return resolver(source, args, context, info);
      };

      return next() as ReturnType<typeof resolver>;
    };
  }
}
