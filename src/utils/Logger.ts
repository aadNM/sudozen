/** /src/utils/Logger.ts */

import { Platform } from 'react-native';

// Optional remote log collector. When unset, logs only go to the console.
const LOG_ENDPOINT = process.env.EXPO_PUBLIC_LOG_ENDPOINT || '';

export async function logMessage(level: 'debug' | 'info' | 'warn' | 'error', message: string, extra: Record<string, any> = {}) {
  const payload = {
    level,
    message,
    platform: Platform.OS,
    timestamp: new Date().toISOString(),
    ...extra,
  };

  if (!LOG_ENDPOINT) {
    if (__DEV__) console.log(`[${level}] ${message}`, extra);
    return;
  }

  try {
    await fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Only log locally if logging to server fails
    console.log('Logging failed:', err);
  }
}