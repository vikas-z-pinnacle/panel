import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isInitializing: boolean; // <-- Add this to track initial boot check
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: User) => void;
  setInitializing: (loading: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isInitializing: true, // Start as true on page load

  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem('refreshToken', refreshToken);
    set({ user, accessToken, isInitializing: false });
  },
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  setInitializing: (loading) => set({ isInitializing: loading }),
  clearAuth: () => {
    localStorage.removeItem('refreshToken');
    set({ user: null, accessToken: null, isInitializing: false });
  },
}));