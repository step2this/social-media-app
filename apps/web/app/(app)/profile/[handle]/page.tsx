import { Metadata } from 'next';
import { logger } from '@/lib/logger';
import { getGraphQLClient } from '@/lib/graphql/client';
import { GET_PROFILE, GET_FOLLOW_STATUS } from '@/lib/graphql/queries';
import { ProfileQueryResponse } from '@/lib/graphql/types';
import ProfileHeader from '@/components/profile/ProfileHeader';
import { requireSession } from '@/lib/auth/session';

interface FollowStatusResponse {
  followStatus: {
    isFollowing: boolean;
    followersCount: number;
    followingCount: number;
  };
}

type Props = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  return {
    title: `@${handle}`,
  };
}

export default async function ProfilePage({ params }: Props) {
  const { handle } = await params;

  logger.info({ handle }, 'Profile page accessed');

  let profile = null;
  let error: string | null = null;
  let isOwnProfile = false;
  let isFollowing = false;

  try {
    // Get current user session to check if viewing own profile
    const session = await requireSession();

    // Fetch profile data
    const client = await getGraphQLClient();
    const data = await client.request<ProfileQueryResponse>(GET_PROFILE, { handle });

    if (!data.profile) {
      error = 'Profile not found';
      logger.warn({ handle }, 'Profile not found');
    } else {
      profile = data.profile;
      isOwnProfile = profile.id === session.userId;

      // Fetch follow status if viewing another user's profile
      if (!isOwnProfile) {
        try {
          const followStatusData = await client.request<FollowStatusResponse>(
            GET_FOLLOW_STATUS,
            { userId: profile.id }
          );
          isFollowing = followStatusData.followStatus.isFollowing;
          logger.info({ handle, profileId: profile.id, isOwnProfile, isFollowing }, 'Profile loaded with follow status');
        } catch (followError) {
          logger.warn({ handle, profileId: profile.id, error: followError }, 'Failed to fetch follow status');
          // Continue without follow status
        }
      } else {
        logger.info({ handle, profileId: profile.id, isOwnProfile }, 'Profile loaded (own profile)');
      }
    }
  } catch (err) {
    logger.error({ handle, error: err }, 'Failed to load profile');
    error = err instanceof Error ? err.message : 'Failed to load profile';
  }

  if (error || !profile) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Profile Not Found</h1>
        <p style={{ color: '#666' }}>
          {error || `Could not find user @${handle}`}
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#0095f6',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
          }}
        >
          Go Home
        </a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '935px', margin: '0 auto', padding: '2rem 1rem' }}>
      <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} isFollowing={isFollowing} />

      {/* Posts Grid Placeholder */}
      <div style={{ marginTop: '2rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
          }}
        >
          {profile.postsCount === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '3rem',
                color: '#666',
              }}
            >
              <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>No Posts Yet</p>
              {isOwnProfile && (
                <p>
                  <a href="/create" style={{ color: '#0095f6', textDecoration: 'none' }}>
                    Create your first post
                  </a>
                </p>
              )}
            </div>
          ) : (
            <div
              style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '3rem',
                background: '#f9f9f9',
                borderRadius: '8px',
                color: '#666',
              }}
            >
              <p>Posts grid will be implemented next</p>
              <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                {profile.postsCount} {profile.postsCount === 1 ? 'post' : 'posts'} available
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
