/**
 * Comment Service-Specific Test Helpers
 *
 * Re-exports generalized helpers and provides Comment-specific type definitions.
 * For helper implementations, see serviceTestHelpers.ts
 */

// Re-export all generalized helpers
export {
    expectServiceError,
    expectServiceSuccess,
    expectMutationCalledWith,
    expectQueryCalledWith,
    errorScenarios,
} from './serviceTestHelpers';

/**
 * Type definitions for Comment service mock client generic calls
 */
export interface CreateCommentVariables {
    input: {
        postId: string;
        content: string;
    };
}

export interface GetCommentsVariables {
    postId: string;
    limit: number;
    cursor?: string;
}

export interface DeleteCommentVariables {
    commentId: string;
}
