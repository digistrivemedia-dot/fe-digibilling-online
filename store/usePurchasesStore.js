import { create } from 'zustand';
import { purchasesAPI } from '@/utils/api';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const usePurchasesStore = create((set, get) => ({
  items: [],       // purchase list
  stats: null,     // stats object from /purchases/stats
  loading: false,
  error: null,
  lastFetched: null,

  fetchItems: async (force = false) => {
    const { lastFetched } = get();
    if (!force && lastFetched && Date.now() - lastFetched < CACHE_TTL) return;

    set({ loading: true, error: null });
    try {
      const [purchasesData, statsData] = await Promise.all([
        purchasesAPI.getAll(),
        purchasesAPI.getStats(),
      ]);
      set({
        items: purchasesData,
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
