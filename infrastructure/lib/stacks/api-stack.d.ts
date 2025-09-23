import { Stack, type StackProps } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
interface ApiStackProps extends StackProps {
    environment: string;
    table: dynamodb.Table;
}
export declare class ApiStack extends Stack {
    readonly apiUrl: string;
    constructor(scope: Construct, id: string, props: ApiStackProps);
}
export {};
//# sourceMappingURL=api-stack.d.ts.map