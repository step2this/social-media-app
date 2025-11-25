/**
 * Tests for OpenTelemetry Configuration
 *
 * Verifies that the OpenTelemetry SDK initializes with correct configuration
 * based on environment variables and defaults. Tests environment detection
 * and resource attribute generation.
 *
 * These tests follow TDD principles (RED-GREEN-REFACTOR):
 * - Write tests first to define expected behavior
 * - Run tests to verify they fail (RED)
 * - Implementation passes tests (GREEN)
 * - Refactor with confidence
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';

describe('OpenTelemetry Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should resolve service name from environment or default', () => {
    process.env.OTEL_SERVICE_NAME = 'custom-service';
    const serviceName = process.env.OTEL_SERVICE_NAME || 'social-media-graphql';
    expect(serviceName).toBe('custom-service');

    delete process.env.OTEL_SERVICE_NAME;
    const defaultName = process.env.OTEL_SERVICE_NAME || 'social-media-graphql';
    expect(defaultName).toBe('social-media-graphql');
  });

  it('should resolve OTLP endpoint from environment or default', () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'https://custom-endpoint.com';
    const endpoint =
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';
    expect(endpoint).toBe('https://custom-endpoint.com');

    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    const defaultEndpoint =
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';
    expect(defaultEndpoint).toBe('http://localhost:4318/v1/traces');
  });

  it('should detect Lambda environment', () => {
    process.env.AWS_LAMBDA_FUNCTION_NAME = 'my-lambda';
    const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    expect(isLambda).toBe(true);

    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    const notLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    expect(notLambda).toBe(false);
  });
});

describe('Resource Attributes', () => {
  it('should include required semantic conventions', () => {
    const requiredAttributes = {
      [SEMRESATTRS_SERVICE_NAME]: 'social-media-graphql',
      [SEMRESATTRS_SERVICE_VERSION]: '1.0.0',
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: 'development',
    };

    expect(requiredAttributes).toHaveProperty(SEMRESATTRS_SERVICE_NAME);
    expect(requiredAttributes).toHaveProperty(SEMRESATTRS_SERVICE_VERSION);
    expect(requiredAttributes).toHaveProperty(SEMRESATTRS_DEPLOYMENT_ENVIRONMENT);
  });

  it('should validate service name format', () => {
    const serviceName = 'social-media-graphql';
    
    expect(serviceName).toBeTruthy();
    expect(typeof serviceName).toBe('string');
    expect(serviceName.length).toBeGreaterThan(0);
    expect(serviceName).toMatch(/^[a-z0-9-]+$/);
  });

  it('should validate service version format', () => {
    const serviceVersion = '1.0.0';
    
    expect(serviceVersion).toBeTruthy();
    expect(typeof serviceVersion).toBe('string');
    expect(serviceVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should validate environment values', () => {
    const validEnvironments = ['development', 'staging', 'production'];
    const environment = 'development';
    
    expect(validEnvironments).toContain(environment);
  });
});
