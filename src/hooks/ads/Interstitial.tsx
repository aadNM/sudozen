/** src/hooks/ads/Interstitial.tsx */

import { getAdUnitId } from '@/src/utils/ads';
import { logMessage } from '@/src/utils/Logger';
import { useEffect, useRef, useState, useCallback } from 'react';
import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';

export function useEndGameInterstitial() {
  const adRef = useRef<InterstitialAd | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const interstitialAdUnitId = getAdUnitId('interstitial');
    
    // Create the ad instance
    const ad = InterstitialAd.createForAdRequest(interstitialAdUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });
    
    adRef.current = ad;

    // Set up event listeners
    const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      logMessage('debug', 'Interstitial ad loaded successfully');
      setIsLoaded(true);
      setIsLoading(false);
    });

    const unsubscribeClose = ad.addAdEventListener(AdEventType.CLOSED, () => {
      logMessage('debug', 'Interstitial ad closed');
      setIsLoaded(false);
      // Reload for next time
      setIsLoading(true);
      ad.load();
    });

    const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
      logMessage('error', 'Interstitial ad error:', {error: String(error)});
      setIsLoaded(false);
      setIsLoading(false);
      // Retry loading after a delay
      setTimeout(() => {
        setIsLoading(true);
        ad.load();
      }, 3000);
    });

    // Initial load
    setIsLoading(true);
    ad.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeClose();
      unsubscribeError();
    };
  }, []);

  const showInterstitial = useCallback(() => {
    if (!adRef.current) {
      logMessage('warn', 'Interstitial ad not initialized');
      return;
    }

    if (isLoaded) {
      logMessage('debug', 'Showing interstitial ad');
      adRef.current.show();
      setIsLoaded(false);
    } else {
      logMessage('warn', 'Interstitial ad not loaded yet. Loading: ', {error: String(isLoading)});
      // Optionally auto-load if not loading
      if (!isLoading) {
        setIsLoading(true);
        adRef.current.load();
      }
    }
  }, [isLoaded, isLoading]);

  return { showInterstitial, isLoaded, isLoading };
}