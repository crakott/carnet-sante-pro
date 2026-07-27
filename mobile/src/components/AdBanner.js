import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// TODO: Remplacer par votre vrai ID depuis la console AdMob (admob.google.com)
// Créer une unité publicitaire "Bannière" pour Android dans votre app AdMob
const ANDROID_BANNER_ID = __DEV__
  ? TestIds.BANNER
  : 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';

export default function AdBanner() {
  return (
    <View style={styles.container}>
      <BannerAd
        unitId={ANDROID_BANNER_ID}
        size={BannerAdSize.BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 4,
  },
});
