import { Stack, type StackProps } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import type * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import type * as s3 from 'aws-cdk-lib/aws-s3';
import type * as kinesis from 'aws-cdk-lib/aws-kinesis';
interface ApiStackProps extends StackProps {
    environment: string;
    table: dynamodb.Table;
    mediaBucket: s3.Bucket;
    cloudFrontDomain: string;
    kinesisStream: kinesis.Stream;
}
export declare class ApiStack extends Stack {
    readonly apiUrl: string;
    constructor(scope: Construct, id: string, props: ApiStackProps);
}
export {};
//# sourceMappingURL=api-stack.d.ts.map