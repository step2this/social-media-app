import { Construct } from 'constructs';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
export interface RedisStackProps {
    environment: string;
    vpc?: ec2.IVpc;
}
/**
 * Redis cache construct for feed caching
 * Uses Docker Redis for local/dev, ElastiCache for staging/prod
 */
export declare class RedisStack extends Construct {
    readonly cacheCluster?: elasticache.CfnCacheCluster;
    readonly cacheEndpoint: string;
    readonly cachePort: number;
    constructor(scope: Construct, id: string, props: RedisStackProps);
}
//# sourceMappingURL=redis-stack.d.ts.map