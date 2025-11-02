/**
 * Temporary stub for profileService
 * TODO: Migrate ProfileHoverCard to Relay and remove this stub
 */

export const profileService = {
  getProfile: async (_userId: string) => {
    console.warn('profileService.getProfile is deprecated. Migrate to Relay.');
    return {
      success: false,
      error: { message: 'Profile service is deprecated. Please use Relay.' }
    };
  }
};
