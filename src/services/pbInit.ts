/** src/services/pbInit.ts */

import { PB_ADMIN_EMAIL, PB_ADMIN_PWD, PB_URL } from "../config";
import { logMessage } from "../utils/Logger";
import pb from "./PocketbaseClient";


export const initDB = async () => {
  try {
    await pb.health.check();
    
    // ✅ Server is up and running, public rules are working
    return true;
  } catch (error) {
    logMessage('warn', '❌ DB Connection Failed:', { error: String(error)});
    
    // Fallback to admin auth
    try {
      await ensureAdminAuth();
      return true;
    } catch (adminError) {
      logMessage('error', '❌ Admin fallback failed:', { error: String(adminError)});
      return false;
    }
  }
};

// Get collections without admin privileges
export const getPublicCollections = async () => {
  try {
    // Use direct API call to bypass admin requirement
    const response = await fetch(`${pb.baseURL}/api/collections`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    logMessage('warn', 'Failed to get public collections:', { error: String(error)});
    throw error;
  }
};

export const ensureAdminAuth = async () => {
  try {
    if (!pb.authStore.isSuperuser) {
      await pb.collection('__superusers').authWithPassword(
        PB_ADMIN_EMAIL, 
        PB_ADMIN_PWD
      );
    }
  } catch (error) {
    logMessage('error', "❌ Admin authentication failed:", { error: String(error)});
    throw error;
  }
};