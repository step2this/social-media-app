import React from 'react';
import type { PublicProfile, UserProfile } from '@social-media-app/shared';

interface ProfileDisplayProps {
  profile: PublicProfile | UserProfile;
  showEditButton?: boolean;
  onEditClick?: () => void;
  className?: string;
}

/**
 * Shared profile display component for both public and private profiles
 */
export const ProfileDisplay: React.FC<ProfileDisplayProps> = ({
  profile,
  showEditButton = false,
  onEditClick,
  className = ""
}) => {
  return (
    <div className={`flex flex-col md:flex-row gap-8 items-start ${className}`}>
      {/* Profile Picture */}
      <div className="flex-shrink-0">
        <div
          className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-gray-200"
          data-testid="profile-avatar"
        >
          {profile.profilePictureThumbnailUrl ? (
            <img
              src={profile.profilePictureThumbnailUrl}
              alt="Profile picture"
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
          <h2 className="text-2xl font-bold">
            @{'handle' in profile ? profile.handle : profile.username}
          </h2>
          {profile.fullName && (
            <p className="text-lg text-gray-600 mt-1">{profile.fullName}</p>
          )}
        </div>

        {/* Stats (for public profiles) */}
        {'postsCount' in profile && (
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
        )}

        {/* Bio */}
        {profile.bio && (
          <div className="mb-4">
            <p className="text-gray-700 whitespace-pre-wrap">{profile.bio}</p>
          </div>
        )}

        {/* Member Since (for public profiles) */}
        {'createdAt' in profile && (
          <div className="mb-4 text-sm text-gray-500">
            Member since {new Date(profile.createdAt).toLocaleDateString()}
          </div>
        )}

        {/* Edit Button */}
        {showEditButton && onEditClick && (
          <button
            onClick={onEditClick}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Edit Profile
          </button>
        )}
      </div>
    </div>
  );
};