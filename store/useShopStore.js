import { create } from 'zustand';
import { shopAPI } from '@/utils/api';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useShopStore = create((set, get) => ({
  shopSettings: null,
  loading: false,
  lastFetched: null,
  settled: false, // true after first fetch attempt (success or failure) — used to show fallback logo

  fetchShopSettings: async (force = false) => {
    const { lastFetched, loading } = get();
    // Skip if already loading or cache is still fresh
    if (loading) return;
    if (!force && lastFetched && Date.now() - lastFetched < CACHE_TTL) return;

    set({ loading: true });
    try {
      const data = await shopAPI.get();
      set({ shopSettings: data, lastFetched: Date.now(), loading: false, settled: true });
    } catch (error) {
      console.error('Error loading shop settings:', error);
      set({ loading: false, settled: true });
    }
  },

  // Call after updating settings so next access re-fetches
  invalidate: () => set({ lastFetched: null }),

  // Full reset on logout (clears cached data for the org)
  reset: () => set({ shopSettings: null, loading: false, lastFetched: null, settled: false }),
}));
