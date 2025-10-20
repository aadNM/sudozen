/** src/hooks/ads/RewardedAd.tsx */

import { getAdUnitId } from '@/src/utils/ads';
import { logMessage } from '@/src/utils/Logger';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { AdEventType, RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';

export function useRewardedAd(
  which: 1 | 2, 
  onReward: (reward: { type: string; amount: number }) => void
) {
  const adRef = useRef<RewardedAd | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const onRewardRef = useRef(onReward);

  useEffect(() => {
    onRewardRef.current = onReward;
  }, [onReward]);

  useEffect(() => {
    const adUnitId = getAdUnitId(which === 1 ? 'rewardedInterstitial1' : 'rewardedInterstitial2');
    
    logMessage('info', `[Rewarded ${which}] Initializing with ad unit: ${adUnitId}`, { adUnitId, which });
    
    const ad = RewardedAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });
    
    adRef.current = ad;

    const unsubscribeLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      logMessage('info', `[Rewarded ${which}] ✅ Ad loaded successfully`, { which });
      setIsLoaded(true);
      setIsLoading(false);
      setLoadAttempts(0);
    });

    const unsubscribeEarn = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
      logMessage('info', `[Rewarded ${which}] 🎁 Reward earned`, { which, reward });
      onRewardRef.current(reward);
    });

    const unsubscribeClose = ad.addAdEventListener(AdEventType.CLOSED, () => {
      logMessage('info', `[Rewarded ${which}] Ad closed, reloading...`, { which });
      setIsLoaded(false);
      setIsLoading(true);
      ad.load();
    });

    const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
      logMessage('error', `[Rewarded ${which}] ❌ Error`, { which, error });
      setIsLoaded(false);
      setIsLoading(false);
      
      if (loadAttempts < 3) {
        const delay = Math.min(1000 * Math.pow(2, loadAttempts), 10000);
        logMessage('warn', `[Rewarded ${which}] Retrying`, { which, delay, attempt: loadAttempts + 1 });
        
        setTimeout(() => {
          setLoadAttempts(prev => prev + 1);
          setIsLoading(true);
          ad.load();
        }, delay);
      } else {
        logMessage('error', `[Rewarded ${which}] Max retry attempts reached`, { which });
        Alert.alert(
          'Ad Not Available',
          'Unable to load ad at this time. Please try again later.',
          [{ text: 'OK' }]
        );
      }
    });

    logMessage('info', `[Rewarded ${which}] Starting initial load`, { which });
    setIsLoading(true);
    ad.load();

    return () => {
      logMessage('debug', `[Rewarded ${which}] Cleaning up listeners`, { which });
      unsubscribeLoaded();
      unsubscribeEarn();
      unsubscribeClose();
      unsubscribeError();
    };
  }, [which, loadAttempts]);

  const showRewarded = useCallback(() => {
    logMessage('debug', `[Rewarded ${which}] showRewarded called`, { which, isLoaded, isLoading });
    
    if (!adRef.current) {
      logMessage('warn', `[Rewarded ${which}] Ad instance not initialized`, { which });
      Alert.alert('Error', 'Ad system not ready. Please try again.');
      return;
    }

    if (isLoaded) {
      logMessage('info', `[Rewarded ${which}] Showing ad`, { which });
      adRef.current.show();
      setIsLoaded(false);
    } else if (isLoading) {
      logMessage('info', `[Rewarded ${which}] Ad is still loading`, { which });
      Alert.alert(
        'Please Wait',
        'Ad is loading. Please try again in a moment.',
        [{ text: 'OK' }]
      );
    } else {
      logMessage('warn', `[Rewarded ${which}] Ad not loaded, attempting to load`, { which });
      Alert.alert(
        'Loading Ad',
        'Please wait while we load the ad...',
        [{ text: 'OK' }]
      );
      setIsLoading(true);
      setLoadAttempts(0);
      adRef.current.load();
    }
  }, [isLoaded, isLoading, which]);

  return { showRewarded, isLoaded, isLoading };
}