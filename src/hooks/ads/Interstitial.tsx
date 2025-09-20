/** src/hooks/ads/Interstitial.tsx */

import { getAdUnitId } from '@/src/utils/ads';
import { useEffect, useRef } from 'react';
import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';

const interstitialAdUnitId = getAdUnitId('interstitial');

const interstitial = InterstitialAd.createForAdRequest(interstitialAdUnitId, {
  requestNonPersonalizedAdsOnly: true,
});

export function useEndGameInterstitial() {
  const isLoaded = useRef(false);

  useEffect(() => {
    const unsubscribe = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      isLoaded.current = true;
    });

    const unsubscribeClose = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      interstitial.load(); // reload for next time
    });

    interstitial.load();

    return () => {
      unsubscribe();
      unsubscribeClose();
    };
  }, []);

  const showInterstitial = () => {
    if (isLoaded.current) {
      interstitial.show();
      isLoaded.current = false;
    }
  };

  return { showInterstitial };
}
