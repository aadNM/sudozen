// src/config.ts


const getOptional = (key: string): string => {
  return process.env[key] || '';
};

export const PB_ADMIN_EMAIL = getOptional('EXPO_PUBLIC_PB_ADMIN_EMAIL');
export const PB_ADMIN_PWD = getOptional('EXPO_PUBLIC_PB_ADMIN_PWD'); 
export const PB_URL = getOptional('EXPO_PUBLIC_PB_URL') || 'https://pocketbase.example.com/';
