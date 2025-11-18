/**
 * Base Builder Abstraction
 * 
 * Abstract base class for all entity builders in the test data generation system.
 * Provides common functionality including validation, retry logic, logging, and
 * metadata tracking. All entity-specific builders extend this class.
 * 
 * @template TEntity - The DynamoDB entity type being built
 * @template TConfig - The configuration interface for this builder
 * @template TOutput - The output type returned after building (SeededUser, SeededPost, etc.)
 */

import {
  BuilderConfig,
  BuildContext,
  BuilderState,
  BuildResult,
  BuildMetadata,
  BuilderHook,
  DeepPartial,
  ValidationResult,
  ValidationError,
  DEFAULT_BUILDER_CONFIG,
} from '../types';

// ============================================================================
// Base Builder Class
// ============================================================================

/**
 * Abstract base class for all entity builders
 * 
 * Implements the builder pattern with fluent interface, validation pipeline,
 * retry logic, and comprehensive error handling.
 * 
 * @example
 * ```typescript
 * class UserBuilder extends BaseBuilder<UserEntity, UserConfig, SeededUser> {
 *   protected async validate(): Promise<ValidationResult> {
 *     // Validation logic
 *   }
 *   
 *   protected async buildInternal(): Promise<SeededUser> {
 *     // Build logic using services
 *   }
 * }
 * 
 * const user = await new UserBuilder()
 *   .with({ email: 'test@example.com' })
 *   .build();
 * ```
 */
export abstract class BaseBuilder<TEntity, TConfig, TOutput> {
  /**
   * Partial configuration for this builder instance
   */
  protected config: DeepPartial<TConfig> = {};
  
  /**
   * Global builder system configuration
   */
  protected globalConfig: BuilderConfig;
  
  /**
   * Current builder state
   */
  protected state: BuilderState = 'idle';
  
  /**
   * Start time of build operation (for timing)
   */
  protected startTime: number = 0;
  
  /**
   * Number of retry attempts made
   */
  protected retries: number = 0;
  
  /**
   * Hooks called before build
   */
  protected beforeBuildHooks: BuilderHook<DeepPartial<TConfig>>[] = [];
  
  /**
   * Hooks called after build
   */
  protected afterBuildHooks: BuilderHook<TOutput>[] = [];
  
  /**
   * Whether dry run mode is enabled
   */
  protected dryRun: boolean = false;
  
  /**
   * Constructor
   * @param config - Optional global configuration override
   */
  constructor(config?: Partial<BuilderConfig>) {
    this.globalConfig = {
      ...DEFAULT_BUILDER_CONFIG,
      ...config,
    };
    this.dryRun = this.globalConfig.dryRun;
  }
  
  // ==========================================================================
  // Fluent Interface Methods
  // ==========================================================================
  
  /**
   * Configure this builder with partial configuration
   * 
   * @param config - Partial configuration object
   * @returns this builder instance for chaining
   * 
   * @example
   * ```typescript
   * builder.with({ name: 'John', email: 'john@example.com' })
   * ```
   */
  public with(config: DeepPartial<TConfig>): this {
    this.config = {
      ...this.config,
      ...config,
    };
    return this;
  }
  
  /**
   * Enable dry run mode (validation only, no actual DB writes)
   * 
   * @returns this builder instance for chaining
   */
  public enableDryRun(): this {
    this.dryRun = true;
    return this;
  }
  
  /**
   * Disable dry run mode
   * 
   * @returns this builder instance for chaining
   */
  public disableDryRun(): this {
    this.dryRun = false;
    return this;
  }
  
  /**
   * Register a hook to run before build
   * 
   * @param hook - Function to call before build
   * @returns this builder instance for chaining
   */
  public beforeBuild(hook: BuilderHook<DeepPartial<TConfig>>): this {
    this.beforeBuildHooks.push(hook);
    return this;
  }
  
  /**
   * Register a hook to run after build
   * 
   * @param hook - Function to call after build
   * @returns this builder instance for chaining
   */
  public afterBuild(hook: BuilderHook<TOutput>): this {
    this.afterBuildHooks.push(hook);
    return this;
  }
  
  // ==========================================================================
  // Abstract Methods (Must be implemented by subclasses)
  // ==========================================================================
  
  /**
   * Validate the current configuration
   * 
   * Subclasses must implement this to validate their specific configuration.
   * Should return a ValidationResult with errors if validation fails.
   * 
   * @returns ValidationResult indicating whether config is valid
   */
  protected abstract validate(): Promise<ValidationResult> | ValidationResult;
  
  /**
   * Internal build implementation
   * 
   * Subclasses must implement this to perform the actual entity creation.
   * Should use service layer methods, not direct DB writes.
   * 
   * @returns The built entity output
   * @throws Error if build fails
   */
  protected abstract buildInternal(): Promise<TOutput>;
  
  /**
   * Get the name of this builder (for logging and metadata)
   * 
   * @returns Builder class name
   */
  protected getBuilderName(): string {
    return this.constructor.name;
  }
  
  // ==========================================================================
  // Build Pipeline Methods
  // ==========================================================================
  
  /**
   * Build the entity with full validation, retry logic, and error handling
   * 
   * This is the main entry point for building an entity. It orchestrates:
   * 1. Pre-build hooks
   * 2. Validation
   * 3. Actual build (with retry logic)
   * 4. Post-build hooks
   * 5. Metadata tracking
   * 
   * @returns BuildResult containing either success or failure
   */
  public async build(): Promise<TOutput> {
    this.startTime = Date.now();
    this.state = 'idle';
    
    try {
      // Run pre-build hooks
      await this.runBeforeBuildHooks();
      
      // Validate configuration
      this.state = 'validating';
      const validationResult = await this.validate();
      
      if (!validationResult.valid) {
        throw new ValidationFailureError(
          'Validation failed',
          validationResult.errors
        );
      }
      
      // Dry run: stop after validation
      if (this.dryRun) {
        this.log('info', 'Dry run mode: validation passed, skipping build');
        this.state = 'completed';
        // Return a mock result for dry run
        return this.createDryRunResult();
      }
      
      // Build with retry logic
      this.state = 'building';
      const result = await this.buildWithRetry();
      
      // Run post-build hooks
      await this.runAfterBuildHooks(result);
      
      this.state = 'completed';
      this.log('info', `Build completed successfully for ${this.getBuilderName()}`);
      
      return result;
    } catch (error) {
      this.state = 'failed';
      this.log('error', `Build failed for ${this.getBuilderName()}: ${error}`);
      throw error;
    }
  }
  
  /**
   * Build with automatic retry logic
   * 
   * Attempts the build operation, retrying on failure up to maxRetries times.
   * Uses exponential backoff between retries.
   * 
   * @returns The built entity output
   * @throws Error if all retries exhausted
   */
  protected async buildWithRetry(): Promise<TOutput> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.globalConfig.maxRetries; attempt++) {
      try {
        this.retries = attempt;
        
        if (attempt > 0) {
          // Exponential backoff: 100ms, 200ms, 400ms, ...
          const delay = 100 * Math.pow(2, attempt - 1);
          this.log('info', `Retry attempt ${attempt} after ${delay}ms delay`);
          await this.sleep(delay);
        }
        
        return await this.buildInternal();
      } catch (error) {
        lastError = error as Error;
        this.log(
          'error',
          `Build attempt ${attempt + 1} failed: ${error}`
        );
        
        // If we've exhausted retries, throw
        if (attempt === this.globalConfig.maxRetries) {
          throw new BuildFailureError(
            `Build failed after ${this.globalConfig.maxRetries + 1} attempts`,
            lastError
          );
        }
      }
    }
    
    // Should never reach here, but TypeScript needs this
    throw lastError!;
  }
  
  /**
   * Build multiple entities in batch
   * 
   * Creates multiple instances of this entity type with the same configuration.
   * Executes builds in parallel with concurrency control.
   * 
   * @param count - Number of entities to build
   * @returns Array of built entities
   */
  public async buildMany(count: number): Promise<TOutput[]> {
    this.log('info', `Building ${count} instances of ${this.getBuilderName()}`);
    
    const results: TOutput[] = [];
    const batchSize = this.globalConfig.batchSize;
    
    // Process in batches to control concurrency
    for (let i = 0; i < count; i += batchSize) {
      const batchCount = Math.min(batchSize, count - i);
      const batch = Array.from({ length: batchCount }, () =>
        // Create a new instance for each build to avoid shared state
        this.clone().build()
      );
      
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
      
      this.log(
        'info',
        `Completed batch ${Math.floor(i / batchSize) + 1}, ` +
        `total: ${results.length}/${count}`
      );
    }
    
    return results;
  }
  
  // ==========================================================================
  // Hook Execution
  // ==========================================================================
  
  /**
   * Run all registered before-build hooks
   */
  protected async runBeforeBuildHooks(): Promise<void> {
    const context = this.createBuildContext();
    
    for (const hook of this.beforeBuildHooks) {
      await hook(this.config, context);
    }
  }
  
  /**
   * Run all registered after-build hooks
   * 
   * @param output - The built entity output
   */
  protected async runAfterBuildHooks(output: TOutput): Promise<void> {
    const context = this.createBuildContext();
    
    for (const hook of this.afterBuildHooks) {
      await hook(output, context);
    }
  }
  
  // ==========================================================================
  // Utility Methods
  // ==========================================================================
  
  /**
   * Create a new instance of this builder with the same configuration
   * 
   * Used by buildMany to create independent builder instances.
   * Subclasses may override to provide custom cloning logic.
   * 
   * @returns New builder instance
   */
  protected clone(): this {
    const ConstructorFn = this.constructor as new (config?: Partial<BuilderConfig>) => this;
    const cloned = new ConstructorFn(this.globalConfig);
    cloned.config = { ...this.config };
    return cloned;
  }
  
  /**
   * Create build context for hook execution
   * 
   * @returns BuildContext snapshot
   */
  protected createBuildContext(): BuildContext {
    return {
      config: this.globalConfig,
      state: this.state,
      startTime: this.startTime,
      retries: this.retries,
    };
  }
  
  /**
   * Create build metadata for tracking
   * 
   * @returns BuildMetadata object
   */
  protected createBuildMetadata(): BuildMetadata {
    const now = Date.now();
    
    return {
      startedAt: new Date(this.startTime).toISOString(),
      completedAt: new Date(now).toISOString(),
      durationMs: now - this.startTime,
      builderName: this.getBuilderName(),
      retriesAttempted: this.retries,
      usedRealServices: this.globalConfig.useRealServices,
    };
  }
  
  /**
   * Create a mock result for dry run mode
   * 
   * Subclasses may override to provide more realistic dry run results.
   * 
   * @returns Mock output
   */
  protected createDryRunResult(): TOutput {
    return {
      __isDryRun: true,
    } as unknown as TOutput;
  }
  
  /**
   * Logging helper
   * 
   * @param level - Log level
   * @param message - Log message
   */
  protected log(
    level: 'debug' | 'info' | 'error',
    message: string
  ): void {
    // Only log if level is enabled
    const levels = ['debug', 'info', 'error'];
    const currentLevelIndex = levels.indexOf(this.globalConfig.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    if (messageLevelIndex >= currentLevelIndex) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.getBuilderName()}]`;
      console.log(`${prefix} ${message}`);
    }
  }
  
  /**
   * Sleep utility for retry backoff
   * 
   * @param ms - Milliseconds to sleep
   */
  protected async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // ==========================================================================
  // Validation Helpers
  // ==========================================================================
  
  /**
   * Helper to create a successful validation result
   * 
   * @returns ValidationResult with valid=true
   */
  protected validationSuccess(): ValidationResult {
    return {
      valid: true,
      errors: [],
    };
  }
  
  /**
   * Helper to create a failed validation result
   * 
   * @param errors - Array of validation errors
   * @returns ValidationResult with valid=false
   */
  protected validationFailure(errors: ValidationError[]): ValidationResult {
    return {
      valid: false,
      errors,
    };
  }
  
  /**
   * Helper to add a validation error
   * 
   * @param field - Field name
   * @param message - Error message
   * @param value - Optional field value
   * @returns ValidationError object
   */
  protected validationError(
    field: string,
    message: string,
    value?: unknown
  ): ValidationError {
    return { field, message, value };
  }
  
  /**
   * Helper to validate required fields
   * 
   * @param fields - Map of field name to value
   * @returns Array of validation errors for missing fields
   */
  protected validateRequired(
    fields: Record<string, unknown>
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    
    for (const [field, value] of Object.entries(fields)) {
      if (value === undefined || value === null || value === '') {
        errors.push(this.validationError(field, `${field} is required`));
      }
    }
    
    return errors;
  }
}

// ============================================================================
// Custom Error Classes
// ============================================================================

/**
 * Error thrown when validation fails
 */
export class ValidationFailureError extends Error {
  constructor(
    message: string,
    public readonly validationErrors: ValidationError[]
  ) {
    super(message);
    this.name = 'ValidationFailureError';
  }
}

/**
 * Error thrown when build operation fails
 */
export class BuildFailureError extends Error {
  constructor(
    message: string,
    public readonly cause: Error
  ) {
    super(message);
    this.name = 'BuildFailureError';
  }
}
