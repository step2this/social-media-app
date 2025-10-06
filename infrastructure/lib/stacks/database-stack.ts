import { Stack, type StackProps, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

interface DatabaseStackProps extends StackProps {
  environment: string;
}

export class DatabaseStack extends Stack {
  public readonly table: dynamodb.Table;
  public readonly tableName: string;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
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