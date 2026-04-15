import { create } from 'zustand';
import { productsAPI } from '@/utils/api';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Products list uses getAllWithBatches which returns paginated data.
// Cache is params-aware: cache hit only when same page/filters/sort AND within TTL.
export const useProductsStore = create((set, get) => ({
  items: [],
  pagination: {},
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
      const data = await productsAPI.getAllWithBatches(params);
      set({
        items: data.products || data,
        pagination: data.pagination || {},
        lastFetched: Date.now(),
        lastParams: paramsKey,
        loading: false,
      });
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  invalidate: () => set({ lastFetched: null, lastParams: null }),
  reset: () => set({ items: [], pagination: {}, loading: false, error: null, lastFetched: null, lastParams: null }),
}));
