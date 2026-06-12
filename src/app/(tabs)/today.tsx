import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LocalizationContext';
import { DataService } from '../../services/dataService';
import { UserProduct, Routine, RoutineStep } from '../../services/mockDb';
import { CheckCircle2, Circle, Flame, Sun, Moon, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';

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

  useEffect(() => {
    // Definir saudação baseada na hora local
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
      // 1. Obter Perfil para ver a Streak
      const profile = await DataService.getProfile(user.id);
      setStreak(profile.streak_count);

      // 2. Obter Rotinas
      const routines = await DataService.getRoutines(user.id);
      const amRot = routines.find(r => r.type === 'AM') || null;
      const pmRot = routines.find(r => r.type === 'PM') || null;
      setAmRoutine(amRot);
      setPmRoutine(pmRot);

      // 3. Obter produtos do gabinete
      const cabinet = await DataService.getUserProducts(user.id);

      // 4. Obter passos de cada rotina e anexar informações do produto
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

  // Recarregar dados sempre que a tela ganhar foco
  // Em Expo Router, podemos usar hooks ou simplesmente confiar que as transições atualizam o estado.
  // Vamos recarregar os dados na montagem e fornecer um método pull-to-refresh opcional, ou disparar a atualização reativa.

  const toggleStep = async (stepId: string, routineType: 'AM' | 'PM') => {
    const isAm = routineType === 'AM';
    const stepsList = isAm ? amSteps : pmSteps;
    const setStepsList = isAm ? setAmSteps : setPmSteps;
    const routineId = isAm ? amRoutine?.id : pmRoutine?.id;

    if (!routineId) return;

    // Atualizar estado local
    const updated = stepsList.map(s => {
      if (s.id === stepId) {
        return { ...s, is_completed: !s.is_completed };
      }
      return s;
    });
    setStepsList(updated);

    // Salvar no banco
    try {
      await DataService.saveRoutineSteps(routineId, updated);

      // Verificar se toda a rotina foi completada hoje
      const allDone = updated.every(s => s.is_completed);
      if (allDone && updated.length > 0 && user) {
        // Aumentar streak
        const profile = await DataService.getProfile(user.id);
        const todayStr = new Date().toISOString().split('T')[0];
        
        if (profile.last_active_date !== todayStr) {
          const newStreak = profile.streak_count + 1;
          await DataService.updateProfile(user.id, {
            streak_count: newStreak,
            last_active_date: todayStr
          });
          setStreak(newStreak);
          
          Alert.alert(
            '🌟 Perfetto!',
            language === 'it' 
              ? `Hai completato la tua routine! Nuova serie: ${newStreak} giorni.` 
              : language === 'pt' 
                ? `Você completou sua rotina! Nova sequência: ${newStreak} dias.` 
                : `You completed your routine! New streak: ${newStreak} days.`,
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
      <View className="flex-1 items-center justify-center bg-[#FAF9F6]">
        <ActivityIndicator size="large" color="#8F9779" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#FAF9F6] px-6 pt-12">
      {/* Header */}
      <View className="flex-row justify-between items-center mt-4 mb-6">
        <View className="flex-1 pr-4">
          <Text className="text-3xl font-serif text-[#2C2C2E] font-bold leading-tight">
            {greeting}
          </Text>
        </View>
        {/* Streak Badge */}
        <View className="bg-[#D97D64]/10 px-4 py-2 rounded-full flex-row items-center space-x-1">
          <Flame size={18} color="#D97D64" fill="#D97D64" />
          <Text className="font-sans text-xs font-bold text-[#D97D64]">
            {streak} {t('home.streak')}
          </Text>
        </View>
      </View>

      {/* Routine AM Checklist */}
      <View className="mb-6">
        <View className="flex-row items-center space-x-2 mb-3">
          <Sun size={20} color="#8F9779" />
          <Text className="font-serif text-lg text-[#2C2C2E] font-bold">{t('home.routine_am')}</Text>
        </View>

        {amSteps.length === 0 ? (
          <View className="bg-white p-5 rounded-3xl border border-[#F2F0EB] items-center">
            <Text className="text-sm font-sans text-[#6E6E73] text-center mb-4 leading-relaxed">
              {t('home.checklist_empty')}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/routine')}
              className="px-4 py-2 bg-[#8F9779]/10 rounded-full flex-row items-center space-x-1"
            >
              <Text className="font-sans text-xs font-bold text-[#8F9779]">Crea Routine</Text>
              <ArrowRight size={14} color="#8F9779" />
            </TouchableOpacity>
          </View>
        ) : (
          <View className="space-y-3">
            {amSteps.map(step => (
              <TouchableOpacity
                key={step.id}
                activeOpacity={0.8}
                onPress={() => toggleStep(step.id, 'AM')}
                className={`flex-row items-center p-4 bg-white border rounded-3xl shadow-sm ${step.is_completed ? 'border-[#8F9779]/20 opacity-80' : 'border-[#F2F0EB]'}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: step.is_completed }}
              >
                <View className="mr-3">
                  {step.is_completed ? (
                    <CheckCircle2 size={24} color="#8F9779" />
                  ) : (
                    <Circle size={24} color="#C6C6C8" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className={`font-sans text-sm font-bold ${step.is_completed ? 'line-through text-[#8E8E93]' : 'text-[#2C2C2E]'}`}>
                    {step.product?.custom_name || 'Prodotto'}
                  </Text>
                  <Text className="font-sans text-xs text-[#8E8E93]">
                    {step.product?.custom_brand || 'Marca'} • <Text className="capitalize">{t(`quiz.type_${step.product?.custom_category || 'cleanser'}`)}</Text>
                  </Text>
                  {step.notes ? (
                    <Text className="font-sans text-xs text-[#8F9779] mt-1 italic">
                      {step.notes}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Routine PM Checklist */}
      <View className="mb-12">
        <View className="flex-row items-center space-x-2 mb-3">
          <Moon size={20} color="#8F9779" />
          <Text className="font-serif text-lg text-[#2C2C2E] font-bold">{t('home.routine_pm')}</Text>
        </View>

        {pmSteps.length === 0 ? (
          <View className="bg-white p-5 rounded-3xl border border-[#F2F0EB] items-center">
            <Text className="text-sm font-sans text-[#6E6E73] text-center mb-4 leading-relaxed">
              {t('home.checklist_empty')}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/routine')}
              className="px-4 py-2 bg-[#8F9779]/10 rounded-full flex-row items-center space-x-1"
            >
              <Text className="font-sans text-xs font-bold text-[#8F9779]">Crea Routine</Text>
              <ArrowRight size={14} color="#8F9779" />
            </TouchableOpacity>
          </View>
        ) : (
          <View className="space-y-3">
            {pmSteps.map(step => (
              <TouchableOpacity
                key={step.id}
                activeOpacity={0.8}
                onPress={() => toggleStep(step.id, 'PM')}
                className={`flex-row items-center p-4 bg-white border rounded-3xl shadow-sm ${step.is_completed ? 'border-[#8F9779]/20 opacity-80' : 'border-[#F2F0EB]'}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: step.is_completed }}
              >
                <View className="mr-3">
                  {step.is_completed ? (
                    <CheckCircle2 size={24} color="#8F9779" />
                  ) : (
                    <Circle size={24} color="#C6C6C8" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className={`font-sans text-sm font-bold ${step.is_completed ? 'line-through text-[#8E8E93]' : 'text-[#2C2C2E]'}`}>
                    {step.product?.custom_name || 'Prodotto'}
                  </Text>
                  <Text className="font-sans text-xs text-[#8E8E93]">
                    {step.product?.custom_brand || 'Marca'} • <Text className="capitalize">{t(`quiz.type_${step.product?.custom_category || 'cleanser'}`)}</Text>
                  </Text>
                  {step.notes ? (
                    <Text className="font-sans text-xs text-[#8F9779] mt-1 italic">
                      {step.notes}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
