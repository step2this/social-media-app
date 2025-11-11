/**
 * Awilix Container Setup for Backend Lambda Handlers
 *
 * Replaces custom Container with Awilix for:
 * - Automatic dependency injection
 * - Proper lifecycle management
 * - Type-safe service resolution
 *
 * @module infrastructure/di
 */

import { createContainer, asFunction, asValue, InjectionMode, type AwilixContainer } from 'awilix'
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import type { AuthServiceDependencies } from '@social-media-app/dal'
import { createDefaultAuthService, ProfileService } from '@social-media-app/dal'
import { createDynamoDBClient, getTableName } from '@social-media-app/aws-utils'
import { createJWTProvider, getJWTConfigFromEnv } from '../../utils/jwt.js'
import { createCacheServiceFromEnv, type CacheService } from '../cache/CacheService.js'
import { createCircuitBreakerServiceFromEnv, type CircuitBreakerService } from '../circuit-breaker/CircuitBreakerService.js'

/**
 * Service container type - all resolvable services
 */
export interface ServiceContainer {
  // AWS Clients
  dynamoClient: DynamoDBDocumentClient
  tableName: string

  // Cache
  cacheService: CacheService

  // Circuit Breakers
  circuitBreakerDatabase: CircuitBreakerService
  circuitBreakerCache: CircuitBreakerService
  circuitBreakerExternal: CircuitBreakerService

  // Auth
  jwtProvider: AuthServiceDependencies['jwtProvider']
  authService: ReturnType<typeof createDefaultAuthService>

  // Profile
  profileService: ProfileService

  // Add more services as needed
}

/**
 * Create and configure Awilix container with all services
 *
 * Lifecycle Management:
 * - SINGLETON: Created once, reused across requests (AWS clients)
 * - SCOPED: Created per-request, cleaned up after (services)
 *
 * @returns Configured Awilix container
 */
export function createAwilixContainer(): AwilixContainer<ServiceContainer> {
  const container = createContainer<ServiceContainer>({
    injectionMode: InjectionMode.PROXY // Enable auto-injection
  })

  // ============================================
  // Layer 1: AWS Infrastructure (SINGLETON)
  // ============================================

  container.register({
    // DynamoDB Client - singleton for Lambda cold start optimization
    // Uses aws-utils helper which properly handles LocalStack configuration
    dynamoClient: asFunction(() => {
      return createDynamoDBClient()
    }).singleton(),

    // Table name from environment - uses aws-utils helper for LocalStack support
    tableName: asValue(getTableName())
  })

  // ============================================
  // Layer 2: Cache, Circuit Breakers & Authentication (SINGLETON)
  // ============================================

  container.register({
    // Cache Service - singleton (shared across all requests)
    cacheService: asFunction(() => {
      return createCacheServiceFromEnv()
    }).singleton(),

    // Circuit Breakers - singletons (track metrics across requests)
    circuitBreakerDatabase: asFunction(() => {
      return createCircuitBreakerServiceFromEnv('database')
    }).singleton(),

    circuitBreakerCache: asFunction(() => {
      return createCircuitBreakerServiceFromEnv('cache')
    }).singleton(),

    circuitBreakerExternal: asFunction(() => {
      return createCircuitBreakerServiceFromEnv('external-api')
    }).singleton(),

    // JWT Provider - singleton (stateless)
    jwtProvider: asFunction(() => {
      const jwtConfig = getJWTConfigFromEnv()
      return createJWTProvider(jwtConfig)
    }).singleton()
  })

  // ============================================
  // Layer 3: Domain Services (SCOPED)
  // ============================================

  container.register({
    // Auth Service - scoped per request
    authService: asFunction(({ dynamoClient, tableName, jwtProvider }) => {
      return createDefaultAuthService(dynamoClient, tableName, jwtProvider)
    }).scoped(),

    // Profile Service - scoped per request (with cache support)
    // Circuit breaker integration is available for use in handlers
    profileService: asFunction(({ dynamoClient, tableName, cacheService }) => {
      return new ProfileService(dynamoClient, tableName, cacheService)
    }).scoped()

    // TODO: Add more services as we migrate
  })

  return container
}

/**
 * Singleton container instance for Lambda cold starts
 * Reused across invocations within same Lambda container
 */
let containerInstance: AwilixContainer<ServiceContainer> | null = null

/**
 * Get or create singleton container
 *
 * Lambda optimization: Container persists across warm invocations
 * Singletons are truly singleton, scoped services are fresh per-request
 */
export function getContainer(): AwilixContainer<ServiceContainer> {
  if (!containerInstance) {
    containerInstance = createAwilixContainer()
  }
  return containerInstance
}

/**
 * Create request-scoped container
 *
 * Called per Lambda invocation to create fresh scoped services
 * while reusing singleton infrastructure (AWS clients)
 *
 * @returns Scoped container for single request
 */
export function createRequestScope(): AwilixContainer<ServiceContainer> {
  return getContainer().createScope()
}

/**
 * Reset container (testing only)
 *
 * Allows tests to create fresh container with mocked dependencies
 */
export function resetContainer(): void {
  containerInstance = null
}
