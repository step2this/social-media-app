import { useCallback } from 'react';
import { useAuthStore } from '../stores/authStore.js';
import { apiClient } from '../services/apiClient.js';
import type { RegisterRequest, LoginRequest, UpdateUserRequest } from '@social-media-app/shared';
import {
  createRegisterErrorMessage,
  createLoginErrorMessage,
  createProfileErrorMessage,
  createUpdateProfileErrorMessage,
  buildUserWithFallbacks,
  extractUserFromProfile,
  processRegisterResponse,
} from '../utils/index.js';

/**
 * Authentication hook that provides auth operations with store integration
 */
export const useAuth = () => {
  const {
    user,
    tokens,
    isAuthenticated,
    isLoading,
    error,
    isHydrated,
    setUser,
    setTokens,
    setLoading,
    setError,
    login: setLoginState,
    logout: setLogoutState,
    clearError
  } = useAuthStore();

  /**
   * Register new user
   */
  const register = useCallback(async (userData: RegisterRequest) => {
    console.log('🔐 useAuth: Starting registration for:', userData.email);
    setLoading(true);
    setError(null);

    try {
      console.log('🌐 useAuth: Calling apiClient.auth.register...');
      const response = await apiClient.auth.register(userData);
      console.log('✅ useAuth: Registration API call successful:', response);

      // Process response and handle conditional auto-login
      const { shouldLogin, user: normalizedUser, tokens } = processRegisterResponse(response);

      if (shouldLogin && normalizedUser && tokens) {
        console.log('🔑 useAuth: Tokens received, logging user in automatically');
        setLoginState(normalizedUser, tokens);
      }

      setLoading(false);
      return response;
    } catch (err) {
      console.error('❌ useAuth: Registration error caught:', err);
      const errorMessage = createRegisterErrorMessage(err);
      console.error('🔴 useAuth: Setting error message:', errorMessage);
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  }, [setLoading, setError, setLoginState]);

  /**
   * Login user
   */
  const login = useCallback(async (credentials: LoginRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.auth.login(credentials);

      // Normalize user object and update auth store
      const normalizedUser = buildUserWithFallbacks(response.user);
      setLoginState(normalizedUser, response.tokens);
      setLoading(false);

      return response;
    } catch (err) {
      const errorMessage = createLoginErrorMessage(err);
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  }, [setLoading, setError, setLoginState]);

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    if (!tokens?.refreshToken) {
      setLogoutState();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiClient.auth.logout({ refreshToken: tokens.refreshToken });
      setLogoutState();
      setLoading(false);
    } catch (err) {
      // Always logout locally even if server request fails
      setLogoutState();
      setLoading(false);

      // Log error but don't throw - logout should always succeed locally
      console.warn('Logout request failed, but user logged out locally:', err);
    }
  }, [tokens?.refreshToken, setLoading, setError, setLogoutState]);

  /**
   * Refresh access token
   */
  const refreshToken = useCallback(async () => {
    if (!tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await apiClient.auth.refreshToken({
        refreshToken: tokens.refreshToken
      });

      // Update tokens in store
      setTokens(response.tokens);

      return response.tokens;
    } catch (err) {
      // If refresh fails, logout user
      setLogoutState();
      throw err;
    }
  }, [tokens?.refreshToken, setTokens, setLogoutState]);

  /**
   * Get user profile
   */
  const getProfile = useCallback(async () => {
    if (!isAuthenticated) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.auth.getProfile();

      // Extract user fields from profile response
      const userData = extractUserFromProfile(response.profile);

      // Update user data in store
      setUser(userData);
      setLoading(false);

      return userData;
    } catch (err) {
      const errorMessage = createProfileErrorMessage(err);
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  }, [isAuthenticated, setLoading, setError, setUser]);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (profileData: UpdateUserRequest) => {
    if (!isAuthenticated) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.auth.updateProfile(profileData);

      // Update user data in store
      setUser(response.user);
      setLoading(false);

      return response.user;
    } catch (err) {
      const errorMessage = createUpdateProfileErrorMessage(err);
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  }, [isAuthenticated, setLoading, setError, setUser]);

  /**
   * Check if user has a valid session
   */
  const checkSession = useCallback(async () => {
    if (!tokens?.accessToken) {
      return false;
    }

    try {
      await getProfile();
      return true;
    } catch {
      // If profile fetch fails, try to refresh token
      try {
        await refreshToken();
        await getProfile();
        return true;
      } catch {
        // If refresh also fails, logout
        setLogoutState();
        return false;
      }
    }
  }, [tokens?.accessToken, getProfile, refreshToken, setLogoutState]);

  return {
    // State
    user,
    tokens,
    isAuthenticated,
    isLoading,
    error,
    isHydrated,

    // Actions
    register,
    login,
    logout,
    refreshToken,
    getProfile,
    updateProfile,
    checkSession,
    clearError
  };
};