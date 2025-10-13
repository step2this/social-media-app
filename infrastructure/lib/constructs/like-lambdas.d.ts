import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
interface LikeLambdasProps {
    environment: string;
    table: dynamodb.Table;
}
export declare class LikeLambdas extends Construct {
    readonly likePost: NodejsFunction;
    readonly unlikePost: NodejsFunction;
    readonly getLikeStatus: NodejsFunction;
    readonly likeCounter: NodejsFunction;
    constructor(scope: Construct, id: string, props: LikeLambdasProps);
}
export {};
//# sourceMappingURL=like-lambdas.d.ts.map