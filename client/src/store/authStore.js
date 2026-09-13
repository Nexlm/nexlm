import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, setAuthHandlers } from '../lib/api.js';
import { disconnectSocket } from '../lib/socket.js';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      async login(credentials) {
        const { user, token } = await api.post('/auth/login', credentials);
        set({ user, token });
        return user;
      },

      async register(input) {
        const { user, token } = await api.post('/auth/register', input);
        set({ user, token });
        return user;
      },

      logout() {
        disconnectSocket();
        set({ token: null, user: null });
      },

      async refreshUser() {
        if (!get().token) return null;
        const { user } = await api.get('/users/me');
        set({ user });
        return user;
      },

      setUser(user) {
        set({ user });
      },
    }),
    {
      name: 'nexlm-auth',
      partialize: ({ token, user }) => ({ token, user }),
    },
  ),
);

setAuthHandlers({
  getToken: () => useAuthStore.getState().token,
  onUnauthorized: () => useAuthStore.getState().logout(),
});

export const useIsAdmin = () => useAuthStore((s) => s.user?.role === 'ADMIN');
