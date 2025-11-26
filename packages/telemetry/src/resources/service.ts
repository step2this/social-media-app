import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';

/**
 * Create service resource attributes following OpenTelemetry semantic conventions
 *
 * @param serviceName - Name of the service (e.g., 'social-media-graphql')
 * @param serviceVersion - Version of the service (e.g., '1.0.0')
 * @param environment - Deployment environment (e.g., 'production', 'development')
 * @returns Resource with service attributes
 *
 * @example
 * ```typescript
 * const resource = createServiceResource(
 *   'social-media-graphql',
 *   '1.0.0',
 *   'production'
 * );
 * ```
 */
export function createServiceResource(
  serviceName: string,
  serviceVersion: string,
  environment: string
): Resource {
  return new Resource({
    [SEMRESATTRS_SERVICE_NAME]: serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: environment,
  });
}
