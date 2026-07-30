import * as SecureStore from "expo-secure-store";
import type { SupportedStorage } from "@supabase/supabase-js";

const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const secureSessionStorage: SupportedStorage = {
  getItem: (key) => SecureStore.getItemAsync(key, secureStoreOptions),
  setItem: (key, value) => SecureStore.setItemAsync(key, value, secureStoreOptions),
  removeItem: (key) => SecureStore.deleteItemAsync(key, secureStoreOptions),
};
