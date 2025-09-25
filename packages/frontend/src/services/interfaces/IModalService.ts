/**
 * Modal service interface - abstracts modal state management
 * This allows components to control modals without managing local state
 */
export interface IModalService {
  /**
   * Whether the authentication modal is currently open
   */
  readonly isAuthModalOpen: boolean;

  /**
   * Current mode of the auth modal ('login' | 'register')
   */
  readonly authModalMode: 'login' | 'register';

  /**
   * Open the authentication modal in login mode
   */
  openLoginModal(): void;

  /**
   * Open the authentication modal in register mode
   */
  openRegisterModal(): void;

  /**
   * Close the authentication modal
   */
  closeAuthModal(): void;

  /**
   * Switch between login and register modes
   * @param mode - The mode to switch to
   */
  setAuthModalMode(mode: 'login' | 'register'): void;

  /**
   * Subscribe to modal state changes
   * @param callback - Function called when modal state changes
   * @returns Unsubscribe function
   */
  onModalStateChange(callback: (isOpen: boolean, mode: 'login' | 'register') => void): () => void;
}