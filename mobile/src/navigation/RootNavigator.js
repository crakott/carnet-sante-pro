import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { AnimalsProvider } from '../context/AnimalsContext';
import AuthScreen from '../screens/auth/AuthScreen';
import OwnerNavigator from './OwnerNavigator';
import VetNavigator from './VetNavigator';
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

  if (loading || (user && userRole === null)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
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
