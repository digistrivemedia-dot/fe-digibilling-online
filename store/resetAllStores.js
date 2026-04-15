// Call this on logout to clear all cached org data from memory.
// Add new stores here as they are implemented.
import { useShopStore } from './useShopStore';
import { useDashboardStore } from './useDashboardStore';
import { useInvoicesStore } from './useInvoicesStore';
import { useQuotationsStore } from './useQuotationsStore';
import { usePaymentReceiptsStore } from './usePaymentReceiptsStore';
import { useSalesReturnsStore } from './useSalesReturnsStore';
import { useProformaStore } from './useProformaStore';
import { useDeliveryChallansStore } from './useDeliveryChallansStore';

export const resetAllStores = () => {
  useShopStore.getState().reset();
  useDashboardStore.getState().reset();
  useInvoicesStore.getState().reset();
  useQuotationsStore.getState().reset();
  usePaymentReceiptsStore.getState().reset();
  useSalesReturnsStore.getState().reset();
  useProformaStore.getState().reset();
  useDeliveryChallansStore.getState().reset();
};
