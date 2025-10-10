import React, { useState, useEffect } from 'react';
import type { Profile } from '@social-media-app/shared';
import { useAuth } from '../../hooks/useAuth';
import { profileService } from '../../services/profileService';
import { ProfileDisplay } from './ProfileDisplay';
import { LoadingSpinner, ErrorState } from '../common/LoadingStates';
import { ProfileLayout } from '../layout/AppLayout';
import {
  validateProfileForm,
  initializeProfileFormData,
  buildProfileUpdateRequest,
  clearValidationError,
  formatProfileValidationError,
  isProfileFormValid,
  type ProfileFormData,
  type ProfileValidationErrors,
} from '../../utils/index.js';
import './MyProfilePage.css';

/**
 * My profile page component for authenticated users
 */
export const MyProfilePage: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<ProfileFormData>({
    fullName: '',
    bio: ''
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ProfileValidationErrors>({});

  // Handle avatar upload
  const handleAvatarClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        console.log('🐾 Avatar upload selected:', file.name);
        // TODO: Implement avatar upload API call
        // For now, just show a placeholder message
        alert(`🎉 Avatar upload coming soon! Selected: ${file.name}`);
      }
    };
    input.click();
  };

  // Load profile data
  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const profile = await profileService.getCurrentProfile();
      setProfile(profile);
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  // Load profile on mount
  useEffect(() => {
    if (isAuthenticated && user) {
      loadProfile();
    }
  }, [isAuthenticated, user]);

  // Handle edit modal open
  const handleEditClick = () => {
    if (profile) {
      setEditFormData(initializeProfileFormData(profile));
      setEditError(null);
      setValidationErrors({});
      setEditModalOpen(true);
    }
  };

  // Validate form data
  const validateForm = () => {
    const errors = validateProfileForm(editFormData);
    setValidationErrors(errors);
    return isProfileFormValid(errors);
  };

  // Handle form submission
  const handleSaveProfile = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setEditError(null);
      const updateRequest = buildProfileUpdateRequest(editFormData);
      const updatedProfile = await profileService.updateProfile(updateRequest);

      setProfile(updatedProfile);
      setEditModalOpen(false);
    } catch (err) {
      setEditError('Failed to update profile. Please try again.');
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => clearValidationError(prev, field));
    }
  };

  // Show auth loading
  if (authLoading) {
    return <LoadingSpinner />;
  }

  // Show not authenticated
  if (!isAuthenticated || !user) {
    return <ErrorState message="Please sign in to view your profile" />;
  }

  // Show loading state
  if (loading) {
    return <LoadingSpinner message="Loading profile..." />;
  }

  // Show error state
  if (error || !profile) {
    return (
      <ErrorState
        message={error || 'Failed to load profile'}
        onRetry={loadProfile}
      />
    );
  }

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

      {/* Edit Profile Modal */}
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
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditModalOpen(false)}
                className="tama-btn tama-btn--automotive tama-btn--secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </ProfileLayout>
  );
};