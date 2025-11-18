/**
 * Base module barrel export
 * 
 * Exports all foundational components for the builder system
 */

// Export BaseBuilder and error classes
export {
  BaseBuilder,
  ValidationFailureError,
  BuildFailureError,
} from './BaseBuilder';

// Export BuilderContainer (Awilix DI container)
export {
  createBuilderContainer,
  type BuilderContainer,
  type BuilderContainerConfig,
  type BuilderContainerCradle,
} from './BuilderContainer';
