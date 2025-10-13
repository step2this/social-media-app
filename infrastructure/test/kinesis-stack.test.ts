import { describe, it, expect } from 'vitest';
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { KinesisStack } from '../lib/stacks/kinesis-stack.js';

describe('KinesisStack', () => {
  it('creates Kinesis stream with correct properties', () => {
    const app = new App();

    const kinesisStack = new KinesisStack(app, 'TestKinesisStack', {
      environment: 'test'
    });

    const template = Template.fromStack(kinesisStack);

    // Verify stream creation with correct configuration
    template.hasResourceProperties('AWS::Kinesis::Stream', {
      ShardCount: 5,
      RetentionPeriodHours: 8760, // 365 days
      StreamModeDetails: {
        StreamMode: 'PROVISIONED'
      }
    });
  });

  it('creates stream with correct name for environment', () => {
    const app = new App();

    const kinesisStack = new KinesisStack(app, 'TestKinesisStack', {
      environment: 'dev'
    });

    const template = Template.fromStack(kinesisStack);

    template.hasResourceProperties('AWS::Kinesis::Stream', {
      Name: 'feed-events-dev'
    });
  });

  it('creates outputs for stream name and ARN', () => {
    const app = new App();

    const kinesisStack = new KinesisStack(app, 'TestKinesisStack', {
      environment: 'test'
    });

    const template = Template.fromStack(kinesisStack);

    template.hasOutput('FeedEventsStreamName', {});
    template.hasOutput('FeedEventsStreamArn', {});
  });

  it('creates stream with managed encryption', () => {
    const app = new App();

    const kinesisStack = new KinesisStack(app, 'TestKinesisStack', {
      environment: 'prod'
    });

    const template = Template.fromStack(kinesisStack);

    // Verify encryption is configured (AWS managed)
    template.hasResourceProperties('AWS::Kinesis::Stream', {
      StreamEncryption: {
        EncryptionType: 'KMS',
        KeyId: 'alias/aws/kinesis'
      }
    });
  });

  it('creates exactly one Kinesis stream', () => {
    const app = new App();

    const kinesisStack = new KinesisStack(app, 'TestKinesisStack', {
      environment: 'test'
    });

    const template = Template.fromStack(kinesisStack);

    template.resourceCountIs('AWS::Kinesis::Stream', 1);
  });
});
