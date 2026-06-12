import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LocalizationContext';
import { DataService } from '../services/dataService';
import { supabase } from '../services/supabase';
import { NotificationService } from '../services/notifications';

import { Heart, Bell, Shield, ArrowRight, Check, User, Mail, Lock, Sparkles } from 'lucide-react-native';

export default function Onboarding() {
  const { t, language } = useTranslation();
  const { signUp, signIn, loginAsGuest, user } = useAuth();
  const router = useRouter();

  // Estados de navegação do quiz
  const [step, setStep] = useState<number>(0);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Estados dos dados do quiz
  const [age, setAge] = useState<string>('');
  const [skinType, setSkinType] = useState<'oily' | 'dry' | 'combination' | 'normal'>('normal');
  const [isSensitive, setIsSensitive] = useState<boolean>(false);
  const [goals, setGoals] = useState<string[]>([]);
  const [concerns, setConcerns] = useState<string[]>([]);

  // Estados de autenticação
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isSignUpMode, setIsSignUpMode] = useState<boolean>(true);

  // Lista de objetivos e preocupações para renderizar
  const goalsOptions = ['hydration', 'anti_aging', 'acne', 'brightening', 'barrier'];
  const concernsOptions = ['redness', 'dark_spots', 'acne_scars', 'fine_lines', 'pores', 'dryness'];

  const toggleGoal = (goal: string) => {
    if (goals.includes(goal)) {
      setGoals(goals.filter(g => g !== goal));
    } else {
      setGoals([...goals, goal]);
    }
  };

  const toggleConcern = (concern: string) => {
    if (concerns.includes(concern)) {
      setConcerns(concerns.filter(c => c !== concern));
    } else {
      setConcerns([...concerns, concern]);
    }
  };

  // Avançar nos passos
  const nextStep = () => {
    if (step === 0 && !disclaimerAccepted) {
      Alert.alert(
        language === 'it' ? 'Attenzione' : language === 'pt' ? 'Atenção' : 'Warning',
        language === 'it' 
          ? 'Devi accettare la dichiarazione di non responsabilità medica per continuare.' 
          : language === 'pt' 
            ? 'Você deve aceitar o aviso de isenção de responsabilidade médica para continuar.' 
            : 'You must accept the medical disclaimer to continue.'
      );
      return;
    }
    if (step === 1) {
      const parsedAge = parseInt(age, 10);
      if (!age || isNaN(parsedAge) || parsedAge <= 0 || parsedAge > 120) {
        Alert.alert(
          language === 'it' ? 'Età non valida' : language === 'pt' ? 'Idade inválida' : 'Invalid Age',
          language === 'it' 
            ? 'Per favore, inserisci un\'età valida per continuare.' 
            : language === 'pt' 
              ? 'Por favor, insira uma idade válida para continuar.' 
              : 'Please enter a valid age to continue.'
        );
        return;
      }
    }
    setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  // Tratar ativação de notificações
  const handleEnableNotifications = async () => {
    setLoading(true);
    const granted = await NotificationService.requestPermissions();
    if (granted) {
      await NotificationService.scheduleDailyReminders(language);
    }
    setLoading(false);
    nextStep();
  };

  // Salvar perfil do quiz e redirecionar
  const handleSaveQuizAndNavigate = async (userId: string) => {
    try {
      await DataService.saveSkinProfile(userId, {
        skin_type: skinType,
        age: parseInt(age, 10),
        is_sensitive: isSensitive,
        goals: goals.map(g => t(`quiz.goal_${g}`)),
        concerns: concerns.map(c => t(`quiz.concern_${c}`))
      });
      router.replace('/(tabs)/today');
    } catch (e) {
      console.warn('Erro ao salvar quiz de pele', e);
      router.replace('/(tabs)/today');
    }
  };

  // Finalizar como Guest
  const handleGuestAccess = async () => {
    setLoading(true);
    await loginAsGuest();
    // Após logar como guest, o `user` é criado com ID guest. Passamos esse ID diretamente.
    await handleSaveQuizAndNavigate('guest-user-id');
    setLoading(false);
  };

  // Autenticação Real ou Fallback
  const handleAuthSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Inserisci email e password.');
      return;
    }
    setLoading(true);
    let res;
    if (isSignUpMode) {
      res = await signUp(email, password);
    } else {
      res = await signIn(email, password);
    }

    if (res.success) {
      // Como o Supabase Auth cria o usuário assincronamente e altera a sessão,
      // buscamos a sessão ativa para obter o ID do usuário criado.
      const { data } = await supabase.auth.getSession();
      const currentUid = data.session?.user?.id || 'guest-user-id';
      await handleSaveQuizAndNavigate(currentUid);
    } else {
      Alert.alert('Erro', res.error || 'Erro na autenticação');
    }
    setLoading(false);
  };

  return (
    <View className="flex-1 bg-[#FAF9F6]">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 py-12">
        
        {/* PASSO 0: BOAS-VINDAS E ADVERTÊNCIA MÉDICA */}
        {step === 0 && (
          <View className="flex-1 justify-between py-6">
            <View className="items-center mt-6">
              <Text className="text-4xl font-serif text-[#2C2C2E] font-bold text-center tracking-tight">
                {t('welcome.title')}
              </Text>
              <Text className="text-base font-sans text-[#8F9779] mt-2 tracking-wide uppercase font-semibold">
                {t('welcome.subtitle')}
              </Text>
            </View>

            <View className="my-8 space-y-4">
              <View className="flex-row items-start space-x-3 p-4 bg-[#F2F0EB] rounded-2xl">
                <Sparkles size={24} color="#8F9779" />
                <Text className="flex-1 font-sans text-sm text-[#2C2C2E] leading-relaxed">
                  {t('welcome.value_prop1')}
                </Text>
              </View>

              <View className="flex-row items-start space-x-3 p-4 bg-[#F2F0EB] rounded-2xl">
                <Heart size={24} color="#8F9779" />
                <Text className="flex-1 font-sans text-sm text-[#2C2C2E] leading-relaxed">
                  {t('welcome.value_prop2')}
                </Text>
              </View>

              <View className="flex-row items-start space-x-3 p-4 bg-[#F2F0EB] rounded-2xl">
                <Shield size={24} color="#8F9779" />
                <Text className="flex-1 font-sans text-sm text-[#2C2C2E] leading-relaxed">
                  {t('welcome.value_prop3')}
                </Text>
              </View>
            </View>

            {/* Aviso Médico */}
            <View className="p-5 bg-white border border-[#F2F0EB] rounded-3xl shadow-sm mb-6">
              <Text className="text-sm font-serif text-[#D97D64] font-bold mb-2 flex-row items-center">
                ⚠️ {t('welcome.disclaimer_title')}
              </Text>
              <Text className="text-xs font-sans text-[#6E6E73] leading-relaxed">
                {t('welcome.disclaimer_text')}
              </Text>
              
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => setDisclaimerAccepted(!disclaimerAccepted)}
                className="flex-row items-center mt-4 p-2"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: disclaimerAccepted }}
                accessibilityLabel="Accetta la dichiarazione medica"
              >
                <View className={`w-5 h-5 rounded-md border items-center justify-center mr-3 ${disclaimerAccepted ? 'bg-[#8F9779] border-[#8F9779]' : 'border-[#C6C6C8]'}`}>
                  {disclaimerAccepted && <Check size={14} color="white" />}
                </View>
                <Text className="text-xs font-sans text-[#2C2C2E] font-medium">
                  {t('welcome.accept_disclaimer')}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={nextStep}
              className={`w-full py-4 rounded-full flex-row items-center justify-center space-x-2 ${disclaimerAccepted ? 'bg-[#8F9779]' : 'bg-[#C6C6C8]'}`}
            >
              <Text className="text-white font-sans text-base font-bold">{t('welcome.next')}</Text>
              <ArrowRight size={18} color="white" />
            </TouchableOpacity>
          </View>
        )}

        {/* PASSO 1: QUIZ DA PELE */}
        {step === 1 && (
          <View className="flex-1 justify-between py-6">
            <View>
              <Text className="text-2xl font-serif text-[#2C2C2E] font-bold text-center">
                {t('quiz.title')}
              </Text>
              <Text className="text-sm font-sans text-[#6E6E73] text-center mt-1">
                {t('quiz.subtitle')}
              </Text>

              {/* Idade */}
              <View className="mt-6">
                <Text className="text-sm font-sans text-[#2C2C2E] font-semibold mb-2">
                  {t('quiz.age_question')}
                </Text>
                <TextInput
                  placeholder="25"
                  keyboardType="number-pad"
                  value={age}
                  onChangeText={setAge}
                  className="bg-white px-4 py-3 border border-[#E5E5EA] rounded-2xl font-sans text-base text-[#2C2C2E]"
                />
              </View>

              {/* Tipo de Pele */}
              <View className="mt-6">
                <Text className="text-sm font-sans text-[#2C2C2E] font-semibold mb-2">
                  {t('quiz.type_question')}
                </Text>
                <View className="flex-row flex-wrap justify-between">
                  {(['oily', 'dry', 'combination', 'normal'] as const).map(type => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setSkinType(type)}
                      className={`w-[48%] py-3 mb-3 border rounded-2xl items-center ${skinType === type ? 'bg-[#8F9779]/10 border-[#8F9779]' : 'bg-white border-[#E5E5EA]'}`}
                    >
                      <Text className={`font-sans text-sm font-medium ${skinType === type ? 'text-[#8F9779]' : 'text-[#2C2C2E]'}`}>
                        {t(`quiz.type_${type}`)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Sensibilidade */}
              <View className="mt-4">
                <Text className="text-sm font-sans text-[#2C2C2E] font-semibold mb-2">
                  {t('quiz.sensitivity_question')}
                </Text>
                <View className="flex-row justify-between">
                  <TouchableOpacity
                    onPress={() => setIsSensitive(true)}
                    className={`w-[48%] py-3 border rounded-2xl items-center ${isSensitive ? 'bg-[#8F9779]/10 border-[#8F9779]' : 'bg-white border-[#E5E5EA]'}`}
                  >
                    <Text className={`font-sans text-sm font-medium ${isSensitive ? 'text-[#8F9779]' : 'text-[#2C2C2E]'}`}>
                      {t('quiz.sens_yes')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setIsSensitive(false)}
                    className={`w-[48%] py-3 border rounded-2xl items-center ${!isSensitive ? 'bg-[#8F9779]/10 border-[#8F9779]' : 'bg-white border-[#E5E5EA]'}`}
                  >
                    <Text className={`font-sans text-sm font-medium ${!isSensitive ? 'text-[#8F9779]' : 'text-[#2C2C2E]'}`}>
                      {t('quiz.sens_no')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Objetivos (Múltipla Escolha) */}
              <View className="mt-6">
                <Text className="text-sm font-sans text-[#2C2C2E] font-semibold mb-2">
                  {t('quiz.goals_question')}
                </Text>
                <View className="flex-row flex-wrap">
                  {goalsOptions.map(g => {
                    const isSelected = goals.includes(g);
                    return (
                      <TouchableOpacity
                        key={g}
                        onPress={() => toggleGoal(g)}
                        className={`mr-2 mb-2 px-3 py-2 border rounded-full ${isSelected ? 'bg-[#8F9779] border-[#8F9779]' : 'bg-white border-[#E5E5EA]'}`}
                      >
                        <Text className={`font-sans text-xs font-medium ${isSelected ? 'text-white' : 'text-[#2C2C2E]'}`}>
                          {t(`quiz.goal_${g}`)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Preocupações (Múltipla Escolha) */}
              <View className="mt-4">
                <Text className="text-sm font-sans text-[#2C2C2E] font-semibold mb-2">
                  {t('quiz.concerns_question')}
                </Text>
                <View className="flex-row flex-wrap">
                  {concernsOptions.map(c => {
                    const isSelected = concerns.includes(c);
                    return (
                      <TouchableOpacity
                        key={c}
                        onPress={() => toggleConcern(c)}
                        className={`mr-2 mb-2 px-3 py-2 border rounded-full ${isSelected ? 'bg-[#D97D64] border-[#D97D64]' : 'bg-white border-[#E5E5EA]'}`}
                      >
                        <Text className={`font-sans text-xs font-medium ${isSelected ? 'text-white' : 'text-[#2C2C2E]'}`}>
                          {t(`quiz.concern_${c}`)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            <View className="flex-row justify-between mt-8">
              <TouchableOpacity
                onPress={prevStep}
                className="w-[45%] py-4 border border-[#E5E5EA] bg-white rounded-full items-center"
              >
                <Text className="text-[#2C2C2E] font-sans font-bold">Indietro</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={nextStep}
                className="w-[45%] py-4 bg-[#8F9779] rounded-full items-center"
              >
                <Text className="text-white font-sans font-bold">{t('welcome.next')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* PASSO 2: NOTIFICAÇÕES */}
        {step === 2 && (
          <View className="flex-1 justify-between py-6">
            <View className="items-center justify-center flex-1 my-10">
              <View className="w-20 h-20 bg-[#8F9779]/10 rounded-full items-center justify-center mb-6">
                <Bell size={40} color="#8F9779" />
              </View>
              <Text className="text-2xl font-serif text-[#2C2C2E] font-bold text-center">
                {t('notif.title')}
              </Text>
              <Text className="text-sm font-sans text-[#6E6E73] text-center mt-4 leading-relaxed max-w-xs">
                {t('notif.text')}
              </Text>
            </View>

            <View className="space-y-3">
              <TouchableOpacity
                onPress={handleEnableNotifications}
                className="w-full py-4 bg-[#8F9779] rounded-full items-center flex-row justify-center space-x-2"
              >
                {loading ? <ActivityIndicator size="small" color="white" /> : (
                  <>
                    <Bell size={18} color="white" />
                    <Text className="text-white font-sans text-base font-bold">{t('notif.enable')}</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={nextStep}
                className="w-full py-4 bg-transparent rounded-full items-center"
              >
                <Text className="text-[#8F9779] font-sans text-base font-semibold">{t('notif.skip')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* PASSO 3: CRIAR CONTA OU GUEST */}
        {step === 3 && (
          <View className="flex-1 justify-between py-6">
            <View>
              <Text className="text-2xl font-serif text-[#2C2C2E] font-bold text-center">
                {t('auth.title')}
              </Text>
              <Text className="text-sm font-sans text-[#6E6E73] text-center mt-1 mb-8">
                {t('auth.subtitle')}
              </Text>

              {/* Formulário de Email/Senha */}
              <View className="space-y-4">
                <View>
                  <Text className="text-sm font-sans text-[#2C2C2E] font-semibold mb-2">{t('auth.email')}</Text>
                  <TextInput
                    placeholder="example@email.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    className="bg-white px-4 py-3 border border-[#E5E5EA] rounded-2xl font-sans text-base"
                  />
                </View>

                <View>
                  <Text className="text-sm font-sans text-[#2C2C2E] font-semibold mb-2">{t('auth.password')}</Text>
                  <TextInput
                    placeholder="••••••••"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    className="bg-white px-4 py-3 border border-[#E5E5EA] rounded-2xl font-sans text-base"
                  />
                </View>

                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={handleAuthSubmit}
                  className="w-full py-4 bg-[#8F9779] rounded-full items-center mt-4"
                >
                  {loading ? <ActivityIndicator size="small" color="white" /> : (
                    <Text className="text-white font-sans text-base font-bold">
                      {isSignUpMode ? t('auth.signup') : t('auth.signin')}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Alternar entre Login/Cadastro */}
                <TouchableOpacity
                  onPress={() => setIsSignUpMode(!isSignUpMode)}
                  className="py-2 items-center"
                >
                  <Text className="text-sm font-sans text-[#8F9779] font-medium">
                    {isSignUpMode 
                      ? (language === 'it' ? 'Hai già un account? Accedi' : language === 'pt' ? 'Já tem uma conta? Entrar' : 'Already have an account? Sign In')
                      : (language === 'it' ? 'Non hai un account? Registrati' : language === 'pt' ? 'Não tem uma conta? Cadastrar' : 'Don\'t have an account? Sign Up')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Separador */}
              <View className="flex-row items-center my-6">
                <View className="flex-1 h-[1px] bg-[#E5E5EA]" />
                <Text className="text-xs font-sans text-[#6E6E73] px-3">{t('auth.or')}</Text>
                <View className="flex-1 h-[1px] bg-[#E5E5EA]" />
              </View>

              {/* Botões Sociais Mockados */}
              <View className="flex-row justify-between mb-4">
                <TouchableOpacity
                  onPress={handleGuestAccess}
                  className="w-[48%] py-3 border border-[#E5E5EA] bg-white rounded-2xl items-center flex-row justify-center space-x-2"
                >
                  <Text className="font-sans text-sm font-medium text-[#2C2C2E]">{t('auth.google')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleGuestAccess}
                  className="w-[48%] py-3 border border-[#E5E5EA] bg-white rounded-2xl items-center flex-row justify-center space-x-2"
                >
                  <Text className="font-sans text-sm font-medium text-[#2C2C2E]">{t('auth.apple')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Acesso Visitante */}
            <TouchableOpacity
              onPress={handleGuestAccess}
              className="w-full py-4 bg-transparent border border-[#8F9779] rounded-full items-center"
            >
              <Text className="text-[#8F9779] font-sans text-base font-bold">
                {t('auth.guest')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
