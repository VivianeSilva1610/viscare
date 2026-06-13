import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LocalizationContext';
import { DataService } from '../../services/dataService';
import { UserProduct, Routine, RoutineStep } from '../../services/mockDb';
import { CheckCircle2, Circle, Flame, Sun, Moon, ArrowRight, Star, CalendarHeart } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function TodayScreen() {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [greeting, setGreeting] = useState<string>('');
  const [streak, setStreak] = useState<number>(0);
  const [amSteps, setAmSteps] = useState<(RoutineStep & { product?: UserProduct })[]>([]);
  const [pmSteps, setPmSteps] = useState<(RoutineStep & { product?: UserProduct })[]>([]);
  const [amRoutine, setAmRoutine] = useState<Routine | null>(null);
  const [pmRoutine, setPmRoutine] = useState<Routine | null>(null);
  const [favorites, setFavorites] = useState<UserProduct[]>([]);
  
  const [skinScore, setSkinScore] = useState<number>(85); // Mock score base

  useEffect(() => {
    const hours = new Date().getHours();
    if (hours < 12) {
      setGreeting(t('home.greeting_morning'));
    } else if (hours < 18) {
      setGreeting(t('home.greeting_afternoon'));
    } else {
      setGreeting(t('home.greeting_evening'));
    }
  }, [language]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const profile = await DataService.getProfile(user.id);
      setStreak(profile.streak_count);
      
      // Calculate dynamic score based on streak
      setSkinScore(Math.min(98, 75 + (profile.streak_count * 2)));

      const routines = await DataService.getRoutines(user.id);
      const amRot = routines.find(r => r.type === 'AM') || null;
      const pmRot = routines.find(r => r.type === 'PM') || null;
      setAmRoutine(amRot);
      setPmRoutine(pmRot);

      const cabinet = await DataService.getUserProducts(user.id);
      // Pega 2 produtos aleatórios para serem favoritos
      setFavorites(cabinet.slice(0, 2));

      if (amRot) {
        const steps = await DataService.getRoutineSteps(amRot.id);
        const enriched = steps.map(s => ({
          ...s,
          product: cabinet.find(p => p.id === s.user_product_id)
        })).sort((a, b) => a.position - b.position);
        setAmSteps(enriched);
      }

      if (pmRot) {
        const steps = await DataService.getRoutineSteps(pmRot.id);
        const enriched = steps.map(s => ({
          ...s,
          product: cabinet.find(p => p.id === s.user_product_id)
        })).sort((a, b) => a.position - b.position);
        setPmSteps(enriched);
      }
    } catch (e) {
      console.warn('Erro ao carregar dados do dia', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const toggleStep = async (stepId: string, routineType: 'AM' | 'PM') => {
    const isAm = routineType === 'AM';
    const stepsList = isAm ? amSteps : pmSteps;
    const setStepsList = isAm ? setAmSteps : setPmSteps;
    const routineId = isAm ? amRoutine?.id : pmRoutine?.id;

    if (!routineId) return;

    const updated = stepsList.map(s => {
      if (s.id === stepId) {
        return { ...s, is_completed: !s.is_completed };
      }
      return s;
    });
    setStepsList(updated);

    try {
      await DataService.saveRoutineSteps(routineId, updated);
      const allDone = updated.every(s => s.is_completed);
      if (allDone && updated.length > 0 && user) {
        const profile = await DataService.getProfile(user.id);
        const todayStr = new Date().toISOString().split('T')[0];
        
        if (profile.last_active_date !== todayStr) {
          const newStreak = profile.streak_count + 1;
          await DataService.updateProfile(user.id, {
            streak_count: newStreak,
            last_active_date: todayStr
          });
          setStreak(newStreak);
          setSkinScore(Math.min(98, skinScore + 2));
          
          Alert.alert(
            t('alert.streak_title'),
            t('alert.streak_msg').replace('{n}', newStreak.toString()),
            [{ text: 'OK' }]
          );
        }
      }
    } catch (e) {
      console.warn('Erro ao salvar passo concluído', e);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-ivory">
        <ActivityIndicator size="large" color="#B97C63" />
      </View>
    );
  }

  // Define circular progress logic
  const circumference = 2 * Math.PI * 30; // radius 30
  const strokeDashoffset = circumference - (skinScore / 100) * circumference;

  return (
    <ScrollView className="flex-1 bg-brand-ivory px-6 pt-12 pb-24">
      {/* Header Saudação */}
      <View className="flex-row justify-between items-center mt-4 mb-6">
        <View className="flex-1 pr-4">
          <Text className="text-3xl font-serif text-brand-bronze font-bold leading-tight">
            {greeting}
          </Text>
          <Text className="text-sm font-sans text-brand-sage-dark mt-1">
            Pronta per la tua skin routine?
          </Text>
        </View>
      </View>

      {/* Hero Card: Skin Score & Streak */}
      <View className="bg-brand-nude p-6 rounded-3xl mb-8 flex-row items-center justify-between shadow-sm border border-white/50">
        <View className="flex-1 pr-4">
          <Text className="font-sans text-xs uppercase tracking-widest font-semibold text-brand-bronze mb-1">
            Skin Health
          </Text>
          <Text className="font-serif text-3xl font-bold text-brand-charcoal mb-2">
            {skinScore}<Text className="text-lg">/100</Text>
          </Text>
          
          <View className="bg-white/60 self-start px-3 py-1.5 rounded-full flex-row items-center space-x-1 mt-2">
            <Flame size={14} color="#D97D64" fill="#D97D64" />
            <Text className="font-sans text-xs font-semibold text-brand-charcoal">
              {streak} {t('home.streak')}
            </Text>
          </View>
        </View>

        {/* Circular Progress (SVG Mock with View for now) */}
        <View className="w-20 h-20 bg-white rounded-full items-center justify-center shadow-sm border-[4px] border-brand-rose-light">
          <Text className="font-sans font-bold text-lg text-brand-bronze">{skinScore}%</Text>
        </View>
      </View>

      {/* Próximos Cuidados (Agenda Preview) */}
      <View className="mb-8">
        <Text className="font-serif text-xl text-brand-charcoal font-bold mb-4">Próximos Cuidados</Text>
        <TouchableOpacity 
          onPress={() => router.push('/(tabs)/agenda')}
          className="bg-white p-4 rounded-2xl flex-row items-center justify-between border border-brand-warm-gray shadow-sm"
        >
          <View className="flex-row items-center">
            <View className="w-12 h-12 bg-brand-nude rounded-full items-center justify-center mr-4">
              <CalendarHeart size={20} color="#B97C63" />
            </View>
            <View>
              <Text className="font-sans text-sm font-bold text-brand-charcoal">Limpeza de Pele Profunda</Text>
              <Text className="font-sans text-xs text-brand-sage-dark mt-0.5">Sexta-feira, 14:00 • Clínica VisCare</Text>
            </View>
          </View>
          <ArrowRight size={18} color="#D7A58D" />
        </TouchableOpacity>
      </View>

      {/* Routine AM Checklist */}
      <View className="mb-8">
        <View className="flex-row items-center space-x-2 mb-4">
          <Sun size={22} color="#B97C63" />
          <Text className="font-serif text-xl text-brand-charcoal font-bold">{t('home.routine_am')}</Text>
        </View>

        {amSteps.length === 0 ? (
          <View className="bg-white p-6 rounded-3xl border border-brand-warm-gray items-center shadow-sm">
            <Text className="text-sm font-sans text-brand-sage-dark text-center mb-4 leading-relaxed">
              {t('home.checklist_empty')}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/routine')}
              className="px-5 py-2.5 bg-brand-rose-metallic rounded-full flex-row items-center space-x-2 shadow-sm"
            >
              <Text className="font-sans text-xs font-semibold text-white uppercase tracking-wider">{t('home.create_routine')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="space-y-3">
            {amSteps.map(step => (
              <TouchableOpacity
                key={step.id}
                activeOpacity={0.8}
                onPress={() => toggleStep(step.id, 'AM')}
                className={`flex-row items-center p-4 bg-white border rounded-2xl shadow-sm ${step.is_completed ? 'border-brand-sage-light opacity-75' : 'border-brand-warm-gray'}`}
              >
                <View className="mr-4">
                  {step.is_completed ? (
                    <CheckCircle2 size={24} color="#AEB09B" />
                  ) : (
                    <Circle size={24} color="#E7D8D0" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className={`font-sans text-sm font-bold ${step.is_completed ? 'line-through text-brand-sage-dark' : 'text-brand-charcoal'}`}>
                    {step.product?.custom_name || t('home.product_default')}
                  </Text>
                  <Text className="font-sans text-xs text-brand-sage-dark mt-0.5">
                    {step.product?.custom_brand || t('home.brand_default')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Produtos Favoritos */}
      {favorites.length > 0 && (
        <View className="mb-8">
          <Text className="font-serif text-xl text-brand-charcoal font-bold mb-4">Meus Favoritos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible pb-4">
            {favorites.map(fav => (
              <View key={fav.id} className="bg-white border border-brand-warm-gray rounded-2xl p-4 w-48 mr-4 shadow-sm items-center">
                <View className="w-16 h-16 bg-brand-ivory rounded-full items-center justify-center mb-3">
                  <Star size={24} color="#D7A58D" fill="#F1E7E2" />
                </View>
                <Text className="font-sans text-sm font-bold text-brand-charcoal text-center line-clamp-2">{fav.custom_name}</Text>
                <Text className="font-sans text-xs text-brand-sage-dark mt-1 text-center">{fav.custom_brand}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Routine PM Checklist */}
      <View className="mb-16">
        <View className="flex-row items-center space-x-2 mb-4">
          <Moon size={22} color="#B97C63" />
          <Text className="font-serif text-xl text-brand-charcoal font-bold">{t('home.routine_pm')}</Text>
        </View>

        {pmSteps.length === 0 ? (
          <View className="bg-white p-6 rounded-3xl border border-brand-warm-gray items-center shadow-sm">
            <Text className="text-sm font-sans text-brand-sage-dark text-center mb-4 leading-relaxed">
              {t('home.checklist_empty')}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/routine')}
              className="px-5 py-2.5 bg-brand-rose-metallic rounded-full flex-row items-center space-x-2 shadow-sm"
            >
              <Text className="font-sans text-xs font-semibold text-white uppercase tracking-wider">{t('home.create_routine')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="space-y-3">
            {pmSteps.map(step => (
              <TouchableOpacity
                key={step.id}
                activeOpacity={0.8}
                onPress={() => toggleStep(step.id, 'PM')}
                className={`flex-row items-center p-4 bg-white border rounded-2xl shadow-sm ${step.is_completed ? 'border-brand-sage-light opacity-75' : 'border-brand-warm-gray'}`}
              >
                <View className="mr-4">
                  {step.is_completed ? (
                    <CheckCircle2 size={24} color="#AEB09B" />
                  ) : (
                    <Circle size={24} color="#E7D8D0" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className={`font-sans text-sm font-bold ${step.is_completed ? 'line-through text-brand-sage-dark' : 'text-brand-charcoal'}`}>
                    {step.product?.custom_name || t('home.product_default')}
                  </Text>
                  <Text className="font-sans text-xs text-brand-sage-dark mt-0.5">
                    {step.product?.custom_brand || t('home.brand_default')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
