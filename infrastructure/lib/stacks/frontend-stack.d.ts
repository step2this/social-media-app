import { Stack, type StackProps } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
interface FrontendStackProps extends StackProps {
    environment: string;
    apiUrl: string;
}
export declare class FrontendStack extends Stack {
    constructor(scope: Construct, id: string, props: FrontendStackProps);
}
export {};
//# sourceMappingURL=frontend-stack.d.ts.map