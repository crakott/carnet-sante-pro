import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>📵 Hors ligne — données en cache</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#374151',
    paddingVertical: 7,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#f9fafb',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
