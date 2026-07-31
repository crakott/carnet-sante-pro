import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { AnimalsProvider } from '../context/AnimalsContext';
import AuthScreen from '../screens/auth/AuthScreen';
import OwnerNavigator from './OwnerNavigator';
import VetNavigator from './VetNavigator';
import OnboardingScreen from '../screens/OnboardingScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth" component={AuthScreen} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loading, userRole } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('hasSeenOnboarding').then((value) => {
      setShowOnboarding(value !== 'true');
      setOnboardingChecked(true);
    });
  }, []);

  if (!onboardingChecked || loading || (user && userRole === null)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (showOnboarding) {
    return <OnboardingScreen onDone={() => setShowOnboarding(false)} />;
  }

  return (
    <NavigationContainer>
      {!user ? (
        <AuthStack />
      ) : userRole === 'veterinaire' ? (
        <VetNavigator />
      ) : (
        <AnimalsProvider>
          <OwnerNavigator />
        </AnimalsProvider>
      )}
    </NavigationContainer>
  );
}
