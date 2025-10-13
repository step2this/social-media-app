/**
 * LocalStack Configuration Utilities
 *
 * Provides helper functions to detect LocalStack environment and configure
 * AWS SDK clients to work with LocalStack for local development.
 */
/**
 * Determines if the current environment is LocalStack
 *
 * @param environment - The environment name (e.g., 'local', 'dev', 'prod')
 * @returns true if running in LocalStack environment
 */
export declare function isLocalStackEnvironment(environment: string): boolean;
/**
 * Gets the LocalStack endpoint URL
 *
 * @returns The LocalStack endpoint URL (defaults to http://localhost:4566)
 */
export declare function getLocalStackEndpoint(): string;
/**
 * Gets Kinesis client configuration for the current environment
 *
 * When running in LocalStack, returns endpoint configuration pointing to LocalStack.
 * For AWS environments, returns undefined to use default AWS SDK configuration.
 *
 * @param environment - The environment name
 * @returns Client configuration object or undefined
 */
export declare function getKinesisEndpointConfig(environment: string): {
    endpoint: string;
    region: string;
} | undefined;
/**
 * Gets DynamoDB client configuration for the current environment
 *
 * When running in LocalStack, returns endpoint configuration pointing to LocalStack.
 * For AWS environments, returns undefined to use default AWS SDK configuration.
 *
 * @param environment - The environment name
 * @returns Client configuration object or undefined
 */
export declare function getDynamoDBEndpointConfig(environment: string): {
    endpoint: string;
    region: string;
} | undefined;
/**
 * Gets S3 client configuration for the current environment
 *
 * When running in LocalStack, returns endpoint configuration pointing to LocalStack
 * with path-style bucket access enabled.
 * For AWS environments, returns undefined to use default AWS SDK configuration.
 *
 * @param environment - The environment name
 * @returns Client configuration object or undefined
 */
export declare function getS3EndpointConfig(environment: string): {
    endpoint: string;
    region: string;
    forcePathStyle: boolean;
} | undefined;
//# sourceMappingURL=localstack-config.d.ts.map