import { create } from 'zustand';
import { invoicesAPI } from '@/utils/api';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useInvoicesStore = create((set, get) => ({
  items: [],
  pagination: {},
  loading: false,
  error: null,
  lastFetched: null,
  lastParams: null, // JSON string of last used params — cache miss if params differ

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
      const data = await invoicesAPI.getAll(params);
      set({
        items: data.invoices || data,
        pagination: data.pagination || {},
        lastFetched: Date.now(),
        lastParams: paramsKey,
        loading: false,
      });
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err; // re-throw so the page can show a toast
    }
  },

  invalidate: () => set({ lastFetched: null, lastParams: null }),
  reset: () => set({ items: [], pagination: {}, loading: false, error: null, lastFetched: null, lastParams: null }),
}));
