#!/usr/bin/env tsx

/**
 * Debug script to check refresh tokens in DynamoDB
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: 'us-east-1',
    endpoint: 'http://localhost:4566',
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test'
    }
  })
);

const tableName = 'tamafriends-local';

async function debugRefreshTokens() {
  console.log('🔍 Debugging Refresh Tokens in DynamoDB\n');

  try {
    // Scan for all REFRESH_TOKEN entities
    console.log('📊 Scanning for refresh tokens...');
    const scanResult = await dynamoClient.send(new ScanCommand({
      TableName: tableName,
      FilterExpression: 'entityType = :type',
      ExpressionAttributeValues: {
        ':type': 'REFRESH_TOKEN'
      }
    }));

    if (!scanResult.Items || scanResult.Items.length === 0) {
      console.log('❌ No refresh tokens found in database!\n');
      console.log('💡 Try registering a user first.');
      return;
    }

    console.log(`✅ Found ${scanResult.Items.length} refresh token(s)\n`);

    for (const token of scanResult.Items) {
      console.log('─'.repeat(60));
      console.log('Refresh Token Details:');
      console.log(`  PK: ${token.PK}`);
      console.log(`  SK: ${token.SK}`);
      console.log(`  GSI1PK: ${token.GSI1PK}`);
      console.log(`  GSI1SK: ${token.GSI1SK}`);
      console.log(`  Token ID: ${token.tokenId}`);
      console.log(`  Hashed Token: ${token.hashedToken?.substring(0, 20)}...`);
      console.log(`  User ID: ${token.userId}`);
      console.log(`  Expires At: ${token.expiresAt}`);
      console.log(`  Is Expired: ${new Date(token.expiresAt) < new Date()}`);

      // Test querying by token value
      console.log('\n🔎 Testing GSI1 Query...');
      const queryResult = await dynamoClient.send(new QueryCommand({
        TableName: tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :token',
        ExpressionAttributeValues: {
          ':token': `REFRESH_TOKEN#${token.hashedToken}`
        }
      }));

      console.log(`  Query Result: ${queryResult.Items?.length || 0} items found`);
      if (queryResult.Items && queryResult.Items.length > 0) {
        console.log('  ✅ Token can be queried via GSI1');
      } else {
        console.log('  ❌ Token CANNOT be queried via GSI1');
      }
    }

    console.log('\n' + '─'.repeat(60));
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugRefreshTokens().catch(console.error);
