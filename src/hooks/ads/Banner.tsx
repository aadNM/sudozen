/** src/hooks/ads/Banner.tsx */

import { getAdUnitId } from '@/src/utils/ads';
import { useState } from 'react';
import { BannerAd, BannerAdSize, BannerAdProps } from 'react-native-google-mobile-ads';
import { View, StyleSheet } from 'react-native';
import { logMessage } from '@/src/utils/Logger';

const bannerAdUnitId = getAdUnitId('banner');

export function SudokuBanner() {
  const [bannerError, setBannerError] = useState(false);

  return (
    <View style={styles.container}>
      {!bannerError && (
        <BannerAd
          unitId={bannerAdUnitId}
          size={BannerAdSize.BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          onAdLoaded={() => {
            logMessage('debug', 'Banner ad loaded');
            setBannerError(false);
          }}
          onAdFailedToLoad={(error) => {
            logMessage('error', 'Banner ad failed to load:', {error: String(error)});
            setBannerError(true);
            // Retry after a delay
            setTimeout(() => setBannerError(false), 10000);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50, // Prevents layout shift when banner loads/unloads
  },
});