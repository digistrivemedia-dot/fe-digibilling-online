import { create } from 'zustand';
import { servicesAPI } from '@/utils/api';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Services uses server-side search (params.search on every keystroke).
// Cache is params-aware so different search terms always trigger a fresh fetch.
export const useServicesStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,
  lastFetched: null,
  lastParams: null,

  fetchItems: async (params = {}, force = false) => {
    const { lastFetched, lastParams } = get();
    const paramsKey = JSON.stringify(params);

    if (!force) {
      const isFresh = lastFetched && Date.now() - lastFetched < CACHE_TTL;
      const paramsMatch = paramsKey === lastParams;
      if (isFresh && paramsMatch) return;
    }

    set({ loading: true, error: null });
    try {
      const data = await servicesAPI.getAll(params);
      set({ items: data, lastFetched: Date.now(), lastParams: paramsKey, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  invalidate: () => set({ lastFetched: null, lastParams: null }),
  reset: () => set({ items: [], loading: false, error: null, lastFetched: null, lastParams: null }),
}));
