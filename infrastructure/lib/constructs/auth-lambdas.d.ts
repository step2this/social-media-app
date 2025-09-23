import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
interface AuthLambdasProps {
    environment: string;
    table: dynamodb.Table;
}
export declare class AuthLambdas extends Construct {
    readonly registerFunction: NodejsFunction;
    readonly loginFunction: NodejsFunction;
    readonly logoutFunction: NodejsFunction;
    readonly refreshFunction: NodejsFunction;
    readonly profileFunction: NodejsFunction;
    constructor(scope: Construct, id: string, props: AuthLambdasProps);
}
export {};
//# sourceMappingURL=auth-lambdas.d.ts.map