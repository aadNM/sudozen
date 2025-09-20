/** src/hooks/ads/useRewardedInterstitial.tsx */

import { getAdUnitId } from '@/src/utils/ads';
import { useEffect, useRef } from 'react';
import { RewardedInterstitialAd, AdEventType, RewardedAdEventType } from 'react-native-google-mobile-ads';

const rewardedAdUnitId1 = getAdUnitId('rewardedInterstitial1');
const rewardedAdUnitId2 = getAdUnitId('rewardedInterstitial2');

const rewarded1 = RewardedInterstitialAd.createForAdRequest(rewardedAdUnitId1, {
  requestNonPersonalizedAdsOnly: true,
});

const rewarded2 = RewardedInterstitialAd.createForAdRequest(rewardedAdUnitId2, {
  requestNonPersonalizedAdsOnly: true,
});

export function useRewardedInterstitial(which: 1 | 2, onReward: (reward: { type: string; amount: number }) => void) {
  const adRef = useRef(which === 1 ? rewarded1 : rewarded2);
  const isLoaded = useRef(false);

  useEffect(() => {
    const unsubscribeLoaded = adRef.current.addAdEventListener(RewardedAdEventType.LOADED, () => {
      isLoaded.current = true;
    });

    const unsubscribeEarn = adRef.current.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
      onReward(reward); // reward the player (hint, bonus, etc.)
    });

    const unsubscribeClose = adRef.current.addAdEventListener(AdEventType.CLOSED, () => {
      adRef.current.load(); // reload for next time
    });

    adRef.current.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeEarn();
      unsubscribeClose();
    };
  }, [which, onReward]);

  const showRewarded = () => {
    if (isLoaded.current) {
      adRef.current.show();
      isLoaded.current = false;
    }
  };

  return { showRewarded };
}
