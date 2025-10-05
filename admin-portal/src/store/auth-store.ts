import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Agent } from '@/types';

interface AuthState {
  agent: Agent | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  
  // Actions
  setAuth: (agent: Agent, accessToken: string, refreshToken: string) => void;
  setToken: (token: string) => void;
  setAgent: (agent: Agent) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      agent: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (agent, accessToken, refreshToken) => {
        set({
          agent,
          token: accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      },

      setToken: (token) => {
        set({ token });
      },

      setAgent: (agent) => {
        set({ agent });
      },

      logout: () => {
        set({
          agent: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
