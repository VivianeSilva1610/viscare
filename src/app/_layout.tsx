import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, PlayfairDisplay_400Regular, PlayfairDisplay_600SemiBold, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LocalizationProvider } from '../context/LocalizationContext';
import { ActivityIndicator, View, Platform, Alert } from 'react-native';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import * as Linking from 'expo-linking';
import '../global.css';

// Impedir que o Splash Screen seja ocultado automaticamente antes de carregar as fontes
SplashScreen.preventAutoHideAsync().catch(() => {});

// Polyfill Alert.alert for Web, as react-native-web has a stub that does nothing.
if (Platform.OS === 'web') {
  (Alert as any).alert = (title: string, message?: string, buttons?: any[]) => {
    const text = message ? `${title}\n\n${message}` : title;
    if (!buttons || buttons.length === 0) {
      window.alert(text);
    } else if (buttons.length === 1) {
      window.alert(text);
      if (buttons[0].onPress) {
        buttons[0].onPress();
      }
    } else {
      const result = window.confirm(text);
      if (result) {
        const okBtn = buttons.find(b => b.style !== 'cancel') || buttons[0];
        if (okBtn && okBtn.onPress) {
          okBtn.onPress();
        }
      } else {
        const cancelBtn = buttons.find(b => b.style === 'cancel');
        if (cancelBtn && cancelBtn.onPress) {
          cancelBtn.onPress();
        }
      }
    }
  };
}


function RootLayoutContent() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (isAuthLoading || !fontsLoaded) return;

    const inAuthGroup = segments[0] === '(tabs)';
    if (!user && inAuthGroup) {
      router.replace('/onboarding');
    }
  }, [user, isAuthLoading, segments, fontsLoaded]);

  // Tratar links profundos (Deep Links) no celular
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const handleDeepLink = async (event: { url: string }) => {
      try {
        const url = event.url;
        const params: Record<string, string> = {};
        
        // Parse query params (?...)
        const queryParts = url.split('?')[1];
        if (queryParts) {
          const pairs = queryParts.split('&');
          for (const pair of pairs) {
            const [key, value] = pair.split('=');
            if (key && value) {
              params[key] = decodeURIComponent(value);
            }
          }
        }

        // Parse hash params (#...)
        const hashParts = url.split('#')[1];
        if (hashParts) {
          const pairs = hashParts.split('&');
          for (const pair of pairs) {
            const [key, value] = pair.split('=');
            if (key && value) {
              params[key] = decodeURIComponent(value);
            }
          }
        }

        const { access_token, refresh_token, code } = params;

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) console.error('Erro ao definir sessão via deep link:', error);
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) console.error('Erro ao trocar código por sessão via deep link:', error);
        }
      } catch (e) {
        console.warn('Erro ao processar URL do deep link:', e);
      }
    };

    // Verificar se o app foi aberto através de um link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);

  // Ouvir o evento de redefinição de senha do Supabase
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/onboarding?reset=true');
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [router]);

  if (!fontsLoaded && !fontError) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-ivory">
        <ActivityIndicator size="large" color="#B97C63" />
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
