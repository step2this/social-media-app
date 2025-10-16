/**
 * Type definitions for graphql-validation-complexity
 */

declare module 'graphql-validation-complexity' {
  import { ValidationRule } from 'graphql';

  export interface ComplexityLimitRuleOptions {
    /**
     * The maximum allowed complexity score
     */
    maximumCost?: number;

    /**
     * The cost of a scalar field
     */
    scalarCost?: number;

    /**
     * The cost of an object field
     */
    objectCost?: number;

    /**
     * The cost of a list field (multiplier)
     */
    listFactor?: number;

    /**
     * The cost of introspection queries
     */
    introspectionCost?: number;

    /**
     * Variables to pass to the complexity calculation
     */
    variables?: Record<string, any>;

    /**
     * Callback to track the cost of each query
     */
    onCost?: (cost: number) => void;

    /**
     * Custom error message formatter
     */
    formatErrorMessage?: (cost: number) => string;
  }

  /**
   * Create a GraphQL validation rule that limits query complexity
   */
  export function createComplexityLimitRule(
    maximumCost: number,
    options?: ComplexityLimitRuleOptions
  ): ValidationRule;
}