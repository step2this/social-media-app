import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
/**
 * Properties for GraphQL Lambda construct
 */
interface GraphQLLambdaProps {
    /** Deployment environment (dev, staging, prod) */
    environment: string;
    /** DynamoDB table for data storage */
    table: dynamodb.Table;
    /** S3 bucket for media storage */
    mediaBucket: s3.Bucket;
    /** CloudFront distribution domain for serving media */
    cloudFrontDomain: string;
}
/**
 * GraphQL Lambda Construct
 *
 * Creates a single Lambda function that handles all GraphQL operations
 * via Apollo Server. This follows the "singleton pattern" where one
 * Lambda handles all GraphQL queries and mutations.
 *
 * ## Architecture
 * - Single Lambda function for all GraphQL operations
 * - Apollo Server with AWS Lambda integration
 * - JWT-based authentication via context
 * - DataLoader support for batching queries
 * - DynamoDB access for data persistence
 * - S3 access for media URL generation
 *
 * ## Performance
 * - 1024 MB memory for optimal GraphQL performance
 * - 30 second timeout for complex queries
 * - X-Ray tracing enabled for observability
 * - ESM bundling for faster cold starts
 *
 * @example
 * const graphqlLambda = new GraphQLLambda(this, 'GraphQLLambda', {
 *   environment: 'dev',
 *   table: dynamoTable,
 *   mediaBucket: s3Bucket,
 *   cloudFrontDomain: 'https://d1234567890.cloudfront.net'
 * });
 */
export declare class GraphQLLambda extends Construct {
    /** The Lambda function that handles GraphQL requests */
    readonly function: NodejsFunction;
    constructor(scope: Construct, id: string, props: GraphQLLambdaProps);
}
export {};
//# sourceMappingURL=graphql-lambda.d.ts.map