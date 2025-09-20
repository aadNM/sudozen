/** src/utils/GuestUpgradeUtils.ts */

import { DeviceEventEmitter } from 'react-native';
import storage from './mmkvStorage';
import { logMessage } from './Logger';

export const triggerGuestUpgrade = () => {
  logMessage('info', 'Guest upgrade requested');
  
  // Set flag in storage as backup
  storage.set('force_signup', true);
  
  // Emit event for immediate response
  DeviceEventEmitter.emit('GUEST_UPGRADE_REQUESTED');
};
