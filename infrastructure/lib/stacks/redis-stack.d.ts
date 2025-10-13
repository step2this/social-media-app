import { Construct } from 'constructs';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
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
export declare class RedisStack extends Construct {
    readonly replicationGroup?: elasticache.CfnReplicationGroup;
    readonly cacheCluster?: elasticache.CfnCacheCluster;
    readonly cacheEndpoint: string;
    readonly cachePort: number;
    readonly isPrimary: boolean;
    constructor(scope: Construct, id: string, props: RedisStackProps);
    /**
     * Create SNS topic for alerting
     */
    private createAlertTopic;
    /**
     * Create CloudWatch alarms for monitoring Redis health
     */
    private createCloudWatchAlarms;
}
//# sourceMappingURL=redis-stack.d.ts.map