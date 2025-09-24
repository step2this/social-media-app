import { Stack, type StackProps } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
interface ApiStackProps extends StackProps {
    environment: string;
    table: dynamodb.Table;
    mediaBucket: s3.Bucket;
    cloudFrontDomain: string;
}
export declare class ApiStack extends Stack {
    readonly apiUrl: string;
    constructor(scope: Construct, id: string, props: ApiStackProps);
}
export {};
//# sourceMappingURL=api-stack.d.ts.map