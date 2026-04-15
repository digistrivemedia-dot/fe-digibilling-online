import { create } from 'zustand';
import { inventoryAPI } from '@/utils/api';

const CACHE_TTL = 5 * 60 * 1000;

export const useInventoryStore = create((set, get) => ({
  stats: null,
  lowStockItems: [],
  nearExpiryBatches: [],
  expiredBatches: [],
  allBatches: [],
  loading: false,
  error: null,
  lastFetched: null,

  fetchItems: async (force = false) => {
    const { lastFetched } = get();
    if (!force && lastFetched && Date.now() - lastFetched < CACHE_TTL) return;
    set({ loading: true, error: null });
    try {
      const [statsData, lowStock, nearExpiry, expired, allBatchesData] = await Promise.all([
        inventoryAPI.getStats(),
        inventoryAPI.getLowStock(),
        inventoryAPI.getNearExpiry({ months: 3 }),
        inventoryAPI.getExpired(),
        inventoryAPI.getAllBatches(),
      ]);
      set({
        stats: statsData,
        lowStockItems: lowStock,
        nearExpiryBatches: nearExpiry,
        expiredBatches: expired,
        allBatches: allBatchesData,
        lastFetched: Date.now(),
        loading: false,
      });
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  invalidate: () => set({ lastFetched: null }),

  reset: () => set({
    stats: null,
    lowStockItems: [],
    nearExpiryBatches: [],
    expiredBatches: [],
    allBatches: [],
    loading: false,
    error: null,
    lastFetched: null,
  }),
}));
