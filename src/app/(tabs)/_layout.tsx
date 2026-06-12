import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from '../../context/LocalizationContext';
import { Calendar, Layers, FolderHeart, Compass, Settings } from 'lucide-react-native';

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#8F9779', // Sage Green
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FAF9F6', // Off-white
          borderTopWidth: 1,
          borderTopColor: '#F2F0EB',
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter_600SemiBold',
          fontSize: 10,
          marginBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Oggi',
          tabBarLabel: 'Oggi',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="routine"
        options={{
          title: t('routine.tab_title'),
          tabBarLabel: t('routine.tab_title'),
          tabBarIcon: ({ color, size }) => <Layers size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Armadietto',
          tabBarLabel: 'Cabinet',
          tabBarIcon: ({ color, size }) => <FolderHeart size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: t('discover.title'),
          tabBarLabel: t('discover.title'),
          tabBarIcon: ({ color, size }) => <Compass size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Impostazioni',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
