import { create } from 'zustand';
import { customersAPI } from '@/utils/api';

const CACHE_TTL = 5 * 60 * 1000;

export const useCustomersStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,
  lastFetched: null,

  fetchItems: async (force = false) => {
    const { lastFetched } = get();
    if (!force && lastFetched && Date.now() - lastFetched < CACHE_TTL) return;
    set({ loading: true, error: null });
    try {
      const data = await customersAPI.getAll();
      set({ items: data, lastFetched: Date.now(), loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  invalidate: () => set({ lastFetched: null }),

  reset: () => set({ items: [], loading: false, error: null, lastFetched: null }),
}));
