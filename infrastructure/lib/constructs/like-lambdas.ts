import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface LikeLambdasProps {
  environment: string;
  table: dynamodb.Table;
}

export class LikeLambdas extends Construct {
  public readonly likePost: NodejsFunction;
  public readonly unlikePost: NodejsFunction;
  public readonly getLikeStatus: NodejsFunction;
  public readonly likeCounter: NodejsFunction;

  constructor(scope: Construct, id: string, props: LikeLambdasProps) {
    super(scope, id);

    const commonEnvironment = {
      NODE_ENV: props.environment,
      LOG_LEVEL: props.environment === 'prod' ? 'warn' : 'debug',
      TABLE_NAME: props.table.tableName,
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

    // Like Post Lambda
    this.likePost = new NodejsFunction(this, 'LikePostFunction', {
      functionName: `social-media-app-like-post-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../packages/backend/src/handlers/likes/like-post.ts'),
      handler: 'handler',
      timeout: Duration.seconds(10),
      memorySize: 256,
      environment: commonEnvironment,
      bundling: commonBundling
    });

    // Unlike Post Lambda
    this.unlikePost = new NodejsFunction(this, 'UnlikePostFunction', {
      functionName: `social-media-app-unlike-post-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../packages/backend/src/handlers/likes/unlike-post.ts'),
      handler: 'handler',
      timeout: Duration.seconds(10),
      memorySize: 256,
      environment: commonEnvironment,
      bundling: commonBundling
    });

    // Get Like Status Lambda
    this.getLikeStatus = new NodejsFunction(this, 'GetLikeStatusFunction', {
      functionName: `social-media-app-get-like-status-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../packages/backend/src/handlers/likes/get-like-status.ts'),
      handler: 'handler',
      timeout: Duration.seconds(10),
      memorySize: 256,
      environment: commonEnvironment,
      bundling: commonBundling
    });

    // Like Counter Stream Processor Lambda
    this.likeCounter = new NodejsFunction(this, 'LikeCounterFunction', {
      functionName: `social-media-app-like-counter-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../packages/backend/src/handlers/streams/like-counter.ts'),
      handler: 'handler',
      timeout: Duration.seconds(30),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: commonBundling
    });

    // Grant DynamoDB permissions
    props.table.grantReadWriteData(this.likePost);
    props.table.grantReadWriteData(this.unlikePost);
    props.table.grantReadData(this.getLikeStatus);
    props.table.grantReadWriteData(this.likeCounter); // Stream processor needs write for counter updates

    // Grant stream processor permission to read from DynamoDB Streams
    props.table.grantStreamRead(this.likeCounter);
  }
}
