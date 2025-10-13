import { Stack, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
export class DatabaseStack extends Stack {
    table;
    tableName;
    constructor(scope, id, props) {
        super(scope, id, props);
        // Create DynamoDB table with single-table design
        this.table = new dynamodb.Table(this, 'AppTable', {
            tableName: `social-media-app-${props.environment}`,
            partitionKey: {
                name: 'PK',
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: 'SK',
                type: dynamodb.AttributeType.STRING
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: props.environment === 'prod'
                ? RemovalPolicy.RETAIN
                : RemovalPolicy.DESTROY,
            pointInTimeRecovery: props.environment === 'prod',
            encryption: dynamodb.TableEncryption.DEFAULT,
            stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
        });
        // Add Global Secondary Index for email lookups
        this.table.addGlobalSecondaryIndex({
            indexName: 'GSI1',
            partitionKey: {
                name: 'GSI1PK',
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: 'GSI1SK',
                type: dynamodb.AttributeType.STRING
            },
            projectionType: dynamodb.ProjectionType.ALL
        });
        // Add Global Secondary Index for username lookups
        this.table.addGlobalSecondaryIndex({
            indexName: 'GSI2',
            partitionKey: {
                name: 'GSI2PK',
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: 'GSI2SK',
                type: dynamodb.AttributeType.STRING
            },
            projectionType: dynamodb.ProjectionType.ALL
        });
        // Add Global Secondary Index for handle lookups
        this.table.addGlobalSecondaryIndex({
            indexName: 'GSI3',
            partitionKey: {
                name: 'GSI3PK',
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: 'GSI3SK',
                type: dynamodb.AttributeType.STRING
            },
            projectionType: dynamodb.ProjectionType.ALL
        });
        // Add Global Secondary Index for efficient user post queries
        // GSI4 optimizes post deletion operations by allowing direct queries
        // instead of expensive table scans. This reduces cost from $13 to $0.13
        // per delete operation (99% cost reduction).
        // Pattern: GSI4PK=USER#userId, GSI4SK=POST#timestamp#postId
        this.table.addGlobalSecondaryIndex({
            indexName: 'GSI4',
            partitionKey: {
                name: 'GSI4PK',
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: 'GSI4SK',
                type: dynamodb.AttributeType.STRING
            },
            projectionType: dynamodb.ProjectionType.ALL
        });
        this.tableName = this.table.tableName;
        // Output the table name
        new CfnOutput(this, 'TableName', {
            value: this.tableName,
            description: 'DynamoDB table name'
        });
        new CfnOutput(this, 'TableArn', {
            value: this.table.tableArn,
            description: 'DynamoDB table ARN'
        });
    }
}
//# sourceMappingURL=database-stack.js.map