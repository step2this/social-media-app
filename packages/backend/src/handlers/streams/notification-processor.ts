import type { DynamoDBStreamEvent, DynamoDBStreamHandler } from 'aws-lambda';
import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { NotificationService, ProfileService } from '@social-media-app/dal';
import type { CreateNotificationRequest } from '@social-media-app/shared';
import { createDynamoDBClient, getTableName } from '../../utils/dynamodb.js';

/**
 * Type alias for DynamoDB stream record image (AttributeValue map)
 */
type StreamImage = Record<string, AttributeValue>;

/**
 * Actor information extracted from stream records
 */
interface ActorInfo {
  userId: string;
  handle: string;
  displayName?: string;
  avatarUrl?: string;
}

/**
 * Stream processor for automatically creating notifications from entity changes
 *
 * **Event-Driven Notification System:**
 * Listens to DynamoDB Streams and creates notifications when:
 * - LIKE entity is inserted → "X liked your post" to post owner
 * - COMMENT entity is inserted → "X commented on your post" to post owner
 * - COMMENT with mentions → "X mentioned you in a comment" to mentioned users
 * - FOLLOW entity is inserted → "X started following you" to followee
 *
 * **Self-Notification Prevention:**
 * Automatically prevents notifications when actor === recipient
 * (user liking own post, commenting on own post, following self)
 *
 * **Parallel Processing:**
 * Uses Promise.allSettled() to process all records concurrently with graceful error handling
 *
 * **Performance Optimizations:**
 * - Only processes INSERT events (ignores REMOVE, MODIFY)
 * - Only processes relevant entity types (LIKE, COMMENT, FOLLOW)
 * - Continues processing other records even if one fails
 * - Uses sparse GSI2 index for unread notifications via NotificationService
 *
 * @example
 * // Example stream record for LIKE:
 * {
 *   eventName: 'INSERT',
 *   dynamodb: {
 *     NewImage: {
 *       PK: { S: 'USER#liker-123' },
 *       SK: { S: 'LIKE#post-456' },
 *       entityType: { S: 'LIKE' },
 *       userId: { S: 'liker-123' },
 *       userHandle: { S: 'cooluser' },
 *       postId: { S: 'post-456' },
 *       postUserId: { S: 'post-owner-789' },
 *       postThumbnailUrl: { S: 'https://example.com/thumb.jpg' }
 *     }
 *   }
 * }
 */
export const handler: DynamoDBStreamHandler = async (
  event: DynamoDBStreamEvent
): Promise<void> => {
  const dynamoClient = createDynamoDBClient();
  const tableName = getTableName();
  const notificationService = new NotificationService(dynamoClient, tableName);
  const profileService = new ProfileService(dynamoClient, tableName);

  // Process all records in parallel using Promise.allSettled for graceful error handling
  // This ensures one failed notification doesn't block others
  const processPromises = event.Records.map(async (record) => {
    try {
      // Only process INSERT events
      if (record.eventName !== 'INSERT') {
        return;
      }

      // Get NewImage from stream record
      const image = record.dynamodb?.NewImage;
      if (!image) {
        console.warn('No NewImage in stream record:', record);
        return;
      }

      // Extract entity type
      const entityType = image.entityType?.S;
      if (!entityType) {
        return;
      }

      // Route to appropriate handler based on entity type
      switch (entityType) {
        case 'LIKE':
          await processLikeEntity(image as unknown as StreamImage, notificationService);
          break;

        case 'COMMENT':
          await processCommentEntity(image as unknown as StreamImage, notificationService, profileService);
          break;

        case 'FOLLOW':
          await processFollowEntity(image as unknown as StreamImage, notificationService);
          break;

        default:
          // Ignore other entity types (PROFILE, POST, etc.)
          break;
      }
    } catch (error) {
      // Log error but continue processing other records
      console.error('Error processing stream record:', error);
      console.error('Record:', JSON.stringify(record, null, 2));
    }
  });

  // Wait for all processing to complete
  await Promise.allSettled(processPromises);
};

/**
 * Processes LIKE entity and creates "X liked your post" notification
 *
 * **Entity Structure:**
 * - PK: USER#<likerId>
 * - SK: LIKE#<postId>
 * - userId: Actor who liked the post
 * - userHandle: Actor's handle
 * - postId: ID of the liked post
 * - postUserId: Post owner (notification recipient)
 * - postThumbnailUrl: Optional thumbnail for notification
 *
 * **Notification Details:**
 * - type: 'like'
 * - title: 'New like'
 * - message: '<handle> liked your post'
 * - priority: 'normal'
 * - actor: User who liked the post
 * - target: Post that was liked
 *
 * @param image - DynamoDB stream image (AttributeValue format)
 * @param notificationService - NotificationService instance
 */
const processLikeEntity = async (
  image: StreamImage,
  notificationService: NotificationService
): Promise<void> => {
  // Extract actor information
  const actor = extractActorInfo(image, 'user');
  if (!actor) {
    console.warn('Missing actor fields in LIKE entity');
    return;
  }

  // Extract post information
  const postId = image.postId?.S;
  const postUserId = image.postUserId?.S;

  if (!postId || !postUserId) {
    console.warn('Missing post fields in LIKE entity:', { postId, postUserId });
    return;
  }

  // Prevent self-notification (user liking own post)
  if (actor.userId === postUserId) {
    return;
  }

  // Build notification input
  const notificationInput: CreateNotificationRequest = {
    userId: postUserId,
    type: 'like',
    title: 'New like',
    message: `${actor.handle} liked your post`,
    priority: 'normal',
    actor: buildActorObject(actor),
    target: {
      type: 'post',
      id: postId
    },
    ...(image.postThumbnailUrl?.S && {
      metadata: {
        thumbnailUrl: image.postThumbnailUrl.S
      }
    })
  };

  // Create notification with consistent error handling
  await createNotificationWithLogging(
    notificationService,
    notificationInput,
    `post ${postId} by ${actor.handle}`
  );
};

/**
 * Processes COMMENT entity and creates notifications:
 * 1. "X commented on your post" to post owner
 * 2. "X mentioned you in a comment" to each mentioned user
 *
 * **Entity Structure:**
 * - PK: POST#<postId>
 * - SK: COMMENT#<timestamp>#<commentId>
 * - userId: Actor who commented
 * - userHandle: Actor's handle
 * - postId: ID of the post
 * - postUserId: Post owner (notification recipient)
 * - content: Comment text (used for preview and mention detection)
 * - mentionedUserIds: Array of user IDs mentioned in comment
 *
 * **Notification Details (Comment):**
 * - type: 'comment'
 * - title: 'New comment'
 * - message: '<handle> commented on your post'
 * - target.preview: First 100 chars of comment
 *
 * **Notification Details (Mention):**
 * - type: 'mention'
 * - title: 'New mention'
 * - message: '<handle> mentioned you in a comment'
 * - target.preview: First 100 chars of comment
 *
 * @param image - DynamoDB stream image (AttributeValue format)
 * @param notificationService - NotificationService instance
 * @param profileService - ProfileService instance for resolving @handles
 */
const processCommentEntity = async (
  image: StreamImage,
  notificationService: NotificationService,
  profileService: ProfileService
): Promise<void> => {
  // Extract actor information
  const actor = extractActorInfo(image, 'user');
  if (!actor) {
    console.warn('Missing actor fields in COMMENT entity');
    return;
  }

  // Extract post and content information
  const postId = image.postId?.S;
  const postUserId = image.postUserId?.S;
  const content = image.content?.S;

  if (!postId || !postUserId || !content) {
    console.warn('Missing required fields in COMMENT entity:', {
      postId,
      postUserId,
      hasContent: !!content
    });
    return;
  }

  // Build common notification components
  const preview = content.length > 100 ? content.substring(0, 100) : content;
  const actorObject = buildActorObject(actor);
  const targetObject = {
    type: 'post' as const,
    id: postId,
    preview
  };
  const metadata = image.postThumbnailUrl?.S
    ? { thumbnailUrl: image.postThumbnailUrl.S }
    : undefined;

  // Create notifications in parallel
  const notificationPromises: Promise<void>[] = [];

  // 1. Create comment notification to post owner (if not self-comment)
  if (actor.userId !== postUserId) {
    const commentNotification: CreateNotificationRequest = {
      userId: postUserId,
      type: 'comment',
      title: 'New comment',
      message: `${actor.handle} commented on your post`,
      priority: 'normal',
      actor: actorObject,
      target: targetObject,
      ...(metadata && { metadata })
    };

    notificationPromises.push(
      createNotificationWithLogging(
        notificationService,
        commentNotification,
        `post ${postId} by ${actor.handle}`
      )
    );
  }

  // 2. Create mention notifications
  const mentionedUserIds = await resolveMentionedUsers(image, content, profileService);

  for (const mentionedUserId of mentionedUserIds) {
    // Skip self-mentions
    if (mentionedUserId === actor.userId) {
      continue;
    }

    const mentionNotification: CreateNotificationRequest = {
      userId: mentionedUserId,
      type: 'mention',
      title: 'New mention',
      message: `${actor.handle} mentioned you in a comment`,
      priority: 'normal',
      actor: actorObject,
      target: targetObject,
      ...(metadata && { metadata })
    };

    notificationPromises.push(
      createNotificationWithLogging(
        notificationService,
        mentionNotification,
        `user ${mentionedUserId} by ${actor.handle}`
      )
    );
  }

  // Wait for all notifications to complete (graceful error handling per notification)
  await Promise.allSettled(notificationPromises);
};

/**
 * Processes FOLLOW entity and creates "X started following you" notification
 *
 * **Entity Structure:**
 * - PK: USER#<followerId>
 * - SK: FOLLOW#<followeeId>
 * - GSI2PK: USER#<followeeId>
 * - GSI2SK: FOLLOWER#<followerId>
 * - followerId: Actor who followed
 * - followerHandle: Actor's handle
 * - followeeId: Followee (notification recipient)
 *
 * **Notification Details:**
 * - type: 'follow'
 * - title: 'New follower'
 * - message: '<handle> started following you'
 * - priority: 'normal'
 * - actor: User who followed
 * - target: User entity (followee)
 *
 * @param image - DynamoDB stream image (AttributeValue format)
 * @param notificationService - NotificationService instance
 */
const processFollowEntity = async (
  image: StreamImage,
  notificationService: NotificationService
): Promise<void> => {
  // Extract actor information (follower)
  const actor = extractActorInfo(image, 'follower');
  if (!actor) {
    console.warn('Missing actor fields in FOLLOW entity');
    return;
  }

  // Extract followee information
  const followeeId = image.followeeId?.S;

  if (!followeeId) {
    console.warn('Missing followeeId in FOLLOW entity');
    return;
  }

  // Prevent self-notification (user following self)
  if (actor.userId === followeeId) {
    return;
  }

  // Build notification input
  const notificationInput: CreateNotificationRequest = {
    userId: followeeId,
    type: 'follow',
    title: 'New follower',
    message: `${actor.handle} started following you`,
    priority: 'normal',
    actor: buildActorObject(actor),
    target: {
      type: 'user',
      id: followeeId
    }
  };

  // Create notification with consistent error handling
  await createNotificationWithLogging(
    notificationService,
    notificationInput,
    `user ${followeeId} by ${actor.handle}`
  );
};

/**
 * Extracts actor information from stream image
 *
 * **Common Pattern:**
 * Multiple entity types (LIKE, COMMENT, FOLLOW) embed actor information
 * using slightly different field names. This helper normalizes extraction.
 *
 * **Field Mapping:**
 * - LIKE: userId, userHandle, displayName, avatarUrl
 * - COMMENT: userId, userHandle, displayName, avatarUrl
 * - FOLLOW: followerId, followerHandle, followerDisplayName, followerAvatarUrl
 *
 * @param image - DynamoDB stream image
 * @param prefix - Field name prefix ('user' or 'follower')
 * @returns Actor information or null if required fields missing
 *
 * @example
 * // Extract from LIKE or COMMENT entity:
 * const actor = extractActorInfo(image, 'user');
 *
 * // Extract from FOLLOW entity:
 * const actor = extractActorInfo(image, 'follower');
 */
const extractActorInfo = (
  image: StreamImage,
  prefix: 'user' | 'follower'
): ActorInfo | null => {
  const userIdField = prefix === 'user' ? 'userId' : 'followerId';
  const handleField = prefix === 'user' ? 'userHandle' : 'followerHandle';
  const displayNameField = prefix === 'user' ? 'displayName' : 'followerDisplayName';
  const avatarUrlField = prefix === 'user' ? 'avatarUrl' : 'followerAvatarUrl';

  const userId = image[userIdField]?.S;
  const handle = image[handleField]?.S;

  if (!userId || !handle) {
    return null;
  }

  return {
    userId,
    handle,
    ...(image[displayNameField]?.S && { displayName: image[displayNameField].S }),
    ...(image[avatarUrlField]?.S && { avatarUrl: image[avatarUrlField].S })
  };
};

/**
 * Builds actor object for notification creation
 *
 * **Consistent Structure:**
 * All notifications use the same actor format with optional fields
 * conditionally included only when present.
 *
 * @param actorInfo - Extracted actor information
 * @returns Formatted actor object for NotificationInput
 */
const buildActorObject = (actorInfo: ActorInfo) => ({
  userId: actorInfo.userId,
  handle: actorInfo.handle,
  ...(actorInfo.displayName && { displayName: actorInfo.displayName }),
  ...(actorInfo.avatarUrl && { avatarUrl: actorInfo.avatarUrl })
});

/**
 * Creates notification with consistent error handling
 *
 * **Error Handling Pattern:**
 * - Logs success with entity context
 * - Logs errors without throwing (graceful degradation)
 * - Returns void Promise for use in Promise.allSettled arrays
 *
 * @param notificationService - NotificationService instance
 * @param input - Notification input data
 * @param context - Logging context (entity type, IDs)
 * @returns Promise that resolves after notification creation
 */
const createNotificationWithLogging = async (
  notificationService: NotificationService,
  input: CreateNotificationRequest,
  context: string
): Promise<void> => {
  try {
    await notificationService.createNotification(input);
    console.log(`Created ${input.type.toUpperCase()} notification: ${context}`);
  } catch (error) {
    console.error(`Failed to create ${input.type.toUpperCase()} notification:`, error);
    console.error('Context:', context);
  }
};

/**
 * Resolves mentioned users from comment content and stream image
 *
 * **Resolution Strategy:**
 * 1. First check if mentionedUserIds are already in the stream image (pre-resolved)
 * 2. If not, extract @handles from content and resolve via ProfileService
 * 3. Return unique list of mentioned user IDs
 *
 * **Use Cases:**
 * - CommentService pre-resolves mentions → use mentionedUserIds field
 * - Legacy comments or fallback → parse @handles from content
 *
 * @param image - DynamoDB stream image
 * @param content - Comment text content
 * @param profileService - ProfileService instance for handle resolution
 * @returns Array of unique mentioned user IDs
 */
const resolveMentionedUsers = async (
  image: StreamImage,
  content: string,
  profileService: ProfileService
): Promise<string[]> => {
  // Try to extract mentionedUserIds from DynamoDB list format first
  let mentionedUserIds = extractMentionedUserIds(image);

  // If no mentionedUserIds provided, parse @handles from content and resolve them
  if (mentionedUserIds.length === 0) {
    const mentionedHandles = extractMentionedHandles(content);
    if (mentionedHandles.length > 0) {
      mentionedUserIds = await resolveMentionedHandles(mentionedHandles, profileService);
    }
  }

  return mentionedUserIds;
};

/**
 * Extracts mentioned user IDs from DynamoDB list format
 *
 * **DynamoDB List Format:**
 * ```
 * mentionedUserIds: {
 *   L: [
 *     { S: 'user-1' },
 *     { S: 'user-2' },
 *     { S: 'user-3' }
 *   ]
 * }
 * ```
 *
 * @param image - DynamoDB stream image
 * @returns Array of mentioned user IDs (empty array if none)
 */
const extractMentionedUserIds = (image: StreamImage): string[] => {
  // Check if mentionedUserIds field exists
  const mentionedList = image.mentionedUserIds?.L;
  if (!mentionedList || !Array.isArray(mentionedList)) {
    return [];
  }

  // Extract string values from DynamoDB list, filter out undefined
  return mentionedList
    .map(item => item.S)
    .filter((userId): userId is string => userId !== undefined);
};

/**
 * Extracts @handles from comment content using regex
 *
 * **Mention Pattern:**
 * - Matches @followed by word characters (letters, digits, underscore)
 * - Example: "@john_doe" → "john_doe"
 *
 * **Deduplication:**
 * Returns unique handles only (removes duplicates)
 *
 * @param content - Comment text content
 * @returns Array of unique mentioned handles (without @ symbol)
 *
 * @example
 * extractMentionedHandles("Hey @john and @jane, check this @john!")
 * // Returns: ["john", "jane"]
 */
const extractMentionedHandles = (content: string): string[] => {
  const mentionRegex = /@(\w+)/g;
  const matches = content.matchAll(mentionRegex);

  // Extract handles and deduplicate
  const handles = new Set<string>();
  for (const match of matches) {
    if (match[1]) {
      handles.add(match[1]);
    }
  }

  return Array.from(handles);
};

/**
 * Resolves @handles to user IDs using ProfileService
 *
 * **Process:**
 * 1. Query ProfileService.getProfileByHandle() for each handle
 * 2. Extract userId from returned profile
 * 3. Skip handles that don't resolve to valid profiles
 *
 * **Error Handling:**
 * - Invalid handles are silently skipped
 * - Profile lookup errors are logged but don't stop processing
 *
 * @param handles - Array of user handles (without @ symbol)
 * @param profileService - ProfileService instance
 * @returns Array of resolved user IDs
 *
 * @example
 * await resolveMentionedHandles(["john_doe", "jane_smith"], profileService)
 * // Returns: ["user-123", "user-456"] (if both handles resolve)
 */
const resolveMentionedHandles = async (
  handles: string[],
  profileService: ProfileService
): Promise<string[]> => {
  const userIds: string[] = [];

  // Resolve each handle to userId
  for (const handle of handles) {
    try {
      const profile = await profileService.getProfileByHandle(handle);
      if (profile?.id) {
        userIds.push(profile.id);
      }
    } catch (error) {
      // Log error but continue processing other handles
      console.error(`Failed to resolve handle @${handle}:`, error);
    }
  }

  return userIds;
};
