import { create } from 'zustand';

// Holds auth state globally so any component can read user/loading
// without React Context propagation overhead.
// login / signup / logout actions live in AuthContext (they need useRouter).
export const useAuthStore = create((set) => ({
  user: null,
  loading: true, // true until localStorage check completes on mount

  _setUser: (user) => set({ user }),
  _setLoading: (loading) => set({ loading }),
  _clearUser: () => set({ user: null }),
}));
