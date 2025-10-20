/** src/utils/ads.ts */


import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

const IS_DEV = __DEV__;

export const AD_UNIT_IDS = {
  interstitial: {
    android: IS_DEV ? TestIds.INTERSTITIAL : 'ca-app-pub-0000000000000000/9216606239',
    ios: IS_DEV ? TestIds.INTERSTITIAL : 'ca-app-pub-0000000000000000/8111408123'
  },
  banner: {
    android: IS_DEV ? TestIds.BANNER : 'ca-app-pub-0000000000000000/9683795502',
    ios: IS_DEV ? TestIds.BANNER : 'ca-app-pub-0000000000000000/1645523387'
  },
  rewardedInterstitial1: {
    android: IS_DEV ? TestIds.REWARDED : 'ca-app-pub-0000000000000000/9647851078',
    ios: IS_DEV ? TestIds.REWARDED : 'ca-app-pub-0000000000000000/2842769576'
  },
  rewardedInterstitial2: {
    android: IS_DEV ? TestIds.REWARDED : 'ca-app-pub-0000000000000000/6590442897',
    ios: IS_DEV ? TestIds.REWARDED : 'ca-app-pub-0000000000000000/3309958843'
  }
};

export const getAdUnitId = (adType: keyof typeof AD_UNIT_IDS) => {
  return Platform.OS === 'ios' ? AD_UNIT_IDS[adType].ios : AD_UNIT_IDS[adType].android;
};