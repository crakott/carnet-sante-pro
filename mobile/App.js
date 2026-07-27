import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import mobileAds from 'react-native-google-mobile-ads';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.errorContainer}>
          <ScrollView contentContainerStyle={styles.errorScroll}>
            <Text style={styles.errorTitle}>💥 Crash détecté</Text>
            <Text style={styles.errorMessage}>{this.state.error.toString()}</Text>
            <Text style={styles.errorStack}>{this.state.error.stack}</Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  useEffect(() => {
    mobileAds().initialize();
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
          <StatusBar style="light" backgroundColor="#10b981" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#1a0000',
    padding: 20,
    paddingTop: 60,
  },
  errorScroll: {
    flexGrow: 1,
  },
  errorTitle: {
    color: '#ff4444',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  errorMessage: {
    color: '#ffaaaa',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 16,
  },
  errorStack: {
    color: '#ff8888',
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
});
