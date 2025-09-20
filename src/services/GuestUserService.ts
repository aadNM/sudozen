/** src/services/GuestUserService.ts */

import storage from '../utils/mmkvStorage';
import { logMessage } from '../utils/Logger';
import { GUEST_MAX_GAMES, GUEST_USER_KEY, GuestUser } from '../types/GameTypes';


export class GuestUserService {
  private static guestUser: GuestUser | null = null;

  static createGuestUser(): GuestUser {
    const guestUser: GuestUser = {
      id: 'guest-' + Date.now(),
      username: 'Guest Player',
      email: 'guest@local.app',
      isGuest: true,
      gamesPlayed: 0,
      maxGames: GUEST_MAX_GAMES,
      createdAt: new Date().toISOString(),
    };

    storage.setJSON(GUEST_USER_KEY, guestUser);
    this.guestUser = guestUser;
    
    logMessage('info', 'Guest user created', { id: guestUser.id });
    return guestUser;
  }

  static getGuestUser(): GuestUser | null {
    if (this.guestUser) return this.guestUser;
    
    try {
      const stored = storage.getJSON<GuestUser>(GUEST_USER_KEY);
      if (stored) {
        this.guestUser = stored;
        return stored;
      }
    } catch (error) {
      logMessage('warn', 'Failed to load guest user', { error: String(error) });
    }
    
    return null;
  }

  static incrementGamesPlayed(): boolean {
    const guest = this.getGuestUser();
    if (!guest) return false;

    guest.gamesPlayed++;
    storage.setJSON(GUEST_USER_KEY, guest);
    this.guestUser = guest;
    
    return guest.gamesPlayed < guest.maxGames;
  }

  static canPlayMore(): boolean {
    const guest = this.getGuestUser();
    return guest ? guest.gamesPlayed < guest.maxGames : false;
  }

  static getGamesRemaining(): number {
    const guest = this.getGuestUser();
    return guest ? Math.max(0, guest.maxGames - guest.gamesPlayed) : 0;
  }

  static clearGuestUser(): void {
    storage.delete(GUEST_USER_KEY);
    this.guestUser = null;
  }

  static isGuestUser(user: any): user is GuestUser {
    return user && user.isGuest === true;
  }
}