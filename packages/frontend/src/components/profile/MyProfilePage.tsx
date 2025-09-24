import React, { useState, useEffect } from 'react';
import type { UserProfile } from '@social-media-app/shared';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../services/apiClient';
import { ProfileDisplay } from './ProfileDisplay';
import { LoadingSpinner, ErrorState } from '../common/LoadingStates';
import { ProfileLayout, Card } from '../layout/AppLayout';
import './MyProfilePage.css';

/**
 * My profile page component for authenticated users
 */
export const MyProfilePage: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    bio: ''
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Load profile data
  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.auth.getProfile();
      setProfile(response.user);
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
      setEditFormData({
        fullName: profile.fullName || '',
        bio: profile.bio || ''
      });
      setEditError(null);
      setValidationErrors({});
      setEditModalOpen(true);
    }
  };

  // Validate form data
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!editFormData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSaveProfile = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setEditError(null);
      const response = await apiClient.auth.updateProfile({
        fullName: editFormData.fullName,
        bio: editFormData.bio
      });

      setProfile(response.user);
      setEditModalOpen(false);
    } catch (err) {
      setEditError('Failed to update profile. Please try again.');
    }
  };

  // Handle input changes
  const handleInputChange = (field: string, value: string) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
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
          <h1 className="profile-title neon-text">My Profile</h1>
          <p className="profile-subtitle">Manage your mountain presence</p>
        </div>
      }
    >
      <Card variant="retro" padding="lg">
        <ProfileDisplay
          profile={profile}
          showEditButton={true}
          onEditClick={handleEditClick}
        />
      </Card>

      {/* Edit Profile Modal */}
      {editModalOpen && (
        <div className="modal-overlay">
          <Card variant="neon" padding="lg" className="edit-modal" role="dialog">
            <h3 className="modal-title gradient-text">Edit Profile</h3>

            {editError && (
              <div className="error-message">
                {editError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="fullName" className="form-label">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={editFormData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="form-input"
                  placeholder="Enter your full name"
                />
                {validationErrors.fullName && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.fullName}</p>
                )}
              </div>

              <div>
                <label htmlFor="bio" className="form-label">
                  Bio
                </label>
                <textarea
                  id="bio"
                  rows={4}
                  value={editFormData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  className="form-input"
                  placeholder="Tell others about your mountain adventures..."
                />
                {validationErrors.bio && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.bio}</p>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button
                onClick={handleSaveProfile}
                className="btn btn-retro"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditModalOpen(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </Card>
        </div>
      )}
    </ProfileLayout>
  );
};