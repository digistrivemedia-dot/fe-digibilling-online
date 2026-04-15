import { create } from 'zustand';
import { suppliersAPI } from '@/utils/api';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useSuppliersStore = create((set, get) => ({
  items: [],       // supplier list
  stats: null,     // stats object from /suppliers/stats
  loading: false,
  error: null,
  lastFetched: null,

  fetchItems: async (force = false) => {
    const { lastFetched } = get();
    if (!force && lastFetched && Date.now() - lastFetched < CACHE_TTL) return;

    set({ loading: true, error: null });
    try {
      const [suppliersData, statsData] = await Promise.all([
        suppliersAPI.getAll(),
        suppliersAPI.getStats(),
      ]);
      set({
        items: suppliersData,
        stats: statsData,
        lastFetched: Date.now(),
        loading: false,
      });
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  invalidate: () => set({ lastFetched: null }),
  reset: () => set({ items: [], stats: null, loading: false, error: null, lastFetched: null }),
}));
