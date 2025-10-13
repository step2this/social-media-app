import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
interface FollowLambdasProps {
    environment: string;
    table: dynamodb.Table;
}
export declare class FollowLambdas extends Construct {
    readonly followUser: NodejsFunction;
    readonly unfollowUser: NodejsFunction;
    readonly getFollowStatus: NodejsFunction;
    readonly followCounter: NodejsFunction;
    constructor(scope: Construct, id: string, props: FollowLambdasProps);
}
export {};
//# sourceMappingURL=follow-lambdas.d.ts.map