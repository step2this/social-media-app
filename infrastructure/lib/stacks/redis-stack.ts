import { Construct } from 'constructs';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cdk from 'aws-cdk-lib';
import { Stack } from 'aws-cdk-lib';

export interface RedisStackProps {
  environment: string;
  vpc?: ec2.IVpc;
  alertEmail?: string;
}

/**
 * Redis cache construct for feed caching with Multi-AZ High Availability
 *
 * Architecture:
 * - Local/Dev: Single Redis container (cost-optimized for development)
 * - Staging/Prod: Multi-AZ ElastiCache Replication Group with automatic failover
 *
 * High Availability Features:
 * - Multi-AZ deployment across 2 availability zones
 * - Automatic failover with < 60 seconds RTO
 * - Read replicas for load distribution
 * - Replication lag monitoring with CloudWatch alarms
 * - Automated snapshots with retention policy
 *
 * Cost Implications:
 * - Single node (old): ~$13/month (cache.t3.micro)
 * - Multi-AZ (new): ~$26/month (2x cache.t3.micro)
 * - Additional costs: Snapshots (~$0.085/GB), Cross-AZ transfer (~$0.02/GB)
 * - Total estimated increase: ~$50/month for production resilience
 */
export class RedisStack extends Construct {
  public readonly replicationGroup?: elasticache.CfnReplicationGroup;
  public readonly cacheCluster?: elasticache.CfnCacheCluster;
  public readonly cacheEndpoint: string;
  public readonly cachePort: number;
  public readonly isPrimary: boolean = true;

  constructor(scope: Construct, id: string, props: RedisStackProps) {
    super(scope, id);

    // For local/dev, use standalone Redis container
    if (props.environment === 'local' || props.environment === 'dev') {
      this.cacheEndpoint = process.env.REDIS_ENDPOINT || 'localhost';
      this.cachePort = 6379;

      // Get the parent stack to add outputs
      const stack = Stack.of(this);

      new cdk.CfnOutput(stack, `${id}RedisEndpoint`, {
        value: this.cacheEndpoint,
        description: 'Redis cache endpoint (LocalStack/dev uses Docker)'
      });

      new cdk.CfnOutput(stack, `${id}RedisPort`, {
        value: this.cachePort.toString(),
        description: 'Redis cache port'
      });

      return;
    }

    // For staging/prod, use ElastiCache with Multi-AZ replication
    if (!props.vpc) {
      throw new Error('VPC required for ElastiCache in production');
    }

    // Create security group for Redis
    const securityGroup = new ec2.SecurityGroup(this, 'RedisSG', {
      vpc: props.vpc,
      description: 'Security group for ElastiCache Redis Replication Group',
      allowAllOutbound: true
    });

    securityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(6379),
      'Allow Redis access from within VPC'
    );

    // Create subnet group for Multi-AZ deployment
    const subnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: 'Subnet group for ElastiCache Redis Multi-AZ deployment',
      subnetIds: props.vpc.privateSubnets.map(subnet => subnet.subnetId),
      cacheSubnetGroupName: `redis-subnet-group-${props.environment}`
    });

    // Determine if we should use Multi-AZ based on environment
    const useMultiAz = props.environment === 'prod' || props.environment === 'staging';

    if (useMultiAz) {
      // Create ElastiCache Replication Group for Multi-AZ deployment
      this.replicationGroup = new elasticache.CfnReplicationGroup(this, 'RedisReplicationGroup', {
        replicationGroupDescription: `Redis replication group for ${props.environment} feed caching`,
        replicationGroupId: `feed-cache-${props.environment}`,

        // Multi-AZ configuration
        automaticFailoverEnabled: true,
        multiAzEnabled: true,
        numCacheClusters: 2, // Primary + 1 replica

        // Node configuration
        cacheNodeType: 'cache.t3.micro',
        engine: 'redis',
        engineVersion: '7.0',
        port: 6379,

        // Network configuration
        cacheSubnetGroupName: subnetGroup.ref,
        securityGroupIds: [securityGroup.securityGroupId],

        // Availability zones configuration
        preferredCacheClusterAZs: [
          props.vpc.availabilityZones[0],
          props.vpc.availabilityZones[1]
        ],

        // Maintenance and backup configuration
        preferredMaintenanceWindow: 'sun:05:00-sun:06:00',
        snapshotRetentionLimit: props.environment === 'prod' ? 7 : 3,
        snapshotWindow: '03:00-04:00',

        // Performance and monitoring
        atRestEncryptionEnabled: props.environment === 'prod',
        transitEncryptionEnabled: false, // Set to true if TLS is required
        autoMinorVersionUpgrade: true,
        // Log delivery configuration (disabled for now - requires CloudWatch log group setup)
        // logDeliveryConfigurations: props.environment === 'prod' ? [
        //   {
        //     destinationType: 'cloudwatch-logs',
        //     destinationDetails: {
        //       cloudWatchLogsDetails: {
        //         logGroup: 'redis-logs'
        //       }
        //     },
        //     logFormat: 'json',
        //     logType: 'slow-log'
        //   }
        // ] : undefined,

        // Notifications for failover events
        notificationTopicArn: this.createAlertTopic(props.alertEmail),

        // Tags
        tags: [
          {
            key: 'Environment',
            value: props.environment
          },
          {
            key: 'Service',
            value: 'FeedCache'
          },
          {
            key: 'HighAvailability',
            value: 'true'
          },
          {
            key: 'Architecture',
            value: 'Multi-AZ'
          }
        ]
      });

      // Use the replication group's primary endpoint
      this.cacheEndpoint = this.replicationGroup.attrPrimaryEndPointAddress;
      this.cachePort = 6379;

      // Create CloudWatch alarms for monitoring
      this.createCloudWatchAlarms(props);

    } else {
      // Fallback to single node for non-critical environments
      this.cacheCluster = new elasticache.CfnCacheCluster(this, 'RedisCluster', {
        cacheNodeType: 'cache.t3.micro',
        engine: 'redis',
        numCacheNodes: 1,
        cacheSubnetGroupName: subnetGroup.ref,
        vpcSecurityGroupIds: [securityGroup.securityGroupId],
        engineVersion: '7.0',
        port: 6379,
        clusterName: `feed-cache-${props.environment}`,
        azMode: 'single-az',
        preferredMaintenanceWindow: 'sun:05:00-sun:06:00',
        snapshotRetentionLimit: 1,
        snapshotWindow: '03:00-04:00',
        autoMinorVersionUpgrade: true,
        tags: [
          {
            key: 'Environment',
            value: props.environment
          },
          {
            key: 'Service',
            value: 'FeedCache'
          }
        ]
      });

      this.cacheEndpoint = this.cacheCluster.attrRedisEndpointAddress;
      this.cachePort = 6379;
    }

    // Get the parent stack to add outputs
    const stack = Stack.of(this);

    // Outputs
    new cdk.CfnOutput(stack, `${id}RedisEndpoint`, {
      value: this.cacheEndpoint,
      description: useMultiAz
        ? 'Redis primary endpoint (Multi-AZ with automatic failover)'
        : 'Redis cache endpoint'
    });

    new cdk.CfnOutput(stack, `${id}RedisPort`, {
      value: this.cachePort.toString(),
      description: 'Redis cache port'
    });

    if (useMultiAz && this.replicationGroup) {
      new cdk.CfnOutput(stack, `${id}RedisReaderEndpoint`, {
        value: this.replicationGroup.attrReaderEndPointAddress,
        description: 'Redis reader endpoint for load distribution'
      });

      new cdk.CfnOutput(stack, `${id}RedisConfiguration`, {
        value: JSON.stringify({
          mode: 'Multi-AZ',
          numNodes: 2,
          automaticFailover: true,
          expectedRTO: '< 60 seconds',
          expectedRPO: '< 1 second'
        }),
        description: 'Redis High Availability configuration'
      });
    }
  }

  /**
   * Create SNS topic for alerting
   */
  private createAlertTopic(alertEmail?: string): string | undefined {
    if (!alertEmail) {
      return undefined;
    }

    const stack = Stack.of(this);
    const alertTopic = new sns.Topic(this, 'RedisAlertTopic', {
      displayName: 'Redis Cache Alerts',
      topicName: `redis-alerts-${stack.stackName}`
    });

    new sns.Subscription(this, 'EmailSubscription', {
      protocol: sns.SubscriptionProtocol.EMAIL,
      topic: alertTopic,
      endpoint: alertEmail
    });

    return alertTopic.topicArn;
  }

  /**
   * Create CloudWatch alarms for monitoring Redis health
   */
  private createCloudWatchAlarms(props: RedisStackProps): void {
    if (!this.replicationGroup) {
      return;
    }

    const stack = Stack.of(this);

    // Create SNS topic for alarms if email provided
    let alarmTopic: sns.Topic | undefined;
    if (props.alertEmail) {
      alarmTopic = new sns.Topic(this, 'RedisAlarmTopic', {
        displayName: 'Redis Performance Alerts',
        topicName: `redis-alarms-${stack.stackName}`
      });

      new sns.Subscription(this, 'AlarmEmailSubscription', {
        protocol: sns.SubscriptionProtocol.EMAIL,
        topic: alarmTopic,
        endpoint: props.alertEmail
      });
    }

    // Alarm for high CPU utilization
    const cpuAlarm = new cloudwatch.Alarm(this, 'RedisCPUAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'CPUUtilization',
        dimensionsMap: {
          CacheClusterId: this.replicationGroup.ref
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 75,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
      alarmDescription: 'Redis CPU utilization is too high'
    });

    // Alarm for replication lag (critical for Multi-AZ)
    const replicationLagAlarm = new cloudwatch.Alarm(this, 'RedisReplicationLagAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'ReplicationLag',
        dimensionsMap: {
          ReplicationGroupId: this.replicationGroup.ref
        },
        statistic: 'Maximum',
        period: cdk.Duration.minutes(1)
      }),
      threshold: 30, // 30 seconds lag
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Redis replication lag exceeds 30 seconds'
    });

    // Alarm for memory utilization
    const memoryAlarm = new cloudwatch.Alarm(this, 'RedisMemoryAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'DatabaseMemoryUsagePercentage',
        dimensionsMap: {
          CacheClusterId: this.replicationGroup.ref
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 80,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
      alarmDescription: 'Redis memory utilization is too high'
    });

    // Alarm for connection count
    const connectionAlarm = new cloudwatch.Alarm(this, 'RedisConnectionAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ElastiCache',
        metricName: 'CurrConnections',
        dimensionsMap: {
          CacheClusterId: this.replicationGroup.ref
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5)
      }),
      threshold: 50, // Adjust based on expected load
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Redis connection count is too high'
    });

    // Add alarm actions if SNS topic is available
    if (alarmTopic) {
      const alarmAction = new cloudwatch_actions.SnsAction(alarmTopic);
      cpuAlarm.addAlarmAction(alarmAction);
      replicationLagAlarm.addAlarmAction(alarmAction);
      memoryAlarm.addAlarmAction(alarmAction);
      connectionAlarm.addAlarmAction(alarmAction);
    }

    // Add dashboard for monitoring
    const dashboard = new cloudwatch.Dashboard(this, 'RedisDashboard', {
      dashboardName: `redis-${props.environment}-dashboard`,
      defaultInterval: cdk.Duration.hours(1)
    });

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Redis CPU Utilization',
        left: [cpuAlarm.metric],
        width: 12
      }),
      new cloudwatch.GraphWidget({
        title: 'Redis Replication Lag',
        left: [replicationLagAlarm.metric],
        width: 12
      }),
      new cloudwatch.GraphWidget({
        title: 'Redis Memory Usage',
        left: [memoryAlarm.metric],
        width: 12
      }),
      new cloudwatch.GraphWidget({
        title: 'Redis Connections',
        left: [connectionAlarm.metric],
        width: 12
      })
    );
  }
}