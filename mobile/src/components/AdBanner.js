import React from 'react';
import { View } from 'react-native';

// react-native-google-mobile-ads is a native module — not available in Expo Go
let BannerAd = null, BannerAdSize = null, TestIds = null;
try {
  const m = require('react-native-google-mobile-ads');
  BannerAd = m.BannerAd;
  BannerAdSize = m.BannerAdSize;
  TestIds = m.TestIds;
} catch {}

export default function AdBanner() {
  if (!BannerAd) return null;
  const unitId = __DEV__ ? TestIds.ADAPTIVE_BANNER : 'ca-app-pub-3973597189754626/3202718726';
  return (
    <View style={{ alignItems: 'center', marginVertical: 8 }}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}
