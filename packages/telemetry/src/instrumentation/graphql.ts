import { GraphQLInstrumentation } from '@opentelemetry/instrumentation-graphql';

/**
 * Create GraphQL instrumentation with security-conscious defaults
 *
 * Configured to preserve granularity by not merging resolver spans
 * and to handle sensitive data appropriately based on environment.
 *
 * @param environment - Deployment environment ('development', 'staging', 'production')
 * @returns Configured GraphQL instrumentation
 *
 * @example
 * ```typescript
 * const graphqlInst = createGraphQLInstrumentation('production');
 * // In production: variables won't be included (security)
 * // In dev: variables will be included for debugging
 * ```
 */
export function createGraphQLInstrumentation(
  environment: string
): GraphQLInstrumentation {
  return new GraphQLInstrumentation({
    // Don't merge resolver spans to preserve granularity
    // This allows seeing individual resolver performance
    mergeItems: false,

    // Include variables in dev only (security concern in production)
    // Production: false (prevents sensitive data in traces)
    // Development: true (useful for debugging)
    allowValues: environment !== 'production',

    // Depth of nested fields to trace
    // Balance between visibility and overhead
    depth: 2,
  });
}
