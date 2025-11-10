import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import type * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import type * as kinesis from 'aws-cdk-lib/aws-kinesis';
interface LikeLambdasProps {
    environment: string;
    table: dynamodb.Table;
    kinesisStream?: kinesis.Stream;
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