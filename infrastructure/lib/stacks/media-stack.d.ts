import { Stack, type StackProps } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
interface MediaStackProps extends StackProps {
    environment: string;
}
export declare class MediaStack extends Stack {
    readonly mediaBucket: s3.Bucket;
    readonly mediaDistribution: cloudfront.Distribution;
    readonly bucketName: string;
    readonly distributionDomainName: string;
    constructor(scope: Construct, id: string, props: MediaStackProps);
}
export {};
//# sourceMappingURL=media-stack.d.ts.map