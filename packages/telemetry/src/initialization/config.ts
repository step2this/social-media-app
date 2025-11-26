import type { TelemetryConfig } from '../types.js';

/**
 * Default configuration values
 */
const DEFAULTS = {
  serviceVersion: '1.0.0',
  environment: 'development',
  otlpEndpoint: 'http://localhost:4318/v1/traces',
  logLevel: 'info' as const,
};

/**
 * Get configuration from environment variables and user config
 * 
 * Configuration hierarchy (highest to lowest priority):
 * 1. Environment variables
 * 2. User config object
 * 3. Default values
 */
export function resolveConfig(userConfig: TelemetryConfig): Required<TelemetryConfig> {
  const environment =
    userConfig.environment || process.env.NODE_ENV || DEFAULTS.environment;

  const config: Required<TelemetryConfig> = {
    serviceName: userConfig.serviceName,
    serviceVersion:
      userConfig.serviceVersion ||
      process.env.OTEL_SERVICE_VERSION ||
      process.env.SERVICE_VERSION ||
      DEFAULTS.serviceVersion,
    environment,
    otlpEndpoint:
      userConfig.otlpEndpoint ||
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
      process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
      DEFAULTS.otlpEndpoint,
    otlpHeaders: userConfig.otlpHeaders || parseOtlpHeaders(),
    logLevel:
      (userConfig.logLevel as 'debug' | 'info' | 'warn' | 'error') ||
      (process.env.OTEL_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') ||
      DEFAULTS.logLevel,
    enableConsoleExporter:
      userConfig.enableConsoleExporter !== undefined
        ? userConfig.enableConsoleExporter
        : environment === 'development',
    disableAutoInstrumentation: userConfig.disableAutoInstrumentation || false,
  };

  return config;
}

/**
 * Parse OTLP headers from environment variable
 * Format: "key1=value1,key2=value2"
 */
function parseOtlpHeaders(): Record<string, string> {
  const headersEnv = process.env.OTEL_EXPORTER_OTLP_HEADERS;
  if (!headersEnv) return {};

  const headers: Record<string, string> = {};
  headersEnv.split(',').forEach((pair) => {
    const [key, value] = pair.split('=');
    if (key && value) {
      headers[key.trim()] = value.trim();
    }
  });

  return headers;
}

/**
 * Validate configuration
 * Throws if configuration is invalid
 */
export function validateConfig(config: TelemetryConfig): void {
  if (!config.serviceName) {
    throw new Error('serviceName is required in TelemetryConfig');
  }

  if (config.serviceName.length === 0) {
    throw new Error('serviceName cannot be empty');
  }

  // Validate service name format (lowercase alphanumeric with hyphens)
  const serviceNameRegex = /^[a-z0-9-]+$/;
  if (!serviceNameRegex.test(config.serviceName)) {
    throw new Error(
      'serviceName must contain only lowercase letters, numbers, and hyphens'
    );
  }
}
