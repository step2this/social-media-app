import { App, Stack } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { RedisStack } from '../lib/stacks/redis-stack.js';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

describe('RedisStack', () => {
  describe('Local/Dev Environment', () => {
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

      template.hasOutput('TestRedisStackRedisPort', {
        Value: '6379'
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

      template.hasOutput('TestRedisStackRedisPort', {
        Value: '6379'
      });
    });
  });

  describe('Production Environment Validation', () => {
    test('throws error for production without VPC', () => {
      const app = new App();
      const stack = new Stack(app, 'TestStack');

      expect(() => {
        new RedisStack(stack, 'TestRedisStack', {
          environment: 'prod'
        });
      }).toThrow('VPC required for ElastiCache in production');
    });

    test('throws error for staging without VPC', () => {
      const app = new App();
      const stack = new Stack(app, 'TestStack');

      expect(() => {
        new RedisStack(stack, 'TestRedisStack', {
          environment: 'staging'
        });
      }).toThrow('VPC required for ElastiCache in production');
    });
  });

  describe('Multi-AZ Replication Group (Production)', () => {
    test('creates ElastiCache replication group for production with VPC', () => {
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

      // Check for ElastiCache Replication Group with Multi-AZ
      template.hasResourceProperties('AWS::ElastiCache::ReplicationGroup', {
        ReplicationGroupDescription: 'Redis replication group for prod feed caching',
        ReplicationGroupId: 'feed-cache-prod',
        AutomaticFailoverEnabled: true,
        MultiAZEnabled: true,
        NumCacheClusters: 2,
        Engine: 'redis',
        CacheNodeType: 'cache.t3.micro',
        EngineVersion: '7.0',
        Port: 6379,
        SnapshotRetentionLimit: 7,
        AtRestEncryptionEnabled: true,
        TransitEncryptionEnabled: false
      });

      // Check for security group
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: 'Security group for ElastiCache Redis Replication Group'
      });

      // Check for subnet group
      template.hasResourceProperties('AWS::ElastiCache::SubnetGroup', {
        Description: 'Subnet group for ElastiCache Redis Multi-AZ deployment'
      });

      // Check for outputs
      template.hasOutput('TestRedisStackRedisEndpoint', {});
      template.hasOutput('TestRedisStackRedisPort', {
        Value: '6379'
      });
      template.hasOutput('TestRedisStackRedisReaderEndpoint', {});
      template.hasOutput('TestRedisStackRedisConfiguration', {});
    });

    test('creates ElastiCache replication group with correct tags', () => {
      const app = new App();
      const stack = new Stack(app, 'TestStack');

      const vpc = new ec2.Vpc(stack, 'TestVpc', {
        maxAzs: 2
      });

      new RedisStack(stack, 'TestRedisStack', {
        environment: 'prod',
        vpc: vpc
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::ElastiCache::ReplicationGroup', {
        Tags: [
          {
            Key: 'Environment',
            Value: 'prod'
          },
          {
            Key: 'Service',
            Value: 'FeedCache'
          },
          {
            Key: 'HighAvailability',
            Value: 'true'
          },
          {
            Key: 'Architecture',
            Value: 'Multi-AZ'
          }
        ]
      });
    });

    test('creates CloudWatch alarms for production', () => {
      const app = new App();
      const stack = new Stack(app, 'TestStack');

      const vpc = new ec2.Vpc(stack, 'TestVpc', {
        maxAzs: 2
      });

      new RedisStack(stack, 'TestRedisStack', {
        environment: 'prod',
        vpc: vpc,
        alertEmail: 'alerts@example.com'
      });

      const template = Template.fromStack(stack);

      // Check for CPU alarm
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: 'CPUUtilization',
        Threshold: 75,
        AlarmDescription: 'Redis CPU utilization is too high'
      });

      // Check for replication lag alarm (critical for Multi-AZ)
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: 'ReplicationLag',
        Threshold: 30,
        AlarmDescription: 'Redis replication lag exceeds 30 seconds'
      });

      // Check for memory alarm
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: 'DatabaseMemoryUsagePercentage',
        Threshold: 80,
        AlarmDescription: 'Redis memory utilization is too high'
      });

      // Check for connection alarm
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        MetricName: 'CurrConnections',
        Threshold: 50,
        AlarmDescription: 'Redis connection count is too high'
      });

      // Check for dashboard
      template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
        DashboardName: 'redis-prod-dashboard'
      });
    });

    test('creates SNS topics for alerts when email provided', () => {
      const app = new App();
      const stack = new Stack(app, 'TestStack');

      const vpc = new ec2.Vpc(stack, 'TestVpc', {
        maxAzs: 2
      });

      new RedisStack(stack, 'TestRedisStack', {
        environment: 'prod',
        vpc: vpc,
        alertEmail: 'alerts@example.com'
      });

      const template = Template.fromStack(stack);

      // Check for alert topic
      template.hasResourceProperties('AWS::SNS::Topic', {
        DisplayName: 'Redis Cache Alerts'
      });

      // Check for alarm topic
      template.hasResourceProperties('AWS::SNS::Topic', {
        DisplayName: 'Redis Performance Alerts'
      });

      // Check for email subscriptions
      template.resourceCountIs('AWS::SNS::Subscription', 2);
      template.hasResourceProperties('AWS::SNS::Subscription', {
        Protocol: 'email',
        Endpoint: 'alerts@example.com'
      });
    });
  });

  describe('Multi-AZ Replication Group (Staging)', () => {
    test('creates ElastiCache replication group for staging with correct settings', () => {
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

      // Check for ElastiCache Replication Group
      template.hasResourceProperties('AWS::ElastiCache::ReplicationGroup', {
        ReplicationGroupDescription: 'Redis replication group for staging feed caching',
        ReplicationGroupId: 'feed-cache-staging',
        AutomaticFailoverEnabled: true,
        MultiAZEnabled: true,
        NumCacheClusters: 2,
        SnapshotRetentionLimit: 3, // Less retention for staging
        AtRestEncryptionEnabled: false // No encryption for staging
      });

      // Check for appropriate tags
      template.hasResourceProperties('AWS::ElastiCache::ReplicationGroup', {
        Tags: Match.arrayWith([
          {
            Key: 'Environment',
            Value: 'staging'
          }
        ])
      });
    });
  });

  describe('Single Node Fallback', () => {
    test('creates single cache cluster for non-critical environment', () => {
      const app = new App();
      const stack = new Stack(app, 'TestStack');

      const vpc = new ec2.Vpc(stack, 'TestVpc', {
        maxAzs: 2
      });

      new RedisStack(stack, 'TestRedisStack', {
        environment: 'test', // Non-critical environment
        vpc: vpc
      });

      const template = Template.fromStack(stack);

      // Check for single cache cluster (not replication group)
      template.hasResourceProperties('AWS::ElastiCache::CacheCluster', {
        Engine: 'redis',
        CacheNodeType: 'cache.t3.micro',
        NumCacheNodes: 1,
        EngineVersion: '7.0',
        AZMode: 'single-az'
      });

      // Should NOT have replication group
      template.resourceCountIs('AWS::ElastiCache::ReplicationGroup', 0);

      // Should NOT have CloudWatch alarms (no Multi-AZ monitoring)
      template.resourceCountIs('AWS::CloudWatch::Alarm', 0);
    });
  });

  describe('Network Configuration', () => {
    test('configures security group with correct ingress rules', () => {
      const app = new App();
      const stack = new Stack(app, 'TestStack');

      const vpc = new ec2.Vpc(stack, 'TestVpc', {
        maxAzs: 2,
        cidr: '10.0.0.0/16'
      });

      new RedisStack(stack, 'TestRedisStack', {
        environment: 'prod',
        vpc: vpc
      });

      const template = Template.fromStack(stack);

      // Check security group ingress
      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        IpProtocol: 'tcp',
        FromPort: 6379,
        ToPort: 6379,
        CidrIp: '10.0.0.0/16'
      });
    });

    test('uses private subnets for cache subnet group', () => {
      const app = new App();
      const stack = new Stack(app, 'TestStack');

      const vpc = new ec2.Vpc(stack, 'TestVpc', {
        maxAzs: 2,
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

      new RedisStack(stack, 'TestRedisStack', {
        environment: 'prod',
        vpc: vpc
      });

      const template = Template.fromStack(stack);

      // Verify subnet group uses private subnets
      const subnetGroup = template.findResources('AWS::ElastiCache::SubnetGroup');
      expect(Object.keys(subnetGroup).length).toBe(1);
    });
  });

  describe('Availability Zone Configuration', () => {
    test('configures preferred AZs for Multi-AZ deployment', () => {
      const app = new App();
      const stack = new Stack(app, 'TestStack', {
        env: { region: 'us-east-1' }
      });

      const vpc = new ec2.Vpc(stack, 'TestVpc', {
        maxAzs: 2
      });

      new RedisStack(stack, 'TestRedisStack', {
        environment: 'prod',
        vpc: vpc
      });

      const template = Template.fromStack(stack);

      // Check that PreferredCacheClusterAZs is set
      template.hasResourceProperties('AWS::ElastiCache::ReplicationGroup', {
        PreferredCacheClusterAZs: Match.anyValue()
      });
    });
  });

  describe('Maintenance Windows', () => {
    test('sets appropriate maintenance windows', () => {
      const app = new App();
      const stack = new Stack(app, 'TestStack');

      const vpc = new ec2.Vpc(stack, 'TestVpc', {
        maxAzs: 2
      });

      new RedisStack(stack, 'TestRedisStack', {
        environment: 'prod',
        vpc: vpc
      });

      const template = Template.fromStack(stack);

      template.hasResourceProperties('AWS::ElastiCache::ReplicationGroup', {
        PreferredMaintenanceWindow: 'sun:05:00-sun:06:00',
        SnapshotWindow: '03:00-04:00'
      });
    });
  });
});