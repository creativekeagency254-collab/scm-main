import * as SecureStore from "expo-secure-store";

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED
};

export const secureStorage = {
  async getItem(key: string) {
    return SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
  },
  async setItem(key: string, value: string) {
    await SecureStore.setItemAsync(key, value, SECURE_STORE_OPTIONS);
  },
  async removeItem(key: string) {
    await SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS);
  }
};
