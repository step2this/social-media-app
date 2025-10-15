import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
export class GraphQLLambda extends Construct {
  /** The Lambda function that handles GraphQL requests */
  public readonly function: NodejsFunction;

  constructor(scope: Construct, id: string, props: GraphQLLambdaProps) {
    super(scope, id);

    // Environment variables for the Lambda function
    const environment = {
      NODE_ENV: props.environment,
      LOG_LEVEL: props.environment === 'prod' ? 'warn' : 'debug',
      TABLE_NAME: props.table.tableName,
      MEDIA_BUCKET_NAME: props.mediaBucket.bucketName,
      CLOUDFRONT_DOMAIN: props.cloudFrontDomain,
      JWT_SECRET: process.env.JWT_SECRET || 'development-secret-change-in-production',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'development-refresh-secret-change-in-production',
      // AWS_REGION is automatically set by Lambda runtime, no need to set it manually
      // GraphQL-specific settings
      GRAPHQL_INTROSPECTION: props.environment === 'prod' ? 'false' : 'true',
      GRAPHQL_PLAYGROUND: props.environment === 'prod' ? 'false' : 'true'
    };

    // Create the Lambda function
    this.function = new NodejsFunction(this, 'Function', {
      functionName: `social-media-app-graphql-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../packages/graphql-server/src/lambda.ts'),
      handler: 'handler',
      timeout: Duration.seconds(30), // GraphQL queries can be complex
      memorySize: 1024, // GraphQL benefits from more memory
      environment,
      description: 'GraphQL API handler using Apollo Server',
      // Enable X-Ray tracing for distributed tracing
      tracing: lambda.Tracing.ACTIVE,
      // Point to project root for workspace dependency resolution
      projectRoot: path.join(__dirname, '../../../'),
      depsLockFilePath: path.join(__dirname, '../../../pnpm-lock.yaml'),
      bundling: {
        format: OutputFormat.ESM,
        target: 'es2022',
        platform: 'node',
        mainFields: ['module', 'main'],
        // External modules provided by Lambda runtime or layers
        externalModules: [
          'aws-sdk', // Provided by Lambda runtime (SDK v2)
          '@aws-sdk/*' // SDK v3 modules - include if using Lambda layers
        ],
        // Additional esbuild options for GraphQL
        minify: props.environment === 'prod',
        sourceMap: props.environment !== 'prod',
        // Keep function names for better error messages
        keepNames: true,
        // Define compile-time constants
        define: {
          'process.env.NODE_ENV': JSON.stringify(props.environment)
        }
      },
      // Retry configuration for transient failures
      retryAttempts: 2,
      // Dead letter queue could be added here for failed invocations
    });

    // Grant DynamoDB permissions
    props.table.grantReadWriteData(this.function);

    // Grant permissions to query GSI indexes
    // GraphQL queries often need to access multiple indexes
    this.function.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:Query',
        'dynamodb:BatchGetItem',
        'dynamodb:BatchWriteItem'
      ],
      resources: [
        props.table.tableArn,
        `${props.table.tableArn}/index/GSI1`,
        `${props.table.tableArn}/index/GSI2`
      ]
    }));

    // Grant S3 permissions for media operations
    // Read access for generating signed URLs
    props.mediaBucket.grantRead(this.function);

    // Grant permission to generate presigned URLs
    this.function.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
        's3:PutObject',
        's3:GetObjectAttributes'
      ],
      resources: [`${props.mediaBucket.bucketArn}/*`]
    }));

    // Grant CloudWatch Logs permissions (implicit with Lambda)
    // X-Ray permissions are granted automatically when tracing is enabled

    // Add tags for cost tracking and organization
    this.function.addEnvironment('SERVICE_NAME', 'graphql-api');
    this.function.addEnvironment('DEPLOYMENT_STAGE', props.environment);

    // Log configuration for debugging (commented out for cleaner synthesis)
    // console.log(`GraphQL Lambda created:`, {
    //   functionName: this.function.functionName,
    //   environment: props.environment,
    //   memorySize: 1024,
    //   timeout: '30 seconds',
    //   tableName: props.table.tableName,
    //   bucketName: props.mediaBucket.bucketName,
    //   cloudFrontDomain: props.cloudFrontDomain
    // });
  }
}