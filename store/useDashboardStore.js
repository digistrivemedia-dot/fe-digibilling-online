import { create } from 'zustand';
import { invoicesAPI, purchasesAPI, inventoryAPI, expensesAPI, suppliersAPI } from '@/utils/api';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useDashboardStore = create((set, get) => ({
  stats: {
    invoices: null,
    purchases: null,
    inventory: null,
    expenses: null,
    suppliers: null,
  },
  loading: false,
  lastFetched: null,

  fetchStats: async (force = false) => {
    const { lastFetched, loading } = get();
    // Skip if already loading or cache is still fresh
    if (loading) return;
    if (!force && lastFetched && Date.now() - lastFetched < CACHE_TTL) return;

    set({ loading: true });
    try {
      const [invoicesData, purchasesData, inventoryData, expensesData, suppliersData] =
        await Promise.all([
          invoicesAPI.getStats().catch(() => null),
          purchasesAPI.getStats().catch(() => null),
          inventoryAPI.getStats().catch(() => null),
          expensesAPI.getStats().catch(() => null),
          suppliersAPI.getStats().catch(() => null),
        ]);

      set({
        stats: {
          invoices: invoicesData,
          purchases: purchasesData,
          inventory: inventoryData,
          expenses: expensesData,
          suppliers: suppliersData,
        },
        lastFetched: Date.now(),
        loading: false,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      set({ loading: false });
    }
  },

  // Full reset on logout
  reset: () =>
    set({
      stats: { invoices: null, purchases: null, inventory: null, expenses: null, suppliers: null },
      loading: false,
      lastFetched: null,
    }),
}));
