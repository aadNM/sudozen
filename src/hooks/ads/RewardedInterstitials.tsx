/** src/hooks/ads/useRewardedInterstitial.tsx */

import { getAdUnitId } from '@/src/utils/ads';
import { logMessage } from '@/src/utils/Logger';
import { useEffect, useRef, useState, useCallback } from 'react';
import { RewardedInterstitialAd, AdEventType, RewardedAdEventType } from 'react-native-google-mobile-ads';

export function useRewardedInterstitial(
  which: 1 | 2, 
  onReward: (reward: { type: string; amount: number }) => void
) {
  const adRef = useRef<RewardedInterstitialAd | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const onRewardRef = useRef(onReward);

  // Keep onReward callback updated
  useEffect(() => {
    onRewardRef.current = onReward;
  }, [onReward]);

  useEffect(() => {
    const adUnitId = getAdUnitId(which === 1 ? 'rewardedInterstitial1' : 'rewardedInterstitial2');
    
    // Create the ad instance
    const ad = RewardedInterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });
    
    adRef.current = ad;

    // Set up event listeners
    const unsubscribeLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      logMessage('debug', `Rewarded ad ${which} loaded successfully`);
      setIsLoaded(true);
      setIsLoading(false);
    });

    const unsubscribeEarn = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
      logMessage('debug', `Rewarded ad ${which} earned reward:`, reward);
      onRewardRef.current(reward);
    });

    const unsubscribeClose = ad.addAdEventListener(AdEventType.CLOSED, () => {
      logMessage('debug', `Rewarded ad ${which} closed`);
      setIsLoaded(false);
      // Reload for next time
      setIsLoading(true);
      ad.load();
    });

    const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
      logMessage('error', `Rewarded ad ${which} error:`, {error: String(error)});
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
      unsubscribeEarn();
      unsubscribeClose();
      unsubscribeError();
    };
  }, [which]);

  const showRewarded = useCallback(() => {
    if (!adRef.current) {
      logMessage('warn', `Rewarded ad ${which} not initialized`);
      return;
    }

    if (isLoaded) {
      logMessage('debug', `Showing rewarded ad ${which}`);
      adRef.current.show();
      setIsLoaded(false);
    } else {
      logMessage('warn', `Rewarded ad ${which} not loaded yet. Loading: ${isLoading}`);
      // Optionally show a loading message to user
      if (!isLoading) {
        setIsLoading(true);
        adRef.current.load();
      }
    }
  }, [isLoaded, isLoading, which]);

  return { showRewarded, isLoaded, isLoading };
}