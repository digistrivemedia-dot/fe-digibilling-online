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
import { useProductsStore } from './useProductsStore';
import { useServicesStore } from './useServicesStore';
import { usePurchasesStore } from './usePurchasesStore';
import { useSuppliersStore } from './useSuppliersStore';
import { usePurchaseReturnsStore } from './usePurchaseReturnsStore';
import { useInventoryStore } from './useInventoryStore';
import { useCustomersStore } from './useCustomersStore';
import { useExpensesStore } from './useExpensesStore';

export const resetAllStores = () => {
  useShopStore.getState().reset();
  useDashboardStore.getState().reset();
  useInvoicesStore.getState().reset();
  useQuotationsStore.getState().reset();
  usePaymentReceiptsStore.getState().reset();
  useSalesReturnsStore.getState().reset();
  useProformaStore.getState().reset();
  useDeliveryChallansStore.getState().reset();
  useProductsStore.getState().reset();
  useServicesStore.getState().reset();
  usePurchasesStore.getState().reset();
  useSuppliersStore.getState().reset();
  usePurchaseReturnsStore.getState().reset();
  useInventoryStore.getState().reset();
  useCustomersStore.getState().reset();
  useExpensesStore.getState().reset();
};
