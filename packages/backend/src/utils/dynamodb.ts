// Re-export from centralized AWS configuration
export {
  createDynamoDBClient,
  getTableName,
  createS3Client,
  getS3BucketName,
  getCloudFrontDomain
} from './aws-config.js';