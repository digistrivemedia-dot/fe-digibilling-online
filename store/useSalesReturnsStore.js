import { create } from 'zustand';
import { salesReturnsAPI } from '@/utils/api';

const CACHE_TTL = 5 * 60 * 1000;

export const useSalesReturnsStore = create((set, get) => ({
  items: [],
  stats: null,
  loading: false,
  error: null,
  lastFetched: null,

  fetchItems: async (force = false) => {
    const { lastFetched } = get();
    if (!force && lastFetched && Date.now() - lastFetched < CACHE_TTL) return;

    set({ loading: true, error: null });
    try {
      const [returnsData, statsData] = await Promise.all([
        salesReturnsAPI.getAll(),
        salesReturnsAPI.getStats(),
      ]);
      set({ items: returnsData, stats: statsData, lastFetched: Date.now(), loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  invalidate: () => set({ lastFetched: null }),
  reset: () => set({ items: [], stats: null, loading: false, error: null, lastFetched: null }),
}));
