import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FollowLambdasProps {
  environment: string;
  table: dynamodb.Table;
}

export class FollowLambdas extends Construct {
  public readonly followUser: NodejsFunction;
  public readonly unfollowUser: NodejsFunction;
  public readonly getFollowStatus: NodejsFunction;
  public readonly followCounter: NodejsFunction;

  constructor(scope: Construct, id: string, props: FollowLambdasProps) {
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

    // Follow User Lambda
    this.followUser = new NodejsFunction(this, 'FollowUserFunction', {
      functionName: `social-media-app-follow-user-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../packages/backend/src/handlers/follows/follow-user.ts'),
      handler: 'handler',
      timeout: Duration.seconds(10),
      memorySize: 256,
      environment: commonEnvironment,
      bundling: commonBundling
    });

    // Unfollow User Lambda
    this.unfollowUser = new NodejsFunction(this, 'UnfollowUserFunction', {
      functionName: `social-media-app-unfollow-user-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../packages/backend/src/handlers/follows/unfollow-user.ts'),
      handler: 'handler',
      timeout: Duration.seconds(10),
      memorySize: 256,
      environment: commonEnvironment,
      bundling: commonBundling
    });

    // Get Follow Status Lambda
    this.getFollowStatus = new NodejsFunction(this, 'GetFollowStatusFunction', {
      functionName: `social-media-app-get-follow-status-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../packages/backend/src/handlers/follows/get-follow-status.ts'),
      handler: 'handler',
      timeout: Duration.seconds(10),
      memorySize: 256,
      environment: commonEnvironment,
      bundling: commonBundling
    });

    // Follow Counter Stream Processor Lambda
    this.followCounter = new NodejsFunction(this, 'FollowCounterFunction', {
      functionName: `social-media-app-follow-counter-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../../packages/backend/src/handlers/streams/follow-counter.ts'),
      handler: 'handler',
      timeout: Duration.seconds(30),
      memorySize: 512,
      environment: commonEnvironment,
      bundling: commonBundling
    });

    // Grant DynamoDB permissions
    props.table.grantReadWriteData(this.followUser);
    props.table.grantReadWriteData(this.unfollowUser);
    props.table.grantReadData(this.getFollowStatus);
    props.table.grantReadWriteData(this.followCounter); // Stream processor needs write for counter updates

    // Grant stream processor permission to read from DynamoDB Streams
    props.table.grantStreamRead(this.followCounter);
  }
}
