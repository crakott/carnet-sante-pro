import 'react-native-gesture-handler';
import React, { useEffect, useState, createContext, useContext } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

// react-native-google-mobile-ads is native-only — not available in Expo Go
let MobileAds = null;
try {
  MobileAds = require('react-native-google-mobile-ads').default;
} catch {}

export const AdsContext = createContext(false);
export const useAdsReady = () => useContext(AdsContext);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const [adsReady, setAdsReady] = useState(false);

  useEffect(() => {
    if (MobileAds) {
      MobileAds().initialize()
        .then(() => setAdsReady(true))
        .catch(() => setAdsReady(true));
    } else {
      setAdsReady(true);
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AdsContext.Provider value={adsReady}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </AdsContext.Provider>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
