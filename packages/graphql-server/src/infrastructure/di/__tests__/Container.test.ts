/**
 * Container Tests
 *
 * TDD for Dependency Injection Container.
 * Tests service registration, resolution, and error handling.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Container } from '../Container.js';

describe('Container', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  describe('register() and resolve()', () => {
    it('should register and resolve a service', () => {
      const mockService = { name: 'TestService' };
      container.register('TestService', () => mockService);

      const resolved = container.resolve('TestService');

      expect(resolved).toBe(mockService);
    });

    it('should throw error when resolving unregistered service', () => {
      expect(() => container.resolve('NonExistent')).toThrow('Service not found: NonExistent');
    });

    it('should preserve type information', () => {
      interface IProfileRepository {
        findById: (id: string) => Promise<unknown>;
      }

      const mockRepo: IProfileRepository = {
        findById: async (id) => ({ id }),
      };

      container.register<IProfileRepository>('ProfileRepository', () => mockRepo);

      const resolved = container.resolve<IProfileRepository>('ProfileRepository');

      expect(resolved).toBe(mockRepo);
      expect(typeof resolved.findById).toBe('function');
    });

    it('should allow registering multiple services', () => {
      const service1 = { name: 'Service1' };
      const service2 = { name: 'Service2' };
      const service3 = { name: 'Service3' };

      container.register('Service1', () => service1);
      container.register('Service2', () => service2);
      container.register('Service3', () => service3);

      expect(container.resolve('Service1')).toBe(service1);
      expect(container.resolve('Service2')).toBe(service2);
      expect(container.resolve('Service3')).toBe(service3);
    });

    it('should resolve different services independently', () => {
      const profileRepo = { type: 'profile' };
      const postRepo = { type: 'post' };

      container.register('ProfileRepository', () => profileRepo);
      container.register('PostRepository', () => postRepo);

      const resolved1 = container.resolve('ProfileRepository');
      const resolved2 = container.resolve('PostRepository');

      expect(resolved1).not.toBe(resolved2);
      expect(resolved1).toBe(profileRepo);
      expect(resolved2).toBe(postRepo);
    });
  });

  describe('has()', () => {
    it('should return true for registered service', () => {
      container.register('TestService', () => ({ name: 'test' }));

      expect(container.has('TestService')).toBe(true);
    });

    it('should return false for unregistered service', () => {
      expect(container.has('NonExistent')).toBe(false);
    });
  });

  describe('clear()', () => {
    it('should clear all services', () => {
      container.register('Service1', () => ({ name: 'service1' }));
      container.register('Service2', () => ({ name: 'service2' }));

      expect(container.has('Service1')).toBe(true);
      expect(container.has('Service2')).toBe(true);

      container.clear();

      expect(container.has('Service1')).toBe(false);
      expect(container.has('Service2')).toBe(false);
    });
  });

  describe('Factory functions', () => {
    it('should handle factory functions that return complex objects', () => {
      const complexFactory = () => ({
        id: 'user-123',
        methods: {
          save: () => 'saved',
          delete: () => 'deleted',
        },
        nested: {
          deep: {
            value: 42,
          },
        },
      });

      container.register('ComplexService', complexFactory);

      const resolved = container.resolve<ReturnType<typeof complexFactory>>('ComplexService');

      expect(resolved.id).toBe('user-123');
      expect(resolved.methods.save()).toBe('saved');
      expect(resolved.nested.deep.value).toBe(42);
    });

    it('should handle factory functions that throw errors', () => {
      container.register('FailingService', () => {
        throw new Error('Factory initialization failed');
      });

      expect(() => container.resolve('FailingService')).toThrow('Factory initialization failed');
    });

    it('should support registering primitives', () => {
      container.register<string>('AppName', () => 'SocialMediaApp');
      container.register<number>('Port', () => 3000);
      container.register<boolean>('IsProduction', () => false);

      expect(container.resolve<string>('AppName')).toBe('SocialMediaApp');
      expect(container.resolve<number>('Port')).toBe(3000);
      expect(container.resolve<boolean>('IsProduction')).toBe(false);
    });
  });

  describe('Integration', () => {
    it('should register and resolve use case with dependencies', () => {
      interface IRepository {
        findAll: () => string[];
      }

      class UseCase {
        constructor(private readonly repository: IRepository) {}

        execute() {
          return this.repository.findAll();
        }
      }

      const mockRepository: IRepository = {
        findAll: () => ['item1', 'item2'],
      };

      container.register<IRepository>('Repository', () => mockRepository);

      container.register<UseCase>('UseCase', () => new UseCase(container.resolve('Repository')));

      const useCase = container.resolve<UseCase>('UseCase');
      const result = useCase.execute();

      expect(result).toEqual(['item1', 'item2']);
    });
  });
});
