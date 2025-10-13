import { Stack, type StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayIntegrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { AuthLambdas } from '../constructs/auth-lambdas.js';
import { ProfileLambdas } from '../constructs/profile-lambdas.js';
import { LikeLambdas } from '../constructs/like-lambdas.js';
import { FollowLambdas } from '../constructs/follow-lambdas.js';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { RedisStack } from './redis-stack.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ApiStackProps extends StackProps {
  environment: string;
  table: dynamodb.Table;
  mediaBucket: s3.Bucket;
  cloudFrontDomain: string;
  kinesisStream: kinesis.Stream;
}

export class ApiStack extends Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // Create VPC for production environments (required for ElastiCache)
    let vpc: ec2.IVpc | undefined;
    if (props.environment === 'prod' || props.environment === 'staging') {
      vpc = new ec2.Vpc(this, 'AppVpc', {
        maxAzs: 2, // Multi-AZ requires at least 2 AZs
        natGateways: 1, // Cost optimization: single NAT gateway
        subnetConfiguration: [
          {
            cidrMask: 24,
            name: 'private',
            subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
          },
          {
            cidrMask: 24,
            name: 'public',
            subnetType: ec2.SubnetType.PUBLIC
          }
        ]
      });
    }

    // Create Redis cache construct (outputs will be added to this stack)
    const redisCache = new RedisStack(this, 'RedisCache', {
      environment: props.environment,
      vpc: vpc,
      alertEmail: props.environment === 'prod' ? process.env.ALERT_EMAIL : undefined
    });

    // Store Redis configuration for lambdas (will be used by Feed lambdas in Phase 3.2)
    const redisEndpoint = redisCache.cacheEndpoint;
    const redisPort = redisCache.cachePort.toString();

    // TODO: Pass redisEndpoint and redisPort to Feed lambdas when they are created
    // For now, we're just creating the infrastructure
    console.log(`Redis cache configured at ${redisEndpoint}:${redisPort}`);

    // Create Lambda function for Hello endpoint
    const helloLambda = new NodejsFunction(this, 'HelloFunction', {
      functionName: `social-media-app-hello-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../packages/backend/src/handlers/hello.ts'),
      handler: 'handler',
      timeout: Duration.seconds(30),
      memorySize: 512,
      environment: {
        NODE_ENV: props.environment,
        LOG_LEVEL: props.environment === 'prod' ? 'warn' : 'debug'
      },
      tracing: lambda.Tracing.ACTIVE, // Enable X-Ray tracing
      projectRoot: path.join(__dirname, '../../../'),
      depsLockFilePath: path.join(__dirname, '../../../pnpm-lock.yaml'),
      bundling: {
        format: OutputFormat.ESM,
        target: 'es2022',
        platform: 'node',
        mainFields: ['module', 'main']
      }
    });

    // Create authentication Lambda functions
    const authLambdas = new AuthLambdas(this, 'AuthLambdas', {
      environment: props.environment,
      table: props.table
    });

    // Create profile and posts Lambda functions
    const profileLambdas = new ProfileLambdas(this, 'ProfileLambdas', {
      environment: props.environment,
      table: props.table,
      mediaBucket: props.mediaBucket,
      cloudFrontDomain: props.cloudFrontDomain,
      kinesisStream: props.kinesisStream
    });

    // Create like Lambda functions
    const likeLambdas = new LikeLambdas(this, 'LikeLambdas', {
      environment: props.environment,
      table: props.table,
      kinesisStream: props.kinesisStream
    });

    // Wire up DynamoDB Stream to Like Counter Lambda
    likeLambdas.likeCounter.addEventSource(
      new DynamoEventSource(props.table, {
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 10,
        retryAttempts: 3,
        filters: [
          // Only process LIKE entities
          lambda.FilterCriteria.filter({
            eventName: lambda.FilterRule.isEqual('INSERT'),
            dynamodb: {
              NewImage: {
                entityType: {
                  S: lambda.FilterRule.isEqual('LIKE')
                }
              }
            }
          }),
          lambda.FilterCriteria.filter({
            eventName: lambda.FilterRule.isEqual('REMOVE'),
            dynamodb: {
              OldImage: {
                entityType: {
                  S: lambda.FilterRule.isEqual('LIKE')
                }
              }
            }
          })
        ]
      })
    );

    // Create follow Lambda functions
    const followLambdas = new FollowLambdas(this, 'FollowLambdas', {
      environment: props.environment,
      table: props.table
    });

    // Wire up DynamoDB Stream to Follow Counter Lambda
    followLambdas.followCounter.addEventSource(
      new DynamoEventSource(props.table, {
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 10,
        retryAttempts: 3,
        filters: [
          // Only process FOLLOW entities
          lambda.FilterCriteria.filter({
            eventName: lambda.FilterRule.isEqual('INSERT'),
            dynamodb: {
              NewImage: {
                entityType: {
                  S: lambda.FilterRule.isEqual('FOLLOW')
                }
              }
            }
          }),
          lambda.FilterCriteria.filter({
            eventName: lambda.FilterRule.isEqual('REMOVE'),
            dynamodb: {
              OldImage: {
                entityType: {
                  S: lambda.FilterRule.isEqual('FOLLOW')
                }
              }
            }
          })
        ]
      })
    );

    // Create HTTP API Gateway
    const httpApi = new apigateway.HttpApi(this, 'HttpApi', {
      apiName: `social-media-app-api-${props.environment}`,
      corsPreflight: {
        allowOrigins: props.environment === 'prod'
          ? ['https://yourdomain.com'] // Replace with actual production domain when available
          : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'], // Development origins
        allowMethods: [
          apigateway.CorsHttpMethod.GET,
          apigateway.CorsHttpMethod.POST,
          apigateway.CorsHttpMethod.PUT,
          apigateway.CorsHttpMethod.DELETE,
          apigateway.CorsHttpMethod.OPTIONS,
          apigateway.CorsHttpMethod.PATCH
        ],
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Correlation-Id'
        ],
        exposeHeaders: ['X-Correlation-Id'],
        allowCredentials: false,
        maxAge: Duration.seconds(3600) // 1 hour
      }
    });

    // Add Hello route
    httpApi.addRoutes({
      path: '/hello',
      methods: [apigateway.HttpMethod.POST],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'HelloIntegration',
        helloLambda
      )
    });

    // Add authentication routes

    // Register endpoint
    httpApi.addRoutes({
      path: '/auth/register',
      methods: [apigateway.HttpMethod.POST],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'RegisterIntegration',
        authLambdas.registerFunction
      )
    });

    // Login endpoint
    httpApi.addRoutes({
      path: '/auth/login',
      methods: [apigateway.HttpMethod.POST],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'LoginIntegration',
        authLambdas.loginFunction
      )
    });

    // Logout endpoint (requires authentication)
    httpApi.addRoutes({
      path: '/auth/logout',
      methods: [apigateway.HttpMethod.POST],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'LogoutIntegration',
        authLambdas.logoutFunction
      )
    });

    // Refresh token endpoint
    httpApi.addRoutes({
      path: '/auth/refresh',
      methods: [apigateway.HttpMethod.POST],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'RefreshIntegration',
        authLambdas.refreshFunction
      )
    });

    // Profile endpoints (requires authentication)
    httpApi.addRoutes({
      path: '/auth/profile',
      methods: [apigateway.HttpMethod.GET, apigateway.HttpMethod.PUT],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'ProfileIntegration',
        authLambdas.profileFunction
      )
    });

    // Profile management endpoints

    // Get public profile by handle
    httpApi.addRoutes({
      path: '/profile/{handle}',
      methods: [apigateway.HttpMethod.GET],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'GetProfileIntegration',
        profileLambdas.getProfile
      )
    });

    // Update authenticated user profile
    httpApi.addRoutes({
      path: '/profile',
      methods: [apigateway.HttpMethod.PUT],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'UpdateProfileIntegration',
        profileLambdas.updateProfile
      )
    });

    // Get presigned URL for uploads
    httpApi.addRoutes({
      path: '/profile/upload-url',
      methods: [apigateway.HttpMethod.POST],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'GetUploadUrlIntegration',
        profileLambdas.getUploadUrl
      )
    });

    // Posts endpoints

    // Create a new post
    httpApi.addRoutes({
      path: '/posts',
      methods: [apigateway.HttpMethod.POST],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'CreatePostIntegration',
        profileLambdas.createPost
      )
    });

    // Get posts by user handle
    httpApi.addRoutes({
      path: '/profile/{handle}/posts',
      methods: [apigateway.HttpMethod.GET],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'GetUserPostsIntegration',
        profileLambdas.getUserPosts
      )
    });

    // Delete a post
    httpApi.addRoutes({
      path: '/posts/{postId}',
      methods: [apigateway.HttpMethod.DELETE],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'DeletePostIntegration',
        profileLambdas.deletePost
      )
    });

    // Get feed/explore posts
    httpApi.addRoutes({
      path: '/feed',
      methods: [apigateway.HttpMethod.GET],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'GetFeedIntegration',
        profileLambdas.getFeed
      )
    });

    // Mark posts as read
    httpApi.addRoutes({
      path: '/feed/read',
      methods: [apigateway.HttpMethod.POST],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'MarkReadIntegration',
        profileLambdas.markRead
      )
    });

    // Like endpoints

    // Like a post (postId in request body)
    httpApi.addRoutes({
      path: '/likes',
      methods: [apigateway.HttpMethod.POST],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'LikePostIntegration',
        likeLambdas.likePost
      )
    });

    // Unlike a post (postId in request body)
    httpApi.addRoutes({
      path: '/likes',
      methods: [apigateway.HttpMethod.DELETE],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'UnlikePostIntegration',
        likeLambdas.unlikePost
      )
    });

    // Get like status for a post (postId in path)
    httpApi.addRoutes({
      path: '/likes/{postId}',
      methods: [apigateway.HttpMethod.GET],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'GetLikeStatusIntegration',
        likeLambdas.getLikeStatus
      )
    });

    // Follow endpoints

    // Follow a user (userId in request body)
    httpApi.addRoutes({
      path: '/follows',
      methods: [apigateway.HttpMethod.POST],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'FollowUserIntegration',
        followLambdas.followUser
      )
    });

    // Unfollow a user (userId in request body)
    httpApi.addRoutes({
      path: '/follows',
      methods: [apigateway.HttpMethod.DELETE],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'UnfollowUserIntegration',
        followLambdas.unfollowUser
      )
    });

    // Get follow status for a user (userId in path)
    httpApi.addRoutes({
      path: '/follows/{userId}/status',
      methods: [apigateway.HttpMethod.GET],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'GetFollowStatusIntegration',
        followLambdas.getFollowStatus
      )
    });

    // Add explicit OPTIONS route for CORS debugging
    // This helps with preflight request debugging and ensures proper CORS headers
    httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigateway.HttpMethod.OPTIONS],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'OptionsIntegration',
        helloLambda // Temporary - will be replaced when CORS handler is created
      )
    });

    // Output the API URL
    this.apiUrl = httpApi.url!;
    new CfnOutput(this, 'ApiUrl', {
      value: this.apiUrl,
      description: 'HTTP API Gateway URL'
    });
  }
}