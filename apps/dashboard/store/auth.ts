'use client';
import { create } from 'zustand';
import { User, Org } from '@/lib/api';

interface AuthState {
  token: string | null;
  user: User | null;
  org: Org | null;
  setAuth: (token: string, user: User, org: Org) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  org: null,

  setAuth: (token, user, org) => {
    localStorage.setItem('oai_token', token);
    localStorage.setItem('oai_user', JSON.stringify(user));
    localStorage.setItem('oai_org', JSON.stringify(org));
    set({ token, user, org });
  },

  logout: () => {
    localStorage.removeItem('oai_token');
    localStorage.removeItem('oai_user');
    localStorage.removeItem('oai_org');
    set({ token: null, user: null, org: null });
    window.location.href = '/login';
  },

  hydrate: () => {
    const token = localStorage.getItem('oai_token');
    const user = localStorage.getItem('oai_user');
    const org = localStorage.getItem('oai_org');
    if (token && user && org) {
      set({ token, user: JSON.parse(user), org: JSON.parse(org) });
    }
  },
}));
