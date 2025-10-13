import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { RedisStack } from '../lib/stacks/redis-stack.js';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

describe('RedisStack', () => {
  test('creates Redis outputs for local environment', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');

    new RedisStack(stack, 'TestRedisStack', {
      environment: 'local'
    });

    const template = Template.fromStack(stack);

    // Check for Redis endpoint output
    template.hasOutput('TestRedisStackRedisEndpoint', {
      Value: 'localhost'
    });
  });

  test('creates Redis outputs for dev environment', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');

    new RedisStack(stack, 'TestRedisStack', {
      environment: 'dev'
    });

    const template = Template.fromStack(stack);

    // Check for Redis endpoint output
    template.hasOutput('TestRedisStackRedisEndpoint', {
      Value: 'localhost'
    });
  });

  test('throws error for production without VPC', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');

    expect(() => {
      new RedisStack(stack, 'TestRedisStack', {
        environment: 'prod'
      });
    }).toThrow('VPC required for ElastiCache in production');
  });

  test('creates ElastiCache cluster for production with VPC', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');

    // Create a real VPC for testing
    const vpc = new ec2.Vpc(stack, 'TestVpc', {
      maxAzs: 2,
      natGateways: 1
    });

    new RedisStack(stack, 'TestRedisStack', {
      environment: 'prod',
      vpc: vpc
    });

    const template = Template.fromStack(stack);

    // Check for ElastiCache cluster
    template.hasResourceProperties('AWS::ElastiCache::CacheCluster', {
      Engine: 'redis',
      CacheNodeType: 'cache.t3.micro',
      NumCacheNodes: 1,
      EngineVersion: '7.0'
    });

    // Check for security group
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Security group for ElastiCache Redis'
    });

    // Check for subnet group
    template.hasResourceProperties('AWS::ElastiCache::SubnetGroup', {
      Description: 'Subnet group for ElastiCache Redis'
    });

    // Check for outputs
    template.hasOutput('TestRedisStackRedisEndpoint', {});
    template.hasOutput('TestRedisStackRedisPort', {
      Value: '6379'
    });
  });

  test('creates ElastiCache with correct tags', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');

    const vpc = new ec2.Vpc(stack, 'TestVpc', {
      maxAzs: 2
    });

    new RedisStack(stack, 'TestRedisStack', {
      environment: 'staging',
      vpc: vpc
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::ElastiCache::CacheCluster', {
      Tags: [
        {
          Key: 'Environment',
          Value: 'staging'
        },
        {
          Key: 'Service',
          Value: 'FeedCache'
        }
      ]
    });
  });
});