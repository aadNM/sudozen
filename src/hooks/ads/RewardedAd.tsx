/** src/hooks/ads/RewardedAd.tsx */

import { getAdUnitId } from '@/src/utils/ads';
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
    
    console.log(`[Rewarded ${which}] Initializing with ad unit: ${adUnitId}`);
    
    const ad = RewardedAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });
    
    adRef.current = ad;

    const unsubscribeLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      console.log(`[Rewarded ${which}] ✅ Ad loaded successfully`);
      setIsLoaded(true);
      setIsLoading(false);
      setLoadAttempts(0);
    });

    const unsubscribeEarn = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
      console.log(`[Rewarded ${which}] 🎁 Reward earned:`, reward);
      onRewardRef.current(reward);
    });

    const unsubscribeClose = ad.addAdEventListener(AdEventType.CLOSED, () => {
      console.log(`[Rewarded ${which}] Ad closed, reloading...`);
      setIsLoaded(false);
      setIsLoading(true);
      ad.load();
    });

    const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
      console.error(`[Rewarded ${which}] ❌ Error:`, JSON.stringify(error, null, 2));
      setIsLoaded(false);
      setIsLoading(false);
      
      if (loadAttempts < 3) {
        const delay = Math.min(1000 * Math.pow(2, loadAttempts), 10000);
        console.log(`[Rewarded ${which}] Retrying in ${delay}ms... (attempt ${loadAttempts + 1}/3)`);
        
        setTimeout(() => {
          setLoadAttempts(prev => prev + 1);
          setIsLoading(true);
          ad.load();
        }, delay);
      } else {
        console.log(`[Rewarded ${which}] Max retry attempts reached`);
        Alert.alert(
          'Ad Not Available',
          'Unable to load ad at this time. Please try again later.',
          [{ text: 'OK' }]
        );
      }
    });

    console.log(`[Rewarded ${which}] Starting initial load...`);
    setIsLoading(true);
    ad.load();

    return () => {
      console.log(`[Rewarded ${which}] Cleaning up listeners`);
      unsubscribeLoaded();
      unsubscribeEarn();
      unsubscribeClose();
      unsubscribeError();
    };
  }, [which, loadAttempts]);

  const showRewarded = useCallback(() => {
    console.log(`[Rewarded ${which}] showRewarded called. isLoaded: ${isLoaded}, isLoading: ${isLoading}`);
    
    if (!adRef.current) {
      console.warn(`[Rewarded ${which}] Ad instance not initialized`);
      Alert.alert('Error', 'Ad system not ready. Please try again.');
      return;
    }

    if (isLoaded) {
      console.log(`[Rewarded ${which}] Showing ad...`);
      adRef.current.show();
      setIsLoaded(false);
    } else if (isLoading) {
      console.log(`[Rewarded ${which}] Ad is still loading...`);
      Alert.alert(
        'Please Wait',
        'Ad is loading. Please try again in a moment.',
        [{ text: 'OK' }]
      );
    } else {
      console.log(`[Rewarded ${which}] Ad not loaded, attempting to load now...`);
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