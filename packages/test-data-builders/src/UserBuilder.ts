/**
 * UserBuilder - Builder for creating test user profiles
 *
 * Creates UserProfileEntity with dummy authentication data for test purposes.
 * Uses the existing createUserEntity helper pattern to ensure proper entity structure.
 *
 * @example
 * ```typescript
 * // Create a single user
 * const user = await new UserBuilder()
 *   .withEmail('test@example.com')
 *   .withHandle('testuser')
 *   .verified(true)
 *   .build();
 *
 * // Create an influencer
 * const influencer = await new UserBuilder()
 *   .asInfluencer()
 *   .build();
 *
 * // Create multiple users
 * const users = await new UserBuilder().buildMany(50);
 * ```
 */

import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'crypto';
import { BaseBuilder } from './base/BaseBuilder.js';
import { createBuilderContainer } from './base/BuilderContainer.js';
import type { ValidationResult, SeededUser, DeepPartial } from './types/index.js';
import { UserConfigSchema, type UserConfig } from './types/schemas.js';
import type { UserProfileEntity } from '../../packages/dal/src/entities/user-profile.entity.js';

// ============================================================================
// UserBuilder Class
// ============================================================================

/**
 * Builder for creating test user profiles
 *
 * Creates complete UserProfileEntity with dummy authentication data.
 * The entity includes both user identity fields and profile presentation fields.
 *
 * **USES ZOD SCHEMA VALIDATION**
 */
export class UserBuilder extends BaseBuilder<
  UserProfileEntity,
  UserConfig,
  SeededUser
> {
  /**
   * Set Zod schema for validation
   */
  protected schema = UserConfigSchema;
  // ==========================================================================
  // Fluent Configuration Methods
  // ==========================================================================

  /**
   * Set the user's email address
   */
  withEmail(email: string): this {
    this.config.email = email;
    return this;
  }

  /**
   * Set the username (also used as default handle)
   */
  withUsername(username: string): this {
    this.config.username = username;
    return this;
  }

  /**
   * Set the user's handle (lowercase, unique identifier)
   */
  withHandle(handle: string): this {
    this.config.handle = handle.toLowerCase();
    return this;
  }

  /**
   * Set the user's full name
   */
  withFullName(fullName: string): this {
    this.config.fullName = fullName;
    return this;
  }

  /**
   * Set the user's bio
   */
  withBio(bio: string): this {
    this.config.bio = bio;
    return this;
  }

  /**
   * Set the profile picture URL
   */
  withProfilePicture(url: string): this {
    this.config.profilePictureUrl = url;
    return this;
  }

  /**
   * Set email verified status
   */
  verified(value: boolean = true): this {
    this.config.emailVerified = value;
    return this;
  }

  // ==========================================================================
  // Preset Methods
  // ==========================================================================

  /**
   * Configure as an influencer with high follower count
   */
  asInfluencer(): this {
    this.config.isInfluencer = true;
    this.config.followersCount = faker.number.int({ min: 1000, max: 50000 });
    this.config.followingCount = faker.number.int({ min: 100, max: 500 });
    this.config.emailVerified = true;
    return this;
  }

  /**
   * Configure as a new user with minimal data
   */
  asNewUser(): this {
    this.config.followersCount = 0;
    this.config.followingCount = 0;
    this.config.emailVerified = false;
    this.config.bio = undefined;
    this.config.profilePictureUrl = undefined;
    return this;
  }

  // ==========================================================================
  // Validation
  // ==========================================================================

  /**
   * Validate user configuration
   *
   * Only checks that required fields will be present after defaults are applied.
   * Email, username, and handle can be auto-generated, so no strict validation needed.
   */
  protected async validate(): Promise<ValidationResult> {
    // All fields can be auto-generated, so validation always passes
    // unless explicitly invalid values are provided

    const errors = [];

    // Validate email format if provided
    if (this.config.email && !this.isValidEmail(this.config.email)) {
      errors.push(this.validationError(
        'email',
        'Invalid email format',
        this.config.email
      ));
    }

    // Validate username format if provided (alphanumeric and underscores only)
    if (this.config.username && !this.isValidUsername(this.config.username)) {
      errors.push(this.validationError(
        'username',
        'Username must be alphanumeric with underscores only',
        this.config.username
      ));
    }

    // Validate handle format if provided
    if (this.config.handle && !this.isValidHandle(this.config.handle)) {
      errors.push(this.validationError(
        'handle',
        'Handle must be alphanumeric with underscores, lowercase only',
        this.config.handle
      ));
    }

    return errors.length > 0
      ? this.validationFailure(errors)
      : this.validationSuccess();
  }

  // ==========================================================================
  // Build Implementation
  // ==========================================================================

  /**
   * Build the user entity
   *
   * Creates a UserProfileEntity with dummy authentication data for testing.
   * Writes directly to DynamoDB since user creation doesn't have complex
   * business logic that needs to be preserved.
   */
  protected async buildInternal(): Promise<SeededUser> {
    const container = await createBuilderContainer();
    const dynamoClient = container.resolve('dynamoClient');
    const tableName = container.resolve('tableName');

    // Generate defaults for missing fields
    const userId = randomUUID();
    const now = new Date().toISOString();

    // Generate realistic user data
    const email = this.config.email || this.generateEmail();
    const username = this.config.username || this.generateUsername();
    const handle = this.config.handle || username.toLowerCase();
    const fullName = this.config.fullName || this.generateFullName();
    const bio = this.config.bio !== undefined
      ? this.config.bio
      : faker.lorem.paragraph(1);
    const profilePictureUrl = this.config.profilePictureUrl || this.generateProfilePictureUrl();

    // Determine follower/following counts
    const followersCount = this.config.followersCount ?? (
      this.config.isInfluencer
        ? faker.number.int({ min: 1000, max: 50000 })
        : faker.number.int({ min: 0, max: 100 })
    );
    const followingCount = this.config.followingCount ?? (
      this.config.isInfluencer
        ? faker.number.int({ min: 100, max: 500 })
        : faker.number.int({ min: 0, max: 150 })
    );

    // Create UserProfileEntity with dummy authentication data
    // Note: passwordHash and salt are dummy values for test data
    const entity: UserProfileEntity = {
      // DynamoDB keys
      PK: `USER#${userId}`,
      SK: 'PROFILE',
      GSI1PK: `EMAIL#${email}`,
      GSI1SK: `USER#${userId}`,
      GSI2PK: `USERNAME#${username}`,
      GSI2SK: `USER#${userId}`,
      GSI3PK: `HANDLE#${handle.toLowerCase()}`,
      GSI3SK: `USER#${userId}`,

      // Identity fields
      id: userId,
      email,
      username,
      emailVerified: this.config.emailVerified ?? true,
      createdAt: now,
      updatedAt: now,

      // Dummy authentication fields (for test data only)
      passwordHash: 'test_hash_' + userId,
      salt: 'test_salt_' + userId,

      // Profile fields
      handle,
      fullName,
      bio,
      profilePictureUrl,
      profilePictureThumbnailUrl: profilePictureUrl, // Use same for simplicity

      // Social counts
      postsCount: 0,
      followersCount,
      followingCount,

      // Entity type
      entityType: 'USER_PROFILE'
    };

    // Write to DynamoDB
    await dynamoClient.send(new PutCommand({
      TableName: tableName,
      Item: entity,
      ConditionExpression: 'attribute_not_exists(PK)'
    }));

    this.log('info', `Created user: ${username} (${email})`);

    // Return SeededUser (subset of entity for builder consumers)
    return {
      id: userId,
      email,
      username,
      handle,
      fullName,
      bio,
      profilePictureUrl,
      emailVerified: entity.emailVerified,
      createdAt: now
    };
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate username format (alphanumeric and underscores)
   */
  private isValidUsername(username: string): boolean {
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    return usernameRegex.test(username) && username.length >= 3 && username.length <= 30;
  }

  /**
   * Validate handle format (alphanumeric, underscores, lowercase)
   */
  private isValidHandle(handle: string): boolean {
    const handleRegex = /^[a-z0-9_]+$/;
    return handleRegex.test(handle) && handle.length >= 3 && handle.length <= 30;
  }

  /**
   * Generate a random email address
   */
  private generateEmail(): string {
    return faker.internet.email().toLowerCase();
  }

  /**
   * Generate a random username
   */
  private generateUsername(): string {
    return faker.internet.username().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }

  /**
   * Generate a random full name
   */
  private generateFullName(): string {
    return faker.person.fullName();
  }

  /**
   * Generate a profile picture URL
   */
  private generateProfilePictureUrl(): string {
    // Use placeholder service for realistic profile pictures
    const size = 400;
    return `https://picsum.photos/${size}/${size}`;
  }
}
