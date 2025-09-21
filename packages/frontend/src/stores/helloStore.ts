import { create } from 'zustand';
import type { HelloResponse } from '@social-media-app/shared';

interface HelloStore {
  response: HelloResponse | null;
  loading: boolean;
  error: string | null;
  setResponse: (response: HelloResponse) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useHelloStore = create<HelloStore>((set) => ({
  response: null,
  loading: false,
  error: null,
  setResponse: (response) => set({ response }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set({ response: null, loading: false, error: null })
}));