/** src/services/PocketBaseClient.ts */

import PocketBase, { LocalAuthStore } from 'pocketbase';
import { Platform } from 'react-native';
import storage from '../utils/mmkvStorage';
import { PB_URL } from '../config';
import { logMessage } from '../utils/Logger';

class AsyncAuthStore extends LocalAuthStore {
  constructor() {
    super();
    this.load().catch(err => {
      logMessage('warn', 'Failed to load auth:', { error: String(err)});
    });
  }

  async load() {
    try {
      const data = await storage.secure.getString('pb_auth');
      if (data) {
        this.save(data);
      }
    } catch (err) {
      logMessage('error', 'Auth load error:', { error: String(err)});
    }
  }

  async save(storageData: string) {
    try {
      await storage.secure.set('pb_auth', storageData);
      super.save(storageData);
    } catch (err) {
      logMessage('error', 'Auth save error:', { error: String(err)});
    }
  }

  async clear() {
    try {
      await storage.delete('pb_auth');
      super.clear();
    } catch (err) {
      logMessage('error', 'Auth clear error:', { error: String(err)});
    }
  }
}

const getBaseUrl = () => {
  // On the Android emulator, 127.0.0.1 is the emulator itself; 10.0.2.2 is the host machine.
  if (Platform.OS === 'android' && /127\.0\.0\.1|localhost/.test(PB_URL)) {
    return PB_URL.replace(/127\.0\.0\.1|localhost/, '10.0.2.2');
  }
  return PB_URL;
};

const pb = new PocketBase(getBaseUrl(), new AsyncAuthStore());

// Configure client
pb.autoCancellation(false);

// Simplified auth initialization
export const initAuth = async () => {
  try {
    // Try to refresh existing session
    if (pb.authStore.token) {
      await pb.collection('players').authRefresh();
    }
  } catch (err) {
    pb.authStore.clear();
  }
};


export default pb;