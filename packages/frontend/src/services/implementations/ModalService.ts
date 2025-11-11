import type { IModalService } from '../interfaces/IModalService.js';

/**
 * Concrete implementation of modal service using internal state management
 * This provides a centralized way to manage modal state across the application
 */
export class ModalService implements IModalService {
  private _isAuthModalOpen: boolean = false;
  private _authModalMode: 'login' | 'register' = 'login';
  private stateChangeCallbacks: Set<(isOpen: boolean, mode: 'login' | 'register') => void> = new Set();

  get isAuthModalOpen(): boolean {
    return this._isAuthModalOpen;
  }

  get authModalMode(): 'login' | 'register' {
    return this._authModalMode;
  }

  openLoginModal(): void {
    this._isAuthModalOpen = true;
    this._authModalMode = 'login';
    this.notifyStateChange();
  }

  openRegisterModal(): void {
    this._isAuthModalOpen = true;
    this._authModalMode = 'register';
    this.notifyStateChange();
  }

  closeAuthModal(): void {
    this._isAuthModalOpen = false;
    this.notifyStateChange();
  }

  setAuthModalMode(mode: 'login' | 'register'): void {
    this._authModalMode = mode;
    this.notifyStateChange();
  }

  onModalStateChange(callback: (isOpen: boolean, mode: 'login' | 'register') => void): () => void {
    this.stateChangeCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.stateChangeCallbacks.delete(callback);
    };
  }

  private notifyStateChange(): void {
    this.stateChangeCallbacks.forEach(callback => {
      callback(this._isAuthModalOpen, this._authModalMode);
    });
  }
}

/**
 * Factory function for creating ModalService instances
 * Useful for dependency injection and testing
 */
export const createModalService = (): IModalService => {
  return new ModalService();
};