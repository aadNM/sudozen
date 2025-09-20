/**  /src/utils/storage.ts */


import { MMKV } from 'react-native-mmkv';
import { Platform } from 'react-native';
import { passGen } from './SudokuUtils';
import { logMessage } from './Logger';

// Storage config
const STORAGE_ID = 'sdk-storage';
const SECURE_STORAGE_ID = 'sdk-secure-storage';
const ENCRYPTION_KEY_NAME = `${SECURE_STORAGE_ID}-bogoro`;

// Normal storage (non-sensitive)
const normalStorage = new MMKV({ id: STORAGE_ID });

// Secure storage (sensitive) — lazy loaded
let secureStorage: MMKV | null = null;

// Secure Storage Initialization
function initializeSecureStorage(): MMKV {
  if (secureStorage) return secureStorage;

  if (Platform.OS === 'web') {
    logMessage('warn', 'Secure storage not supported on web, falling back to normal storage.');
    secureStorage = normalStorage;
    return secureStorage;
  }

  let encryptionKey = normalStorage.getString(ENCRYPTION_KEY_NAME);
  if (!encryptionKey) {
    encryptionKey = passGen();
    normalStorage.set(ENCRYPTION_KEY_NAME, encryptionKey);
  }

  secureStorage = new MMKV({
    id: SECURE_STORAGE_ID,
    encryptionKey,
  });

  return secureStorage;
}

// Core Storage
const Storage = {
  // Normal operations
  set: (key: string, value: string | number | boolean) => normalStorage.set(key, value),
  getString: (key: string) => normalStorage.getString(key),
  getNumber: (key: string) => normalStorage.getNumber(key),
  getBoolean: (key: string) => normalStorage.getBoolean(key),
  delete: (key: string) => normalStorage.delete(key),
  contains: (key: string) => normalStorage.contains(key),
  getAllKeys: () => normalStorage.getAllKeys(),
  clearAll: () => normalStorage.clearAll(),

  setJSON: (key: string, value: any) => normalStorage.set(key, JSON.stringify(value)),
  getJSON: <T>(key: string): T | null => {
    const json = normalStorage.getString(key);
    return json ? JSON.parse(json) : null;
  },

  // Secure operations (for sensitive data like emails)
  secure: {
    set: (key: string, value: string | number | boolean) => {
      initializeSecureStorage().set(key, value);
    },
    getString: (key: string) => initializeSecureStorage().getString(key),
    getNumber: (key: string) => initializeSecureStorage().getNumber(key),
    getBoolean: (key: string) => initializeSecureStorage().getBoolean(key),
    delete: (key: string) => initializeSecureStorage().delete(key),
    contains: (key: string) => initializeSecureStorage().contains(key),
    getAllKeys: () => initializeSecureStorage().getAllKeys(),
    clearAll: () => initializeSecureStorage().clearAll(),

    setJSON: (key: string, value: any) => {
      initializeSecureStorage().set(key, JSON.stringify(value));
    },
    getJSON: <T>(key: string): T | null => {
      const json = initializeSecureStorage().getString(key);
      return json ? JSON.parse(json) : null;
    },
  },
};

export default Storage;
