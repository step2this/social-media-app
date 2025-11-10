import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import type * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import type * as s3 from 'aws-cdk-lib/aws-s3';
import type * as kinesis from 'aws-cdk-lib/aws-kinesis';
interface ProfileLambdasProps {
    environment: string;
    table: dynamodb.Table;
    mediaBucket: s3.Bucket;
    cloudFrontDomain: string;
    kinesisStream?: kinesis.Stream;
}
export declare class ProfileLambdas extends Construct {
    readonly getProfile: NodejsFunction;
    readonly updateProfile: NodejsFunction;
    readonly getUploadUrl: NodejsFunction;
    readonly createPost: NodejsFunction;
    readonly getUserPosts: NodejsFunction;
    readonly deletePost: NodejsFunction;
    readonly getFeed: NodejsFunction;
    readonly markRead: NodejsFunction;
    constructor(scope: Construct, id: string, props: ProfileLambdasProps);
}
export {};
//# sourceMappingURL=profile-lambdas.d.ts.map