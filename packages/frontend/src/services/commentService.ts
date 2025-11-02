/**
 * Temporary stub for commentService
 * TODO: Migrate CommentList to Relay and remove this stub
 */

export const commentService = {
  getComments: async (_postId: string) => {
    console.warn('commentService.getComments is deprecated. Migrate to Relay.');
    return {
      success: false,
      error: { message: 'Comment service is deprecated. Please use Relay.' }
    };
  }
};
