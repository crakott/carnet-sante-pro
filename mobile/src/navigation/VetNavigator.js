import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import VetSubscriptionScreen from '../screens/vet/VetSubscriptionScreen';
import VetSearchScreen from '../screens/vet/VetSearchScreen';
import { colors } from '../theme';

// Pro space for veterinarians: requires an active subscription, then search an animal by
// its identifiant and add medical acts (mirrors VetApp in the web app)
export default function VetNavigator() {
  const { user } = useAuth();
  const [subStatus, setSubStatus] = useState(null); // null (chargement) | 'active' | 'inactive' | ...

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', user.uid),
      (snap) => setSubStatus(snap.exists() ? (snap.data().subscriptionStatus || 'inactive') : 'inactive'),
      () => setSubStatus('inactive')
    );
    return unsub;
  }, [user.uid]);

  if (subStatus === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return subStatus === 'active' ? <VetSearchScreen /> : <VetSubscriptionScreen />;
}
