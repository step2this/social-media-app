import React, { useState, useEffect } from 'react';
import type { UserProfile } from '@social-media-app/shared';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../services/apiClient';
import { ProfileDisplay } from './ProfileDisplay';
import { LoadingSpinner, ErrorState } from '../common/LoadingStates';

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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Profile</h1>
      </div>

      <ProfileDisplay
        profile={profile}
        showEditButton={true}
        onEditClick={handleEditClick}
      />

      {/* Edit Profile Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4" role="dialog">
            <h3 className="text-xl font-bold mb-4">Edit Profile</h3>

            {editError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {editError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={editFormData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                />
                {validationErrors.fullName && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.fullName}</p>
                )}
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  id="bio"
                  rows={3}
                  value={editFormData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                />
                {validationErrors.bio && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.bio}</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveProfile}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Save
              </button>
              <button
                onClick={() => setEditModalOpen(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};