// Call this on logout to clear all cached org data from memory.
// Add new stores here as they are implemented.
import { useShopStore } from './useShopStore';
import { useDashboardStore } from './useDashboardStore';

export const resetAllStores = () => {
  useShopStore.getState().reset();
  useDashboardStore.getState().reset();
};
