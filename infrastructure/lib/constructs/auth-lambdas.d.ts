import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
interface AuthLambdasProps {
    environment: string;
    table: dynamodb.Table;
}
export declare class AuthLambdas extends Construct {
    readonly registerFunction: lambda.Function;
    readonly loginFunction: lambda.Function;
    readonly logoutFunction: lambda.Function;
    readonly refreshFunction: lambda.Function;
    readonly profileFunction: lambda.Function;
    constructor(scope: Construct, id: string, props: AuthLambdasProps);
}
export {};
//# sourceMappingURL=auth-lambdas.d.ts.map