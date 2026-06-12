import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Fraunces_400Regular, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LocalizationProvider } from '../context/LocalizationContext';
import { ActivityIndicator, View } from 'react-native';
import '../global.css';

// Impedir que o Splash Screen seja ocultado automaticamente antes de carregar as fontes
SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutContent() {
  const { isLoading: isAuthLoading } = useAuth();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Fraunces_400Regular,
    Fraunces_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FAF9F6]">
        <ActivityIndicator size="large" color="#8F9779" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
      <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <LocalizationProvider>
        <RootLayoutContent />
      </LocalizationProvider>
    </AuthProvider>
  );
}
