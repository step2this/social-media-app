import { Construct } from 'constructs';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';
import { Stack } from 'aws-cdk-lib';

export interface RedisStackProps {
  environment: string;
  vpc?: ec2.IVpc;
}

/**
 * Redis cache construct for feed caching
 * Uses Docker Redis for local/dev, ElastiCache for staging/prod
 */
export class RedisStack extends Construct {
  public readonly cacheCluster?: elasticache.CfnCacheCluster;
  public readonly cacheEndpoint: string;
  public readonly cachePort: number;

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

      return;
    }

    // For staging/prod, use ElastiCache Redis
    if (!props.vpc) {
      throw new Error('VPC required for ElastiCache in production');
    }

    // Create security group for Redis
    const securityGroup = new ec2.SecurityGroup(this, 'RedisSG', {
      vpc: props.vpc,
      description: 'Security group for ElastiCache Redis',
      allowAllOutbound: true
    });

    securityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
      ec2.Port.tcp(6379),
      'Allow Redis access from within VPC'
    );

    // Create subnet group
    const subnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: 'Subnet group for ElastiCache Redis',
      subnetIds: props.vpc.privateSubnets.map(subnet => subnet.subnetId),
      cacheSubnetGroupName: `redis-subnet-group-${props.environment}`
    });

    // Create ElastiCache Redis cluster
    this.cacheCluster = new elasticache.CfnCacheCluster(this, 'RedisCluster', {
      cacheNodeType: 'cache.t3.micro',
      engine: 'redis',
      numCacheNodes: 1,
      cacheSubnetGroupName: subnetGroup.ref,
      vpcSecurityGroupIds: [securityGroup.securityGroupId],
      engineVersion: '7.0',
      port: 6379,
      clusterName: `feed-cache-${props.environment}`,
      // High availability settings
      azMode: 'single-az', // Use 'cross-az' for multi-AZ
      preferredMaintenanceWindow: 'sun:05:00-sun:06:00',
      snapshotRetentionLimit: props.environment === 'prod' ? 7 : 1,
      snapshotWindow: '03:00-04:00',
      // Performance settings
      autoMinorVersionUpgrade: true,
      // Tags
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

    // Get the parent stack to add outputs
    const stack = Stack.of(this);

    // Outputs
    new cdk.CfnOutput(stack, `${id}RedisEndpoint`, {
      value: this.cacheEndpoint,
      description: 'Redis cache endpoint'
    });

    new cdk.CfnOutput(stack, `${id}RedisPort`, {
      value: this.cachePort.toString(),
      description: 'Redis cache port'
    });
  }
}