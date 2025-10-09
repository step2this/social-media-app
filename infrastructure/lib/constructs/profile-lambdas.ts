import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ProfileLambdasProps {
  environment: string;
  table: dynamodb.Table;
  mediaBucket: s3.Bucket;
  cloudFrontDomain: string;
}

export class ProfileLambdas extends Construct {
  public readonly getProfile: NodejsFunction;
  public readonly updateProfile: NodejsFunction;
  public readonly getUploadUrl: NodejsFunction;
  public readonly createPost: NodejsFunction;
  public readonly getUserPosts: NodejsFunction;
  public readonly deletePost: NodejsFunction;
  public readonly getFeed: NodejsFunction;

  constructor(scope: Construct, id: string, props: ProfileLambdasProps) {
    super(scope, id);

    const commonEnvironment = {
      NODE_ENV: props.environment,
      LOG_LEVEL: props.environment === 'prod' ? 'warn' : 'debug',
      TABLE_NAME: props.table.tableName,
      MEDIA_BUCKET_NAME: props.mediaBucket.bucketName,
      CLOUDFRONT_DOMAIN: props.cloudFrontDomain,
      JWT_SECRET: process.env.JWT_SECRET || 'development-secret-change-in-production',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'development-refresh-secret-change-in-production'
    };

    const commonBundling = {
      format: OutputFormat.ESM,
      target: 'es2022',
      platform: 'node' as const,
      mainFields: ['module', 'main'],
      projectRoot: path.join(__dirname, '../../../'),
      depsLockFilePath: path.join(__dirname, '../../../pnpm-lock.yaml')
    };

    // Get Profile Lambda
    this.getProfile = new NodejsFunction(this, 'GetProfileFunction', {
      functionName: `social-media-app-get-profile-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../packages/backend/src/handlers/profile/get-profile.ts'),
      handler: 'handler',
      timeout: Duration.seconds(30),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: commonBundling
    });

    // Update Profile Lambda
    this.updateProfile = new NodejsFunction(this, 'UpdateProfileFunction', {
      functionName: `social-media-app-update-profile-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../packages/backend/src/handlers/profile/update-profile.ts'),
      handler: 'handler',
      timeout: Duration.seconds(30),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: commonBundling
    });

    // Get Upload URL Lambda
    this.getUploadUrl = new NodejsFunction(this, 'GetUploadUrlFunction', {
      functionName: `social-media-app-get-upload-url-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../packages/backend/src/handlers/profile/get-upload-url.ts'),
      handler: 'handler',
      timeout: Duration.seconds(30),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: commonBundling
    });

    // Create Post Lambda
    this.createPost = new NodejsFunction(this, 'CreatePostFunction', {
      functionName: `social-media-app-create-post-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../packages/backend/src/handlers/posts/create-post.ts'),
      handler: 'handler',
      timeout: Duration.seconds(30),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: commonBundling
    });

    // Get User Posts Lambda
    this.getUserPosts = new NodejsFunction(this, 'GetUserPostsFunction', {
      functionName: `social-media-app-get-user-posts-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../packages/backend/src/handlers/posts/get-user-posts.ts'),
      handler: 'handler',
      timeout: Duration.seconds(30),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: commonBundling
    });

    // Delete Post Lambda
    this.deletePost = new NodejsFunction(this, 'DeletePostFunction', {
      functionName: `social-media-app-delete-post-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../packages/backend/src/handlers/posts/delete-post.ts'),
      handler: 'handler',
      timeout: Duration.seconds(30),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: commonBundling
    });

    // Get Feed Lambda
    this.getFeed = new NodejsFunction(this, 'GetFeedFunction', {
      functionName: `social-media-app-get-feed-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../packages/backend/src/handlers/feed/get-feed.ts'),
      handler: 'handler',
      timeout: Duration.seconds(30),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: commonBundling
    });

    // Grant DynamoDB permissions
    props.table.grantReadData(this.getProfile);
    props.table.grantReadData(this.getUserPosts);
    props.table.grantReadWriteData(this.updateProfile);
    props.table.grantReadWriteData(this.createPost);
    props.table.grantReadWriteData(this.deletePost);
    props.table.grantReadData(this.getUploadUrl);
    props.table.grantReadData(this.getFeed);

    // Grant S3 permissions
    props.mediaBucket.grantPut(this.getUploadUrl);
    props.mediaBucket.grantPut(this.createPost);
  }
}