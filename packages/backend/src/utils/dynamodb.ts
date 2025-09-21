import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * Create DynamoDB document client
 */
export const createDynamoDBClient = (): DynamoDBDocumentClient => {
  const region = process.env.AWS_REGION || 'us-east-1';

  const client = new DynamoDBClient({
    region,
    // Additional configuration can be added here for local development
    ...(process.env.DYNAMODB_ENDPOINT && {
      endpoint: process.env.DYNAMODB_ENDPOINT
    })
  });

  return DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      removeUndefinedValues: true,
      convertEmptyValues: false
    },
    unmarshallOptions: {
      wrapNumbers: false
    }
  });
};

/**
 * Get table name from environment
 */
export const getTableName = (): string => {
  const tableName = process.env.TABLE_NAME;
  if (!tableName) {
    throw new Error('TABLE_NAME environment variable is required');
  }
  return tableName;
};