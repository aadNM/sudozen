/** src/hooks/ads/Banner.tsx */

import { getAdUnitId } from '@/src/utils/ads';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

const bannerAdUnitId = getAdUnitId('banner');

export function SudokuBanner() {
  return (
    <BannerAd
      unitId={bannerAdUnitId}
      size={BannerAdSize.BANNER}
      requestOptions={{ requestNonPersonalizedAdsOnly: true }}
    />
  );
}
