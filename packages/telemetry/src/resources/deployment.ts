import { Resource } from '@opentelemetry/resources';

/**
 * Create deployment-specific resource attributes
 *
 * Automatically detects the deployment environment and adds relevant attributes:
 * - AWS Lambda: cloud.provider, cloud.platform, faas.name, faas.version
 * - Kubernetes: cloud.platform, k8s.namespace.name, k8s.pod.name
 * - Container: container.name
 *
 * @returns Resource with deployment-specific attributes
 *
 * @example
 * ```typescript
 * const deploymentResource = createDeploymentResource();
 * // In Lambda: { cloud.provider: 'aws', cloud.platform: 'aws_lambda', ... }
 * // In K8s: { cloud.platform: 'kubernetes', k8s.namespace.name: '...', ... }
 * ```
 */
export function createDeploymentResource(): Resource {
  const attributes: Record<string, string> = {};

  // AWS Lambda detection
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    attributes['cloud.provider'] = 'aws';
    attributes['cloud.platform'] = 'aws_lambda';
    attributes['faas.name'] = process.env.AWS_LAMBDA_FUNCTION_NAME;
    attributes['faas.version'] = process.env.AWS_LAMBDA_FUNCTION_VERSION || 'unknown';
    
    // Add AWS region if available
    if (process.env.AWS_REGION) {
      attributes['cloud.region'] = process.env.AWS_REGION;
    }
  }

  // Kubernetes detection
  if (process.env.KUBERNETES_SERVICE_HOST) {
    attributes['cloud.platform'] = 'kubernetes';
    attributes['k8s.namespace.name'] = process.env.K8S_NAMESPACE || 'default';
    
    if (process.env.K8S_POD_NAME) {
      attributes['k8s.pod.name'] = process.env.K8S_POD_NAME;
    }
    
    if (process.env.K8S_NODE_NAME) {
      attributes['k8s.node.name'] = process.env.K8S_NODE_NAME;
    }
  }

  // Container detection
  if (process.env.CONTAINER_NAME) {
    attributes['container.name'] = process.env.CONTAINER_NAME;
  }
  
  if (process.env.CONTAINER_ID) {
    attributes['container.id'] = process.env.CONTAINER_ID;
  }

  return new Resource(attributes);
}
