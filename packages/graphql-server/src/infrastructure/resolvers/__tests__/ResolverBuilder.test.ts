/**
 * ResolverBuilder Tests
 *
 * TDD for ResolverBuilder middleware composition class.
 * Tests middleware chain execution and resolver wrapping.
 */

import { describe, it, expect, vi } from 'vitest';
import type { GraphQLFieldResolver } from 'graphql';
import { ResolverBuilder, type Middleware } from '../ResolverBuilder.js';

describe('ResolverBuilder', () => {
  describe('Basic functionality', () => {
    it('should execute resolver without middlewares', async () => {
      const mockResolver: GraphQLFieldResolver<any, any, any, string> = vi.fn(
        async () => 'result'
      );

      const builder = new ResolverBuilder();
      const resolver = builder.resolve(mockResolver);

      const result = await resolver({}, {}, {}, {} as any);

      expect(result).toBe('result');
      expect(mockResolver).toHaveBeenCalledTimes(1);
    });

    it('should execute single middleware before resolver', async () => {
      const executionOrder: string[] = [];

      const middleware: Middleware<any> = async (context, next) => {
        executionOrder.push('middleware-before');
        const result = await next();
        executionOrder.push('middleware-after');
        return result;
      };

      const mockResolver: GraphQLFieldResolver<any, any, any, string> = vi.fn(
        async () => {
          executionOrder.push('resolver');
          return 'result';
        }
      );

      const builder = new ResolverBuilder();
      const resolver = builder.use(middleware).resolve(mockResolver);

      await resolver({}, {}, {}, {} as any);

      expect(executionOrder).toEqual([
        'middleware-before',
        'resolver',
        'middleware-after',
      ]);
    });

    it('should execute multiple middlewares in order', async () => {
      const executionOrder: string[] = [];

      const middleware1: Middleware<any> = async (context, next) => {
        executionOrder.push('middleware1-before');
        const result = await next();
        executionOrder.push('middleware1-after');
        return result;
      };

      const middleware2: Middleware<any> = async (context, next) => {
        executionOrder.push('middleware2-before');
        const result = await next();
        executionOrder.push('middleware2-after');
        return result;
      };

      const mockResolver: GraphQLFieldResolver<any, any, any, string> = vi.fn(
        async () => {
          executionOrder.push('resolver');
          return 'result';
        }
      );

      const builder = new ResolverBuilder();
      const resolver = builder
        .use(middleware1)
        .use(middleware2)
        .resolve(mockResolver);

      await resolver({}, {}, {}, {} as any);

      expect(executionOrder).toEqual([
        'middleware1-before',
        'middleware2-before',
        'resolver',
        'middleware2-after',
        'middleware1-after',
      ]);
    });
  });

  describe('Context handling', () => {
    it('should pass context through middleware chain', async () => {
      const mockContext = { userId: 'user-123', requestId: 'req-456' };

      const middleware: Middleware<typeof mockContext> = async (
        context,
        next
      ) => {
        expect(context.userId).toBe('user-123');
        expect(context.requestId).toBe('req-456');
        return next();
      };

      const mockResolver: GraphQLFieldResolver<
        any,
        typeof mockContext,
        any,
        string
      > = vi.fn(async (_parent, _args, context) => {
        expect(context.userId).toBe('user-123');
        return 'result';
      });

      const builder = new ResolverBuilder<any, typeof mockContext, any>();
      const resolver = builder.use(middleware).resolve(mockResolver);

      await resolver({}, {}, mockContext, {} as any);
    });

    it('should allow middleware to modify context', async () => {
      interface Context {
        userId?: string;
        enriched?: boolean;
      }

      const enrichmentMiddleware: Middleware<Context> = async (
        context,
        next
      ) => {
        (context as any).enriched = true;
        return next();
      };

      const mockResolver: GraphQLFieldResolver<any, Context, any, string> =
        vi.fn(async (_parent, _args, context) => {
          expect((context as any).enriched).toBe(true);
          return 'result';
        });

      const builder = new ResolverBuilder<any, Context, any>();
      const resolver = builder.use(enrichmentMiddleware).resolve(mockResolver);

      const context: Context = { userId: 'user-123' };
      await resolver({}, {}, context, {} as any);

      expect(mockResolver).toHaveBeenCalled();
    });
  });

  describe('Short-circuit behavior', () => {
    it('should allow middleware to short-circuit (not call next)', async () => {
      const middleware: Middleware<any> = async () => {
        return 'short-circuited';
      };

      const mockResolver: GraphQLFieldResolver<any, any, any, string> = vi.fn(
        async () => 'result'
      );

      const builder = new ResolverBuilder();
      const resolver = builder.use(middleware).resolve(mockResolver);

      const result = await resolver({}, {}, {}, {} as any);

      expect(result).toBe('short-circuited');
      expect(mockResolver).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle middleware errors', async () => {
      const middlewareError = new Error('Middleware error');

      const middleware: Middleware<any> = async () => {
        throw middlewareError;
      };

      const mockResolver: GraphQLFieldResolver<any, any, any, string> = vi.fn();

      const builder = new ResolverBuilder();
      const resolver = builder.use(middleware).resolve(mockResolver);

      await expect(resolver({}, {}, {}, {} as any)).rejects.toThrow(
        'Middleware error'
      );

      expect(mockResolver).not.toHaveBeenCalled();
    });

    it('should handle resolver errors', async () => {
      const resolverError = new Error('Resolver error');

      const middleware: Middleware<any> = async (context, next) => {
        return next();
      };

      const mockResolver: GraphQLFieldResolver<any, any, any, string> = vi.fn(
        async () => {
          throw resolverError;
        }
      );

      const builder = new ResolverBuilder();
      const resolver = builder.use(middleware).resolve(mockResolver);

      await expect(resolver({}, {}, {}, {} as any)).rejects.toThrow(
        'Resolver error'
      );
    });
  });

  describe('Async support', () => {
    it('should support async middlewares', async () => {
      const middleware: Middleware<any> = async (context, next) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return next();
      };

      const mockResolver: GraphQLFieldResolver<any, any, any, string> = vi.fn(
        async () => 'result'
      );

      const builder = new ResolverBuilder();
      const resolver = builder.use(middleware).resolve(mockResolver);

      const result = await resolver({}, {}, {}, {} as any);

      expect(result).toBe('result');
    });

    it('should support async resolver', async () => {
      const mockResolver: GraphQLFieldResolver<any, any, any, string> = vi.fn(
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return 'async-result';
        }
      );

      const builder = new ResolverBuilder();
      const resolver = builder.resolve(mockResolver);

      const result = await resolver({}, {}, {}, {} as any);

      expect(result).toBe('async-result');
    });
  });

  describe('Arguments preservation', () => {
    it('should preserve resolver arguments', async () => {
      const mockSource = { id: 'post-1' };
      const mockArgs = { first: 10 };
      const mockContext = { userId: 'user-123' };
      const mockInfo = { fieldName: 'posts' } as any;

      const middleware: Middleware<typeof mockContext> = async (
        context,
        next
      ) => {
        return next();
      };

      const mockResolver: GraphQLFieldResolver<
        typeof mockSource,
        typeof mockContext,
        typeof mockArgs,
        string
      > = vi.fn(async (source, args, context, info) => {
        expect(source).toBe(mockSource);
        expect(args).toEqual(mockArgs);
        expect(context).toBe(mockContext);
        expect(info).toBe(mockInfo);
        return 'result';
      });

      const builder = new ResolverBuilder<
        typeof mockSource,
        typeof mockContext,
        typeof mockArgs
      >();
      const resolver = builder.use(middleware).resolve(mockResolver);

      await resolver(mockSource, mockArgs, mockContext, mockInfo);

      expect(mockResolver).toHaveBeenCalledWith(
        mockSource,
        mockArgs,
        mockContext,
        mockInfo
      );
    });
  });

  describe('Integration', () => {
    it('should work with auth + logging middlewares', async () => {
      const logs: string[] = [];

      interface Context {
        userId?: string;
      }

      const authMiddleware: Middleware<Context> = async (context, next) => {
        if (!context.userId) {
          throw new Error('Unauthenticated');
        }
        return next();
      };

      const loggingMiddleware: Middleware<Context> = async (context, next) => {
        logs.push(`Request from ${context.userId}`);
        const result = await next();
        logs.push(`Response: ${result}`);
        return result;
      };

      const mockResolver: GraphQLFieldResolver<any, Context, any, string> =
        vi.fn(async (_parent, _args, context) => {
          return `Profile for ${context.userId}`;
        });

      const builder = new ResolverBuilder<any, Context, any>();
      const resolver = builder
        .use(authMiddleware)
        .use(loggingMiddleware)
        .resolve(mockResolver);

      const result = await resolver(
        {},
        {},
        { userId: 'user-789' },
        {} as any
      );

      expect(result).toBe('Profile for user-789');
      expect(logs).toEqual([
        'Request from user-789',
        'Response: Profile for user-789',
      ]);
    });
  });
});
