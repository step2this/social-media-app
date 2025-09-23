#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { DatabaseStack } from '../lib/stacks/database-stack.js';
import { MediaStack } from '../lib/stacks/media-stack.js';
import { ApiStack } from '../lib/stacks/api-stack.js';
import { FrontendStack } from '../lib/stacks/frontend-stack.js';

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
  description: 'API stack with Lambda functions and API Gateway'
});

apiStack.addDependency(databaseStack);
apiStack.addDependency(mediaStack);

// Create Frontend Stack with S3 and CloudFront
const frontendStack = new FrontendStack(app, `${stackPrefix}-Frontend`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  environment,
  apiUrl: apiStack.apiUrl,
  description: 'Frontend stack with S3 and CloudFront'
});

frontendStack.addDependency(apiStack);

app.synth();