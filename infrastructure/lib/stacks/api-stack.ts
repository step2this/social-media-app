import { Stack, type StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayIntegrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { AuthLambdas } from '../constructs/auth-lambdas.js';
import { ProfileLambdas } from '../constructs/profile-lambdas.js';
import * as s3 from 'aws-cdk-lib/aws-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ApiStackProps extends StackProps {
  environment: string;
  table: dynamodb.Table;
  mediaBucket: s3.Bucket;
  cloudFrontDomain: string;
}

export class ApiStack extends Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

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
      cloudFrontDomain: props.cloudFrontDomain
    });

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