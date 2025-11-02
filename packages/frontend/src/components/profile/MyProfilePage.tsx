import React, { useState, Suspense } from 'react';
import { useLazyLoadQuery, useMutation, graphql } from 'react-relay';
import type { MyProfilePageRelayQuery } from './__generated__/MyProfilePageRelayQuery.graphql';
import type { MyProfilePageRelayMutation } from './__generated__/MyProfilePageRelayMutation.graphql';
import { ProfileDisplay } from './ProfileDisplay';
import { LoadingSpinner, ErrorState } from '../common/LoadingStates';
import { ProfileLayout } from '../layout/AppLayout';
import {
  validateProfileForm,
  initializeProfileFormData,
  clearValidationError,
  formatProfileValidationError,
  isProfileFormValid,
  type ProfileFormData,
  type ProfileValidationErrors,
} from '../../utils/index.js';
import './MyProfilePage.css';

/**
 * Internal component that uses Relay query
 * Wrapped in Suspense by the parent component
 */
function MyProfilePageContent() {
  const data = useLazyLoadQuery<MyProfilePageRelayQuery>(
    graphql`
      query MyProfilePageRelayQuery {
        me {
          id
          username
          handle
          fullName
          bio
          profilePictureUrl
          followersCount
          followingCount
          postsCount
          createdAt
        }
      }
    `,
    {},
    { fetchPolicy: 'store-or-network' }
  );

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<ProfileFormData>({
    fullName: '',
    bio: ''
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ProfileValidationErrors>({});

  const [commitUpdateProfile, isUpdating] = useMutation<MyProfilePageRelayMutation>(
    graphql`
      mutation MyProfilePageRelayMutation($input: UpdateProfileInput!) {
        updateProfile(input: $input) {
          id
          username
          handle
          fullName
          bio
          profilePictureUrl
          followersCount
          followingCount
          postsCount
          createdAt
        }
      }
    `
  );

  const profile = data.me;

  const handleAvatarClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        console.log('🐾 Avatar upload selected:', file.name);
        alert(`🎉 Avatar upload coming soon! Selected: ${file.name}`);
      }
    };
    input.click();
  };

  const handleEditClick = () => {
    if (profile) {
      setEditFormData(initializeProfileFormData(profile));
      setEditError(null);
      setValidationErrors({});
      setEditModalOpen(true);
    }
  };

  const validateForm = () => {
    const errors = validateProfileForm(editFormData);
    setValidationErrors(errors);
    return isProfileFormValid(errors);
  };

  const handleSaveProfile = () => {
    if (!validateForm()) {
      return;
    }

    setEditError(null);

    commitUpdateProfile({
      variables: {
        input: {
          fullName: editFormData.fullName || null,
          bio: editFormData.bio || null,
        },
      },
      onCompleted: () => {
        setEditModalOpen(false);
      },
      onError: (error) => {
        console.error('Failed to update profile:', error);
        setEditError('Failed to update profile. Please try again.');
      },
    });
  };

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (validationErrors[field]) {
      setValidationErrors(prev => clearValidationError(prev, field));
    }
  };

  return (
    <ProfileLayout
      header={
        <div className="profile-header">
          <h1 className="profile-title tama-heading">🐾 My Pet Profile</h1>
          <p className="profile-subtitle">Manage your virtual pet adventures</p>
        </div>
      }
    >
      <div className="tama-card">
        <ProfileDisplay
          profile={profile}
          showEditButton={true}
          onEditClick={handleEditClick}
          onAvatarClick={handleAvatarClick}
        />
      </div>

      {editModalOpen && (
        <div className="modal-overlay modal-overlay--automotive">
          <div className="modal-content modal-content--automotive" role="dialog">
            <h3 className="tama-heading tama-heading--automotive">🌟 Edit Pet Profile</h3>

            {editError && (
              <div className="tama-alert tama-alert--error">
                {editError}
              </div>
            )}

            <div className="form-section">
              <div className="form-group">
                <label htmlFor="fullName" className="tama-form-label tama-form-label--automotive">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={editFormData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="tama-input tama-input--automotive"
                  placeholder="Enter your full name"
                  disabled={isUpdating}
                />
                {formatProfileValidationError(validationErrors, 'fullName') && (
                  <p className="tama-form-error">{formatProfileValidationError(validationErrors, 'fullName')}</p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="bio" className="tama-form-label tama-form-label--automotive">
                  Bio
                </label>
                <textarea
                  id="bio"
                  rows={4}
                  value={editFormData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  className="tama-input tama-input--automotive tama-textarea"
                  placeholder="Tell others about your pet adventures..."
                  disabled={isUpdating}
                />
                {formatProfileValidationError(validationErrors, 'bio') && (
                  <p className="tama-form-error">{formatProfileValidationError(validationErrors, 'bio')}</p>
                )}
              </div>
            </div>

            <div className="modal-actions modal-actions--automotive">
              <button
                onClick={handleSaveProfile}
                className="tama-btn tama-btn--automotive tama-btn--racing-red"
                disabled={isUpdating}
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditModalOpen(false)}
                className="tama-btn tama-btn--automotive tama-btn--secondary"
                disabled={isUpdating}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </ProfileLayout>
  );
}

/**
 * Relay-powered My Profile page component for authenticated users
 * Uses Relay query with Suspense boundary
 */
export const MyProfilePageRelay: React.FC = () => {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading profile..." />}>
      <MyProfilePageContent />
    </Suspense>
  );
};
