import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Image, Modal, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTranslation, Language } from '../context/LocalizationContext';
import { DataService } from '../services/dataService';
import { supabase } from '../services/supabase';
import { NotificationService } from '../services/notifications';
import { AIRecommendationService, ProductRecommendation } from '../services/aiRecommendations';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Heart, Bell, Shield, ArrowRight, Check, User, Mail, Lock, Sparkles, Globe, CheckCircle2, X } from 'lucide-react-native';

export default function Onboarding() {
  const { t, language, setLanguage } = useTranslation();
  const { signUp, signIn, loginAsGuest, user, profile, resetPassword, updatePassword } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();

  // Estados de navegação do onboarding
  const [step, setStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // STEP 0: Auth
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isSignUpMode, setIsSignUpMode] = useState<boolean>(true);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // Estados de recuperação de senha
  const [forgotModalVisible, setForgotModalVisible] = useState<boolean>(false);
  const [resetModalVisible, setResetModalVisible] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  useEffect(() => {
    if (params?.reset === 'true') {
      setResetModalVisible(true);
    }
  }, [params]);

  useEffect(() => {
    // Se o utilizador já estiver logado como utilizador real (não guest) e não tiver skinProfile,
    // pula a tela de Auth e vai direto para o Disclaimer/Quiz.
    // Se for guest, queremos mostrar a tela de Auth para dar a chance de criar conta.
    const skipAuthIfRealUser = async () => {
      const isGuestFlag = await AsyncStorage.getItem('viscare_is_guest');
      if (user && isGuestFlag !== 'true' && step === 0) {
        setStep(1);
      }
    };
    skipAuthIfRealUser();
  }, [user]);

  // STEP 1: Disclaimer
  const [disclaimerAccepted, setDisclaimerAccepted] = useState<boolean>(false);

  // STEP 2: Quiz
  const [age, setAge] = useState<string>('');
  const [skinType, setSkinType] = useState<'oily' | 'dry' | 'combination' | 'normal'>('normal');
  const [isSensitive, setIsSensitive] = useState<boolean>(false);
  const [goals, setGoals] = useState<string[]>([]);
  const [concerns, setConcerns] = useState<string[]>([]);

  // STEP 3: AI Recommendations
  const [recommendations, setRecommendations] = useState<ProductRecommendation[]>([]);
  const [addingProducts, setAddingProducts] = useState<boolean>(false);

  const goalsOptions = ['hydration', 'anti_aging', 'acne', 'brightening', 'barrier'];
  const concernsOptions = ['redness', 'dark_spots', 'acne_scars', 'fine_lines', 'pores', 'dryness'];

  // === NAVEGAÇÃO ===
  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => (prev > 0 ? prev - 1 : 0));

  // === STEP 0: AUTH LOGIC ===
  const handleAuthSubmit = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      Alert.alert(t('common.error'), t('auth.error_fill'));
      return;
    }
    if (isSignUpMode && !name.trim()) {
      Alert.alert(t('common.error'), t('auth.error_name'));
      return;
    }

    setLoading(true);
    let res;
    if (isSignUpMode) {
      res = await signUp(cleanEmail, password, name.trim(), rememberMe);
    } else {
      res = await signIn(cleanEmail, password, rememberMe);
    }

    if (res.success) {
      // Avança para o Disclaimer
      nextStep();
    } else {
      Alert.alert(t('common.error'), res.error || t('alert.auth_error'));
    }
    setLoading(false);
  };

  const handleGuestAccess = async () => {
    setLoading(true);
    await loginAsGuest(name.trim() || undefined);
    setLoading(false);
    nextStep();
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // Registrar remember_me como true para login social
      await AsyncStorage.setItem('viscare_remember_me', 'true');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: Platform.OS === 'web' 
            ? 'https://viscaree.vercel.app/onboarding' 
            : 'viscare://onboarding',
        }
      });
      if (error) throw error;
    } catch (e: any) {
      console.warn('Erro ao fazer login com Google', e);
      Alert.alert(t('common.error'), e.message || 'Erro ao conectar com o Google.');
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      Alert.alert(t('common.error'), t('auth.error_fill'));
      return;
    }
    setLoading(true);
    const res = await resetPassword(resetEmail.trim());
    setLoading(false);
    if (res.success) {
      // Se não houver Supabase configurado (modo mock)
      const isReal = res.error === undefined && res.success;
      const savedLang = await AsyncStorage.getItem('viscare_language');
      
      // Como o resetPassword simula no mock, verificamos a existência da resposta
      // No mock, se res.success é true, permitimos redefinir na hora
      const hasSupabase = savedLang === null ? false : true; // mock check
      
      // Vamos verificar de forma limpa pelo mockId de salvamento
      const mockId = 'mock-' + resetEmail.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
      const savedPass = await AsyncStorage.getItem('viscare_mock_password_' + mockId);
      
      if (savedPass !== null) {
        Alert.alert(
          t('auth.reset_success_title'),
          t('auth.reset_success_msg_mock'),
          [
            {
              text: 'OK',
              onPress: () => {
                setForgotModalVisible(false);
                setResetModalVisible(true);
              }
            }
          ]
        );
      } else {
        Alert.alert(
          t('auth.reset_success_title'),
          t('auth.reset_success_msg_real'),
          [
            {
              text: 'OK',
              onPress: () => setForgotModalVisible(false)
            }
          ]
        );
      }
    } else {
      Alert.alert(t('common.error'), res.error || 'Erro ao recuperar senha.');
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert(t('common.error'), t('auth.error_fill'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.passwords_must_match'));
      return;
    }
    setLoading(true);
    const res = await updatePassword(resetEmail.trim(), newPassword);
    setLoading(false);
    if (res.success) {
      Alert.alert(
        t('auth.reset_success_title'),
        t('auth.reset_success_done'),
        [
          {
            text: 'OK',
            onPress: () => {
              setResetModalVisible(false);
              setNewPassword('');
              setConfirmPassword('');
              setResetEmail('');
              setIsSignUpMode(false);
            }
          }
        ]
      );
    } else {
      Alert.alert(t('common.error'), res.error || 'Erro ao redefinir senha.');
    }
  };

  // === STEP 1: DISCLAIMER LOGIC ===
  const handleDisclaimerNext = () => {
    if (!disclaimerAccepted) {
      Alert.alert(t('common.warning'), t('alert.disclaimer_required'));
      return;
    }
    nextStep();
  };

  // === STEP 2: QUIZ LOGIC ===
  const toggleGoal = (g: string) => goals.includes(g) ? setGoals(goals.filter(x => x !== g)) : setGoals([...goals, g]);
  const toggleConcern = (c: string) => concerns.includes(c) ? setConcerns(concerns.filter(x => x !== c)) : setConcerns([...concerns, c]);

  const handleQuizSubmit = async () => {
    const parsedAge = parseInt(age, 10);
    if (!age || isNaN(parsedAge) || parsedAge <= 0 || parsedAge > 120) {
      Alert.alert(t('common.error'), t('alert.invalid_age'));
      return;
    }

    setLoading(true);
    try {
      // Salvar perfil de pele
      const currentUid = user?.id || 'guest-user-id';
      const skinData = {
        skin_type: skinType,
        age: parsedAge,
        is_sensitive: isSensitive,
        goals: goals.map(g => t(`quiz.goal_${g}`)),
        concerns: concerns.map(c => t(`quiz.concern_${c}`))
      };
      await DataService.saveSkinProfile(currentUid, skinData);

      // Gerar recomendações via IA
      const recs = await AIRecommendationService.getRecommendations({ user_id: currentUid, ...skinData });
      setRecommendations(recs);
      
      setLoading(false);
      nextStep(); // Vai para Step 3 (Recomendações)
    } catch (e) {
      console.warn('Erro ao salvar quiz', e);
      setLoading(false);
    }
  };

  // === STEP 3: RECOMMENDATIONS LOGIC ===
  const handleAddRecommendations = async () => {
    setAddingProducts(true);
    const currentUid = user?.id || 'guest-user-id';
    await AIRecommendationService.addRecommendationsToCABinet(currentUid, recommendations);
    setAddingProducts(false);
    nextStep(); // Vai para Step 4 (Notificações)
  };

  // === STEP 4: NOTIFICATIONS LOGIC ===
  const handleEnableNotifications = async () => {
    setLoading(true);
    const granted = await NotificationService.requestPermissions();
    if (granted) {
      await NotificationService.scheduleDailyReminders(language);
    }
    setLoading(false);
    nextStep(); // Vai para Step 5 (Welcome)
  };

  // === STEP 5: FINALIZATION ===
  const finishOnboarding = () => {
    router.replace('/(tabs)/today');
  };

  // RENDERS
  return (
    <View style={{ flex: 1, backgroundColor: '#F8F2EE' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 48 }}>

        {/* STEP 0: AUTH */}
        {step === 0 && (
          <View style={{ flex: 1, justifyContent: 'space-between', paddingVertical: 24, marginTop: 16 }}>
            <View>
              {/* Language Selector */}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 24, gap: 16 }}>
                <TouchableOpacity onPress={() => setLanguage('pt')}>
                  <Text style={{ fontSize: 22, opacity: language === 'pt' ? 1 : 0.35 }}>🇵🇹</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setLanguage('it')}>
                  <Text style={{ fontSize: 22, opacity: language === 'it' ? 1 : 0.35 }}>🇮🇹</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setLanguage('en')}>
                  <Text style={{ fontSize: 22, opacity: language === 'en' ? 1 : 0.35 }}>🇬🇧</Text>
                </TouchableOpacity>
              </View>

              {/* Logo oficial Viscare — substitui o texto de boas-vindas */}
              <View style={{ alignItems: 'center', marginBottom: 40 }}>
                <View style={{
                  shadowColor: '#B97C63',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.25,
                  shadowRadius: 24,
                  elevation: 12,
                  borderRadius: 36,
                }}>
                  <Image
                    source={require('../../assets/images/logo.png')}
                    style={{ width: 160, height: 160, borderRadius: 36 }}
                    resizeMode="cover"
                  />
                </View>
              </View>

              <View className="space-y-4">
                {/* Botões Sociais */}
                <TouchableOpacity 
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                  className="flex-row items-center justify-center bg-white py-3.5 rounded-full border border-brand-warm-gray shadow-sm"
                >
                  <Text className="font-sans font-semibold text-brand-charcoal">{t('auth.continue_google')}</Text>
                </TouchableOpacity>

                <View className="flex-row items-center my-2">
                  <View className="flex-1 h-[1px] bg-brand-warm-gray" />
                  <Text className="text-xs font-sans text-brand-sage-dark px-3">{t('auth.or')}</Text>
                  <View className="flex-1 h-[1px] bg-brand-warm-gray" />
                </View>

                {isSignUpMode && (
                  <View>
                    <Text className="text-xs font-sans text-brand-charcoal font-semibold mb-1 uppercase tracking-wider">{t('auth.name')}</Text>
                    <View className="flex-row items-center bg-white px-4 py-2 border border-brand-warm-gray rounded-2xl shadow-sm">
                      <User size={18} color="#AEB09B" />
                      <TextInput
                        placeholder={t('auth.name_placeholder')}
                        value={name}
                        onChangeText={setName}
                        className="flex-1 px-3 py-2 font-sans text-base text-brand-charcoal"
                      />
                    </View>
                  </View>
                )}

                <View>
                  <Text className="text-xs font-sans text-brand-charcoal font-semibold mb-1 uppercase tracking-wider">{t('auth.email')}</Text>
                  <View className="flex-row items-center bg-white px-4 py-2 border border-brand-warm-gray rounded-2xl shadow-sm">
                    <Mail size={18} color="#AEB09B" />
                    <TextInput
                      placeholder="example@email.com"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={email}
                      onChangeText={(text) => setEmail(text.trim())}
                      className="flex-1 px-3 py-2 font-sans text-base text-brand-charcoal"
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-xs font-sans text-brand-charcoal font-semibold mb-1 uppercase tracking-wider">{t('auth.password')}</Text>
                  <View className="flex-row items-center bg-white px-4 py-2 border border-brand-warm-gray rounded-2xl shadow-sm">
                    <Lock size={18} color="#AEB09B" />
                    <TextInput
                      placeholder="••••••••"
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                      className="flex-1 px-3 py-2 font-sans text-base text-brand-charcoal"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setRememberMe(!rememberMe)}
                  style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingHorizontal: 4 }}
                >
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: rememberMe ? '#B97C63' : '#AEB09B',
                    backgroundColor: rememberMe ? '#B97C63' : '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10
                  }}>
                    {rememberMe && <Check size={14} color="white" />}
                  </View>
                  <Text className="text-sm font-sans text-brand-charcoal font-medium">
                    {t('auth.remember_me')}
                  </Text>
                </TouchableOpacity>

                {!isSignUpMode && (
                  <TouchableOpacity
                    onPress={() => { setResetEmail(email); setForgotModalVisible(true); }}
                    style={{ alignSelf: 'flex-end', marginTop: 8, paddingHorizontal: 4 }}
                  >
                    <Text className="text-xs font-sans text-brand-bronze font-medium underline">
                      {t('auth.forgot_password')}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={handleAuthSubmit}
                  className="w-full py-4 bg-brand-rose-metallic rounded-full items-center mt-6 shadow-sm"
                >
                  {loading ? <ActivityIndicator size="small" color="white" /> : (
                    <Text className="text-white font-sans text-base font-semibold tracking-wide">
                      {isSignUpMode ? t('auth.signup') : t('auth.signin')}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setIsSignUpMode(!isSignUpMode)} className="py-2 items-center mt-2">
                  <Text className="text-sm font-sans text-brand-bronze font-medium">
                    {isSignUpMode ? t('auth.toggle_signin') : t('auth.toggle_signup')}
                  </Text>
                </TouchableOpacity>
              </View>

            </View>
          </View>
        )}

        {/* STEP 1: DISCLAIMER */}
        {step === 1 && (
          <View className="flex-1 justify-between py-6 mt-8">
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
                <Text className="flex-1 font-sans text-sm text-[#2C2C2E] leading-relaxed">{t('welcome.value_prop1')}</Text>
              </View>
              <View className="flex-row items-start space-x-3 p-4 bg-[#F2F0EB] rounded-2xl">
                <Heart size={24} color="#8F9779" />
                <Text className="flex-1 font-sans text-sm text-[#2C2C2E] leading-relaxed">{t('welcome.value_prop2')}</Text>
              </View>
              <View className="flex-row items-start space-x-3 p-4 bg-[#F2F0EB] rounded-2xl">
                <Shield size={24} color="#8F9779" />
                <Text className="flex-1 font-sans text-sm text-[#2C2C2E] leading-relaxed">{t('welcome.value_prop3')}</Text>
              </View>
            </View>

            <View className="p-5 bg-white border border-[#F2F0EB] rounded-3xl shadow-sm mb-6">
              <Text className="text-sm font-serif text-[#D97D64] font-bold mb-2">⚠️ {t('welcome.disclaimer_title')}</Text>
              <Text className="text-xs font-sans text-[#6E6E73] leading-relaxed">{t('welcome.disclaimer_text')}</Text>
              
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => setDisclaimerAccepted(!disclaimerAccepted)}
                className="flex-row items-center mt-4 p-2"
              >
                <View className={`w-5 h-5 rounded-md border items-center justify-center mr-3 ${disclaimerAccepted ? 'bg-[#8F9779] border-[#8F9779]' : 'border-[#C6C6C8]'}`}>
                  {disclaimerAccepted && <Check size={14} color="white" />}
                </View>
                <Text className="text-xs font-sans text-[#2C2C2E] font-medium">{t('welcome.accept_disclaimer')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleDisclaimerNext}
              className={`w-full py-4 rounded-full flex-row items-center justify-center space-x-2 ${disclaimerAccepted ? 'bg-[#8F9779]' : 'bg-[#C6C6C8]'}`}
            >
              <Text className="text-white font-sans text-base font-bold">{t('welcome.next')}</Text>
              <ArrowRight size={18} color="white" />
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: QUIZ */}
        {step === 2 && (
          <View className="flex-1 justify-between py-6 mt-4">
            <View>
              <Text className="text-2xl font-serif text-[#2C2C2E] font-bold text-center">{t('quiz.title')}</Text>
              <Text className="text-sm font-sans text-[#6E6E73] text-center mt-1">{t('quiz.subtitle')}</Text>

              {/* Idade */}
              <View className="mt-6">
                <Text className="text-sm font-sans text-[#2C2C2E] font-semibold mb-2">{t('quiz.age_question')}</Text>
                <TextInput
                  placeholder="25"
                  keyboardType="number-pad"
                  value={age}
                  onChangeText={setAge}
                  className="bg-white px-4 py-3 border border-[#E5E5EA] rounded-2xl font-sans text-base"
                />
              </View>

              {/* Tipo de Pele */}
              <View className="mt-6">
                <Text className="text-sm font-sans text-[#2C2C2E] font-semibold mb-2">{t('quiz.type_question')}</Text>
                <View className="flex-row flex-wrap justify-between">
                  {(['oily', 'dry', 'combination', 'normal'] as const).map(type => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setSkinType(type)}
                      className={`w-[48%] py-3 mb-3 border rounded-2xl items-center ${skinType === type ? 'bg-[#8F9779]/10 border-[#8F9779]' : 'bg-white border-[#E5E5EA]'}`}
                    >
                      <Text className={`font-sans text-sm font-medium ${skinType === type ? 'text-[#8F9779]' : 'text-[#2C2C2E]'}`}>{t(`quiz.type_${type}`)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Sensibilidade */}
              <View className="mt-4">
                <Text className="text-sm font-sans text-[#2C2C2E] font-semibold mb-2">{t('quiz.sensitivity_question')}</Text>
                <View className="flex-row justify-between">
                  <TouchableOpacity onPress={() => setIsSensitive(true)} className={`w-[48%] py-3 border rounded-2xl items-center ${isSensitive ? 'bg-[#8F9779]/10 border-[#8F9779]' : 'bg-white border-[#E5E5EA]'}`}>
                    <Text className={`font-sans text-sm font-medium ${isSensitive ? 'text-[#8F9779]' : 'text-[#2C2C2E]'}`}>{t('quiz.sens_yes')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsSensitive(false)} className={`w-[48%] py-3 border rounded-2xl items-center ${!isSensitive ? 'bg-[#8F9779]/10 border-[#8F9779]' : 'bg-white border-[#E5E5EA]'}`}>
                    <Text className={`font-sans text-sm font-medium ${!isSensitive ? 'text-[#8F9779]' : 'text-[#2C2C2E]'}`}>{t('quiz.sens_no')}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Objetivos */}
              <View className="mt-6">
                <Text className="text-sm font-sans text-[#2C2C2E] font-semibold mb-2">{t('quiz.goals_question')}</Text>
                <View className="flex-row flex-wrap">
                  {goalsOptions.map(g => (
                    <TouchableOpacity key={g} onPress={() => toggleGoal(g)} className={`mr-2 mb-2 px-3 py-2 border rounded-full ${goals.includes(g) ? 'bg-[#8F9779] border-[#8F9779]' : 'bg-white border-[#E5E5EA]'}`}>
                      <Text className={`font-sans text-xs font-medium ${goals.includes(g) ? 'text-white' : 'text-[#2C2C2E]'}`}>{t(`quiz.goal_${g}`)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Preocupações */}
              <View className="mt-4">
                <Text className="text-sm font-sans text-[#2C2C2E] font-semibold mb-2">{t('quiz.concerns_question')}</Text>
                <View className="flex-row flex-wrap">
                  {concernsOptions.map(c => (
                    <TouchableOpacity key={c} onPress={() => toggleConcern(c)} className={`mr-2 mb-2 px-3 py-2 border rounded-full ${concerns.includes(c) ? 'bg-[#D97D64] border-[#D97D64]' : 'bg-white border-[#E5E5EA]'}`}>
                      <Text className={`font-sans text-xs font-medium ${concerns.includes(c) ? 'text-white' : 'text-[#2C2C2E]'}`}>{t(`quiz.concern_${c}`)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <TouchableOpacity onPress={handleQuizSubmit} className="w-full mt-8 py-4 bg-[#8F9779] rounded-full items-center">
              {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-sans font-bold">{t('quiz.finish')}</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 3: AI RECOMMENDATIONS */}
        {step === 3 && (
          <View className="flex-1 py-6 mt-8">
            <View className="items-center mb-8">
              <View className="w-16 h-16 bg-[#8F9779]/10 rounded-full items-center justify-center mb-4">
                <Sparkles size={32} color="#8F9779" />
              </View>
              <Text className="text-2xl font-serif text-[#2C2C2E] font-bold text-center mb-2">
                {t('ai_rec.title')}
              </Text>
              <Text className="text-sm font-sans text-[#6E6E73] text-center px-4">
                {t('ai_rec.subtitle')}
              </Text>
            </View>

            <View className="space-y-4 mb-8">
              {recommendations.map((rec, idx) => (
                <View key={idx} className="bg-white p-4 rounded-3xl border border-[#8F9779]/20 shadow-sm">
                  <View className="flex-row items-center mb-2">
                    <CheckCircle2 size={20} color="#8F9779" />
                    <Text className="font-sans text-base font-bold text-[#2C2C2E] ml-2">{rec.product.name}</Text>
                  </View>
                  <Text className="font-sans text-xs text-[#8E8E93] mb-3">{rec.product.brand} • {rec.product.category.toUpperCase()}</Text>
                  
                  <View className="bg-[#FAF9F6] p-3 rounded-2xl">
                    <Text className="font-sans text-xs font-semibold text-[#D97D64] mb-1">{t('ai_rec.why')}</Text>
                    <Text className="font-sans text-xs text-[#2C2C2E] italic">"{rec.reason[language]}"</Text>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity 
              onPress={handleAddRecommendations}
              className="w-full py-4 bg-[#8F9779] rounded-full items-center mb-4"
            >
              {addingProducts ? (
                <View className="flex-row items-center space-x-2">
                  <ActivityIndicator size="small" color="white" />
                  <Text className="text-white font-sans font-bold">{t('ai_rec.adding')}</Text>
                </View>
              ) : (
                <Text className="text-white font-sans font-bold">{t('ai_rec.add_all')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={nextStep} className="py-2 items-center">
              <Text className="text-[#8F9779] font-sans font-semibold">{t('notif.skip')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 4: NOTIFICATIONS */}
        {step === 4 && (
          <View className="flex-1 justify-center py-6">
            <View className="items-center justify-center mb-10 mt-12">
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
              <TouchableOpacity onPress={handleEnableNotifications} className="w-full py-4 bg-[#8F9779] rounded-full items-center flex-row justify-center space-x-2">
                {loading ? <ActivityIndicator size="small" color="white" /> : (
                  <>
                    <Bell size={18} color="white" />
                    <Text className="text-white font-sans text-base font-bold">{t('notif.enable')}</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={nextStep} className="w-full py-4 bg-transparent rounded-full items-center">
                <Text className="text-[#8F9779] font-sans text-base font-semibold">{t('notif.skip')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 5: WELCOME SCREEN */}
        {step === 5 && (
          <View className="flex-1 justify-center py-6">
            <View className="items-center mb-10">
              <View className="w-24 h-24 bg-[#8F9779]/20 rounded-full items-center justify-center mb-6">
                <Text className="text-5xl">✨</Text>
              </View>
              <Text className="text-3xl font-serif text-[#2C2C2E] font-bold text-center mb-2">
                {t('welcome_screen.title')} {profile?.display_name || name || ''}!
              </Text>
              <Text className="text-base font-sans text-[#6E6E73] text-center px-4">
                {t('welcome_screen.message')}
              </Text>
            </View>

            <View className="bg-white rounded-3xl p-5 border border-[#F2F0EB] shadow-sm mb-10">
              <Text className="font-sans text-xs font-bold text-[#8E8E93] uppercase tracking-widest mb-4">
                {t('welcome_screen.profile_summary')}
              </Text>
              
              <View className="flex-row justify-between border-b border-[#F2F0EB] pb-3 mb-3">
                <Text className="font-sans text-[#6E6E73]">{t('welcome_screen.skin_type')}</Text>
                <Text className="font-sans font-bold text-[#8F9779] capitalize">{t(`quiz.type_${skinType}`)}</Text>
              </View>

              <View className="flex-row justify-between border-b border-[#F2F0EB] pb-3 mb-3">
                <Text className="font-sans text-[#6E6E73]">{t('welcome_screen.goals')}</Text>
                <Text className="font-sans font-bold text-[#2C2C2E] text-right w-1/2" numberOfLines={1}>
                  {t('welcome_screen.goals_count').replace('{n}', goals.length.toString())}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="font-sans text-[#6E6E73]">{t('tabs.products')}</Text>
                <Text className="font-sans font-bold text-[#2C2C2E]">
                  {recommendations.length} {t('welcome_screen.products_added')}
                </Text>
              </View>
            </View>

            <Text className="text-center font-sans italic text-[#D97D64] mb-8">
              {t('welcome_screen.motivation')}
            </Text>

            <TouchableOpacity onPress={finishOnboarding} className="w-full py-4 bg-[#8F9779] rounded-full flex-row items-center justify-center space-x-2">
              <Text className="text-white font-sans text-base font-bold">{t('welcome_screen.cta')}</Text>
              <ArrowRight size={20} color="white" />
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* MODAL ESQUECEU A SENHA */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={forgotModalVisible}
        onRequestClose={() => setForgotModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/60 px-6">
          <View className="bg-white w-full rounded-3xl p-6 shadow-xl border border-brand-warm-gray max-w-sm">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-serif text-brand-charcoal font-bold">
                {t('auth.reset_password_title')}
              </Text>
              <TouchableOpacity onPress={() => setForgotModalVisible(false)}>
                <X size={20} color="#8C8E78" />
              </TouchableOpacity>
            </View>

            <Text className="text-sm font-sans text-brand-sage-dark mb-4">
              {t('auth.reset_password_desc')}
            </Text>

            <View className="mb-6">
              <Text className="text-xs font-sans font-semibold text-brand-charcoal mb-1 uppercase tracking-wider">
                {t('auth.email')}
              </Text>
              <TextInput
                value={resetEmail}
                onChangeText={(text) => setResetEmail(text.trim())}
                placeholder="example@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-brand-ivory px-4 py-3 border border-brand-warm-gray rounded-2xl font-sans text-base text-brand-charcoal"
              />
            </View>

            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={() => setForgotModalVisible(false)}
                className="flex-1 py-3 bg-brand-warm-gray rounded-full items-center mr-2"
              >
                <Text className="font-sans text-xs font-bold text-brand-charcoal uppercase tracking-wider">
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleForgotPassword}
                className="flex-1 py-3 bg-brand-rose-metallic rounded-full items-center"
              >
                {loading ? <ActivityIndicator size="small" color="white" /> : (
                  <Text className="font-sans text-xs font-bold text-white uppercase tracking-wider">
                    {t('auth.send_link')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL REDEFINIR SENHA */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={resetModalVisible}
        onRequestClose={() => setResetModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/60 px-6">
          <View className="bg-white w-full rounded-3xl p-6 shadow-xl border border-brand-warm-gray max-w-sm">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-serif text-brand-charcoal font-bold">
                {t('auth.reset_password_title')}
              </Text>
              <TouchableOpacity onPress={() => setResetModalVisible(false)}>
                <X size={20} color="#8C8E78" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 16 }}>
              <View>
                <Text className="text-xs font-sans font-semibold text-brand-charcoal mb-1 uppercase tracking-wider">
                  {t('auth.new_password')}
                </Text>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  className="bg-brand-ivory px-4 py-3 border border-brand-warm-gray rounded-2xl font-sans text-base text-brand-charcoal"
                />
              </View>

              <View>
                <Text className="text-xs font-sans font-semibold text-brand-charcoal mb-1 uppercase tracking-wider">
                  {t('auth.confirm_new_password')}
                </Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  secureTextEntry
                  className="bg-brand-ivory px-4 py-3 border border-brand-warm-gray rounded-2xl font-sans text-base text-brand-charcoal"
                />
              </View>
            </View>

            <View className="flex-row space-x-3 mt-6">
              <TouchableOpacity
                onPress={() => setResetModalVisible(false)}
                className="flex-1 py-3 bg-brand-warm-gray rounded-full items-center mr-2"
              >
                <Text className="font-sans text-xs font-bold text-brand-charcoal uppercase tracking-wider">
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUpdatePassword}
                className="flex-1 py-3 bg-brand-rose-metallic rounded-full items-center"
              >
                {loading ? <ActivityIndicator size="small" color="white" /> : (
                  <Text className="font-sans text-xs font-bold text-white uppercase tracking-wider">
                    {t('agenda.save')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
