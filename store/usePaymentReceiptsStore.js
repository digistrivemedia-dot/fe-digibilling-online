import { create } from 'zustand';
import { invoicesAPI } from '@/utils/api';

const CACHE_TTL = 5 * 60 * 1000;

// Fetches all invoices and caches only those with paidAmount > 0.
// Payment Receipts page does client-side search/filter on this data.
export const usePaymentReceiptsStore = create((set, get) => ({
  items: [], // invoices with paidAmount > 0
  loading: false,
  error: null,
  lastFetched: null,

  fetchItems: async (force = false) => {
    const { lastFetched } = get();
    if (!force && lastFetched && Date.now() - lastFetched < CACHE_TTL) return;

    set({ loading: true, error: null });
    try {
      const data = await invoicesAPI.getAll();
      const invoicesList = data.invoices || data;
      set({
        items: invoicesList.filter(inv => inv.paidAmount > 0),
        lastFetched: Date.now(),
        loading: false,
      });
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  invalidate: () => set({ lastFetched: null }),
  reset: () => set({ items: [], loading: false, error: null, lastFetched: null }),
}));
