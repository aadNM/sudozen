// src/config.ts


const getRequired = (key: string): string => {
  const value = process.env[key];
  if (!value && process.env.EXPO_PUBLIC_NODE_ENV === 'production') {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value || '';
};

export const PB_ADMIN_EMAIL = getRequired('EXPO_PUBLIC_PB_ADMIN_EMAIL') || '';
export const PB_ADMIN_PWD = getRequired('EXPO_PUBLIC_PB_ADMIN_PWD') || '';
export const PB_URL = getRequired('EXPO_PUBLIC_PB_URL');
