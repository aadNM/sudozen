/** /src/utils/Logger.ts */

import { Platform } from 'react-native';

const LOG_ENDPOINT = 'https://logs.example.com/log';

export async function logMessage(level: 'debug' | 'info' | 'warn' | 'error', message: string, extra: Record<string, any> = {}) {
  const payload = {
    level,
    message,
    platform: Platform.OS,
    timestamp: new Date().toISOString(),
    ...extra,
  };

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