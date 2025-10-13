#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { DatabaseStack } from '../lib/stacks/database-stack.js';
import { MediaStack } from '../lib/stacks/media-stack.js';
import { ApiStack } from '../lib/stacks/api-stack.js';
import { KinesisStack } from '../lib/stacks/kinesis-stack.js';

const app = new App();

const environment = app.node.tryGetContext('environment') || 'dev';
const stackPrefix = `SocialMediaApp-${environment}`;

// Create Database Stack with DynamoDB
const databaseStack = new DatabaseStack(app, `${stackPrefix}-Database`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  environment,
  description: 'Database stack with DynamoDB table'
});

// Create Media Stack with S3 and CloudFront for user content
const mediaStack = new MediaStack(app, `${stackPrefix}-Media`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  environment,
  description: 'Media stack with S3 and CloudFront for user content'
});

// Define Redis configuration for local development
const redisEndpoint = environment === 'local' ? 'localhost' : 'redis-cache-endpoint';
const redisPort = 6379;

// Create Kinesis Stack with consumer Lambda
const kinesisStack = new KinesisStack(app, `${stackPrefix}-Kinesis`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  environment,
  table: databaseStack.table,
  redisEndpoint: redisEndpoint,
  redisPort: redisPort,
  description: 'Kinesis Data Streams with consumer Lambda for event processing'
});

kinesisStack.addDependency(databaseStack);

// Create API Stack with Lambda functions
const apiStack = new ApiStack(app, `${stackPrefix}-Api`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  environment,
  table: databaseStack.table,
  mediaBucket: mediaStack.mediaBucket,
  cloudFrontDomain: mediaStack.distributionDomainName,
  kinesisStream: kinesisStack.feedEventsStream,
  description: 'API stack with Lambda functions and API Gateway'
});

apiStack.addDependency(databaseStack);
apiStack.addDependency(mediaStack);
apiStack.addDependency(kinesisStack);

app.synth();