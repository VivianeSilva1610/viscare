import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { DataService } from '../services/dataService';

export default function Index() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const checkNavigation = async () => {
      if (!user) {
        router.replace('/onboarding');
      } else {
        try {
          const skinProfile = await DataService.getSkinProfile(user.id);
          if (skinProfile) {
            router.replace('/(tabs)');
          } else {
            router.replace('/onboarding');
          }
        } catch (e) {
          router.replace('/onboarding');
        }
      }
    };

    checkNavigation();
  }, [user, isLoading]);

  return (
    <View className="flex-1 items-center justify-center bg-[#FAF9F6]">
      <ActivityIndicator size="large" color="#8F9779" />
    </View>
  );
}
