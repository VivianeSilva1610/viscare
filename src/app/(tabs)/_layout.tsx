import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from '../../context/LocalizationContext';
import { Calendar, Layers, FolderHeart, Compass, Settings, CalendarHeart } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#B97C63', // Rose Gold Metálico
        tabBarInactiveTintColor: '#8C8E78', // Verde Sálvia Escuro
        tabBarStyle: {
          backgroundColor: '#F8F2EE', // Marfim Rosado (Fundo principal)
          borderTopWidth: 1,
          borderTopColor: '#E7D8D0', // Bege Rosado
          paddingTop: 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom + 4 : 8,
          height: 60 + (insets.bottom > 0 ? insets.bottom : 8),
        },
        tabBarLabelStyle: {
          fontFamily: 'Poppins_600SemiBold',
          fontSize: 9, // Ajustado ligeiramente para 6 abas caberem confortavelmente
          marginBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="today"
        options={{
          title: t('tabs.today'),
          tabBarLabel: t('tabs.today'),
          tabBarIcon: ({ color }) => <Calendar size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="routine"
        options={{
          title: t('tabs.routine'),
          tabBarLabel: t('tabs.routine'),
          tabBarIcon: ({ color }) => <Layers size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: t('tabs.products'),
          tabBarLabel: t('tabs.products'),
          tabBarIcon: ({ color }) => <FolderHeart size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: t('tabs.agenda'),
          tabBarLabel: t('tabs.agenda'),
          tabBarIcon: ({ color }) => <CalendarHeart size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: t('tabs.discover'),
          tabBarLabel: t('tabs.discover'),
          tabBarIcon: ({ color }) => <Compass size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarLabel: t('tabs.settings'),
          tabBarIcon: ({ color }) => <Settings size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}
