import { Platform } from 'react-native';
import {
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type Product,
  type Purchase,
} from 'expo-iap';

import {
  ExpoIAPPurchaseProvider,
  type ExpoIapClient,
  type ExpoIapProduct,
  type ExpoIapPurchase,
} from './ExpoIAPPurchaseProvider.ts';

const client: ExpoIapClient = {
  initConnection,
  endConnection,
  fetchProducts: async (request) => (await fetchProducts(request)) as ExpoIapProduct[] | null,
  requestPurchase,
  getAvailablePurchases: async () => (await getAvailablePurchases()) as ExpoIapPurchase[],
  finishTransaction: async (request) =>
    finishTransaction(request as { purchase: Purchase; isConsumable: false }),
  purchaseUpdatedListener: (listener) =>
    purchaseUpdatedListener(listener as (purchase: Purchase) => void),
  purchaseErrorListener,
};

/** The only direct expo-iap import boundary; selected by Metro for iOS/Android. */
export function createExpoIAPPurchaseProvider(): ExpoIAPPurchaseProvider {
  return new ExpoIAPPurchaseProvider(client, { platform: () => Platform.OS });
}

export type ExpoIapNativeProduct = Product;
