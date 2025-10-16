/**
 * @fileoverview Test Utilities Barrel Export
 *
 * This module exports all shared test utilities for use across the monorepo.
 * These utilities eliminate code duplication in test files and provide
 * consistent, well-tested mock implementations.
 *
 * @module @social-media-app/shared/test-utils
 */

export {
  createMockDynamoClient,
  setupS3Mocks,
  createMockAPIGatewayEvent,
  createMockJWT,
  isConditionalCheckFailedException,
  convertToAttributeValue,
  createMockDynamoDBStreamRecord,
  createMockDynamoDBStreamEvent,
  type MockDynamoClientOptions,
  type MockDynamoCommand,
  type MockDynamoClient,
  type S3MockConfig,
  type APIGatewayEventConfig,
  type DynamoDBStreamRecordConfig,
  type DynamoDBStreamEventConfig
} from './aws-mocks.js';
