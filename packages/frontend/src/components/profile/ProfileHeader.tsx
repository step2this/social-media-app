import React from 'react';
import type { PublicProfile } from '@social-media-app/shared';

interface ProfileHeaderProps {
  profile: PublicProfile;
}

/**
 * Profile header component with avatar, handle, and stats
 */
export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ profile }) => {
  return (
    <div className="flex flex-col md:flex-row gap-8 items-start">
      {/* Profile Picture */}
      <div className="flex-shrink-0">
        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-gray-200">
          {profile.profilePictureThumbnailUrl ? (
            <img
              src={profile.profilePictureThumbnailUrl}
              alt={`${profile.handle}'s profile`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <svg
                className="w-16 h-16"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Profile Info */}
      <div className="flex-1">
        <div className="mb-4">
          <h1 className="text-3xl font-bold">@{profile.handle}</h1>
          {profile.fullName && (
            <p className="text-lg text-gray-600 mt-1">{profile.fullName}</p>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-6 mb-4">
          <div className="text-center">
            <div className="font-bold text-xl">{profile.postsCount}</div>
            <div className="text-gray-500 text-sm">Posts</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-xl">{profile.followersCount}</div>
            <div className="text-gray-500 text-sm">Followers</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-xl">{profile.followingCount}</div>
            <div className="text-gray-500 text-sm">Following</div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="mt-4">
            <p className="text-gray-700 whitespace-pre-wrap">{profile.bio}</p>
          </div>
        )}

        {/* Member Since */}
        <div className="mt-4 text-sm text-gray-500">
          Member since {new Date(profile.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};