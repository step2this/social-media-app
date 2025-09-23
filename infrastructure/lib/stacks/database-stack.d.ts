import { Stack, type StackProps } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
interface DatabaseStackProps extends StackProps {
    environment: string;
}
export declare class DatabaseStack extends Stack {
    readonly table: dynamodb.Table;
    readonly tableName: string;
    constructor(scope: Construct, id: string, props: DatabaseStackProps);
}
export {};
//# sourceMappingURL=database-stack.d.ts.map