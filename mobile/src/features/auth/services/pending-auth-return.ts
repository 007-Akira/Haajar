import * as SecureStore from "expo-secure-store";

import { safeAuthReturnTo, sanitizeInternalReturnTo } from "./auth-return";

const pendingAuthReturnKey = "haajar.pending-auth-return";
const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export async function savePendingAuthReturnTo(returnTo: unknown): Promise<string> {
  const safeReturnTo = safeAuthReturnTo(returnTo);
  await SecureStore.setItemAsync(pendingAuthReturnKey, safeReturnTo, secureStoreOptions);
  return safeReturnTo;
}

export async function getPendingAuthReturnTo(): Promise<string | null> {
  const stored = await SecureStore.getItemAsync(pendingAuthReturnKey, secureStoreOptions);
  const safeReturnTo = sanitizeInternalReturnTo(stored);
  if (stored && !safeReturnTo) await clearPendingAuthReturnTo();
  return safeReturnTo;
}

export async function clearPendingAuthReturnTo(): Promise<void> {
  await SecureStore.deleteItemAsync(pendingAuthReturnKey, secureStoreOptions);
}
