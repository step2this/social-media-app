import { App } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { KinesisStack } from '../lib/stacks/kinesis-stack.js';
import { DatabaseStack } from '../lib/stacks/database-stack.js';

describe('KinesisConsumer Infrastructure Tests', () => {
  let app: App;
  let template: Template;

  beforeEach(() => {
    app = new App();

    // Create Database Stack first as it's a dependency
    const databaseStack = new DatabaseStack(app, 'TestDatabaseStack', {
      environment: 'test'
    });

    // Create Kinesis Stack with consumer Lambda
    const kinesisStack = new KinesisStack(app, 'TestKinesisStack', {
      environment: 'test',
      table: databaseStack.table,
      redisEndpoint: 'test-redis-endpoint',
      redisPort: 6379
    });

    // Get the CloudFormation template for testing
    template = Template.fromStack(kinesisStack);
  });

  describe('Lambda Function', () => {
    test('Lambda function created with correct runtime and handler', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'nodejs20.x',
        Handler: 'index.handler',
        MemorySize: 512,
        Timeout: 60,
        Description: 'Processes Kinesis feed events and updates Redis cache'
      });
    });

    test('Lambda function has required environment variables', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: Match.objectLike({
            TABLE_NAME: Match.anyValue(),
            REDIS_ENDPOINT: 'test-redis-endpoint',
            REDIS_PORT: '6379',
            USE_LOCALSTACK: 'false',
            LOCALSTACK_ENDPOINT: '',
            NODE_ENV: 'test',
            LOG_LEVEL: 'debug'
          })
        }
      });
    });

    test('Lambda function name follows naming convention', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'kinesis-feed-consumer-test'
      });
    });
  });

  describe('Dead Letter Queue', () => {
    test('DLQ created with proper retention period', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'kinesis-consumer-dlq-test',
        MessageRetentionPeriod: 1209600, // 14 days in seconds
        VisibilityTimeout: 300,
        KmsMasterKeyId: 'alias/aws/sqs'
      });
    });

    test('DLQ has correct visibility timeout', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        VisibilityTimeout: 300 // 5 minutes
      });
    });
  });

  describe('Event Source Mapping', () => {
    test('Event source mapping configured correctly', () => {
      template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
        StartingPosition: 'LATEST',
        BatchSize: 100,
        MaximumBatchingWindowInSeconds: 10,
        ParallelizationFactor: 1,
        MaximumRetryAttempts: 2,
        BisectBatchOnFunctionError: true,
        FunctionResponseTypes: ['ReportBatchItemFailures'],
        Enabled: true
      });
    });

    test('Event source mapping has DLQ configured', () => {
      template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
        DestinationConfig: {
          OnFailure: {
            Destination: Match.anyValue() // DLQ ARN
          }
        }
      });
    });

    test('Event source mapping points to correct Kinesis stream', () => {
      template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
        EventSourceArn: Match.anyValue() // Should be Kinesis stream ARN
      });
    });
  });

  describe('IAM Permissions', () => {
    test('Lambda has Kinesis read permissions', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: Match.arrayWith([
                'kinesis:DescribeStreamSummary',
                'kinesis:GetRecords',
                'kinesis:GetShardIterator',
                'kinesis:ListShards',
                'kinesis:SubscribeToShard'
              ])
            })
          ])
        }
      });
    });

    test('Lambda has DLQ send permissions', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: Match.arrayWith([
                'sqs:SendMessage',
                'sqs:GetQueueAttributes',
                'sqs:GetQueueUrl'
              ])
            })
          ])
        }
      });
    });

    test('Lambda has DynamoDB read/write permissions', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: Match.arrayWith([
                'dynamodb:BatchGetItem',
                'dynamodb:GetRecords',
                'dynamodb:GetShardIterator',
                'dynamodb:Query',
                'dynamodb:GetItem',
                'dynamodb:Scan',
                'dynamodb:ConditionCheckItem',
                'dynamodb:BatchWriteItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem'
              ])
            })
          ])
        }
      });
    });

    test('Lambda execution role exists', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Principal: {
                Service: 'lambda.amazonaws.com'
              },
              Action: 'sts:AssumeRole'
            })
          ])
        }
      });
    });
  });

  describe('CloudWatch Alarms', () => {
    test('DLQ alarm created for non-local environments', () => {
      // For test environment, alarms should be created
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: 'ApproximateNumberOfMessagesVisible',
        Threshold: 10,
        EvaluationPeriods: 1,
        DatapointsToAlarm: 1,
        AlarmDescription: 'Alert when Kinesis consumer DLQ has >10 messages'
      });
    });

    test('Lambda error alarm created for non-local environments', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: 'Errors',
        Threshold: 50,
        EvaluationPeriods: 2,
        DatapointsToAlarm: 2,
        AlarmDescription: 'Alert when Kinesis consumer Lambda has >50 errors in 2 periods'
      });
    });
  });

  describe('LocalStack Compatibility', () => {
    test('LocalStack environment variables set for local environment', () => {
      // Create a new stack with local environment
      const localApp = new App();
      const localDatabaseStack = new DatabaseStack(localApp, 'LocalDatabaseStack', {
        environment: 'local'
      });
      const localStack = new KinesisStack(localApp, 'LocalKinesisStack', {
        environment: 'local',
        table: localDatabaseStack.table,
        redisEndpoint: 'localhost',
        redisPort: 6379
      });
      const localTemplate = Template.fromStack(localStack);

      localTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: Match.objectLike({
            USE_LOCALSTACK: 'true',
            LOCALSTACK_ENDPOINT: 'http://localhost:4566'
          })
        }
      });
    });

    test('No CloudWatch alarms created for local environment', () => {
      const localApp = new App();
      const localDatabaseStack = new DatabaseStack(localApp, 'LocalDatabaseStack', {
        environment: 'local'
      });
      const localStack = new KinesisStack(localApp, 'LocalKinesisStack', {
        environment: 'local',
        table: localDatabaseStack.table,
        redisEndpoint: 'localhost',
        redisPort: 6379
      });
      const localTemplate = Template.fromStack(localStack);

      // Verify no alarms are created
      const alarmCount = localTemplate.findResources('AWS::CloudWatch::Alarm');
      expect(Object.keys(alarmCount).length).toBe(0);
    });
  });

  describe('Stack Outputs', () => {
    test('All required outputs are exported', () => {
      template.hasOutput('FeedEventsStreamName', {
        Value: Match.anyValue(),
        Description: 'Kinesis stream name for feed events',
        Export: {
          Name: 'test-feed-events-stream-name'
        }
      });

      template.hasOutput('FeedEventsStreamArn', {
        Value: Match.anyValue(),
        Description: 'Kinesis stream ARN for feed events',
        Export: {
          Name: 'test-feed-events-stream-arn'
        }
      });

      template.hasOutput('ConsumerDLQUrl', {
        Value: Match.anyValue(),
        Description: 'Dead Letter Queue URL for failed Kinesis events',
        Export: {
          Name: 'test-kinesis-consumer-dlq-url'
        }
      });

      template.hasOutput('ConsumerLambdaArn', {
        Value: Match.anyValue(),
        Description: 'Kinesis consumer Lambda ARN',
        Export: {
          Name: 'test-kinesis-consumer-lambda-arn'
        }
      });
    });
  });
});