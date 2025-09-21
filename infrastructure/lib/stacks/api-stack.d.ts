import { Stack, type StackProps } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
interface ApiStackProps extends StackProps {
    environment: string;
}
export declare class ApiStack extends Stack {
    readonly apiUrl: string;
    constructor(scope: Construct, id: string, props: ApiStackProps);
}
export {};
//# sourceMappingURL=api-stack.d.ts.map