import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { PostService, ProfileService } from '@social-media-app/dal';
import { PostResponseSchema } from '@social-media-app/shared';
import {
  errorResponse,
  successResponse,
  tracer,
  addTraceAnnotation,
  addTraceMetadata,
  captureTraceError,
  tracedOperation,
  traceDynamoDBOperation
} from '../../utils/index.js';
import {
  createDynamoDBClient,
  createS3Client,
  getTableName,
  getS3BucketName,
  getCloudFrontDomain
} from '../../utils/dynamodb.js';
import { z } from 'zod';

/**
 * Handler to get a single post by ID
 *
 * @description Retrieves a single post with its metadata
 * @trace Captures post retrieval operations with DynamoDB query tracing
 */
export const handler = tracer.captureLambdaHandler(async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Add trace annotations for request context
    addTraceAnnotation('operationType', 'GET_POST');
    addTraceAnnotation('requestId', event.requestContext?.requestId || 'unknown');

    // Get postId from path parameters
    const postId = event.pathParameters?.postId;

    if (!postId) {
      addTraceAnnotation('error', 'missing_post_id');
      return errorResponse(400, 'Post ID is required');
    }

    // Add post context to traces
    addTraceAnnotation('postId', postId);

    // Initialize dependencies with X-Ray instrumentation
    const dynamoClient = tracer.captureAWSv3Client(createDynamoDBClient());
    const s3Client = tracer.captureAWSv3Client(createS3Client());
    const tableName = getTableName();
    const s3BucketName = getS3BucketName();
    const cloudFrontDomain = getCloudFrontDomain();

    const profileService = new ProfileService(
      dynamoClient,
      tableName,
      s3BucketName,
      cloudFrontDomain,
      s3Client
    );

    const postService = new PostService(dynamoClient, tableName, profileService);

    // Get the post by ID
    const post = await tracedOperation('GetPost', async () => {
      traceDynamoDBOperation('GetItem', tableName, { postId });
      return await postService.getPostById(postId);
    });

    if (!post) {
      addTraceAnnotation('error', 'post_not_found');
      return errorResponse(404, 'Post not found');
    }

    // Add post metadata to traces
    addTraceMetadata('post', 'retrieved', {
      id: post.id,
      authorId: post.authorId,
      createdAt: post.createdAt
    });
    addTraceAnnotation('authorId', post.authorId);

    // Validate response
    const validatedResponse = await tracedOperation('ValidateResponse', async () => {
      return PostResponseSchema.parse({ post });
    });

    return successResponse(200, validatedResponse);
  } catch (error) {
    console.error('Error getting post:', error);

    // Capture error in X-Ray trace
    captureTraceError(error, {
      operation: 'getPost',
      postId: event.pathParameters?.postId
    });

    if (error instanceof z.ZodError) {
      addTraceAnnotation('errorType', 'validation_error');
      addTraceMetadata('error', 'validationErrors', error.errors);
      return errorResponse(400, 'Invalid response data', error.errors);
    }

    addTraceAnnotation('errorType', 'internal_server_error');
    return errorResponse(500, 'Internal server error');
  }
});