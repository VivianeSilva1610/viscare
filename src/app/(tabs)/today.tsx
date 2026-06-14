import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Dimensions, Modal, TextInput } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LocalizationContext';
import { DataService } from '../../services/dataService';
import { UserProduct, Routine, RoutineStep, Appointment } from '../../services/mockDb';
import { CheckCircle2, Circle, Flame, Sun, Moon, ArrowRight, Star, CalendarHeart, Plus, Trash2, X, Sparkles, Camera, Image as ImageIcon, Sliders } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function TodayScreen() {
  const { user, isPremium } = useAuth();
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
  const [cabinetProducts, setCabinetProducts] = useState<UserProduct[]>([]);
  
  const [skinScore, setSkinScore] = useState<number>(85); // Mock score base
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);

  // AI Scanner & Profile Stats
  const [scansCountThisMonth, setScansCountThisMonth] = useState<number>(0);
  const [lastScanDate, setLastScanDate] = useState<string | null>(null);
  const [scanModalVisible, setScanModalVisible] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<'select' | 'scanning' | 'results'>('select');
  const [scanResults, setScanResults] = useState<{ hydration: number; wrinkles: number; sensitivity: number; acne: number; diagnosis: string } | null>(null);
  const [scanLineTop, setScanLineTop] = useState<number>(10);

  // Interactive Agenda Modals & Form
  const [appModalVisible, setAppModalVisible] = useState<boolean>(false);
  const [appEditing, setAppEditing] = useState<Appointment | null>(null);
  const [appTitle, setAppTitle] = useState<string>('');
  const [appDate, setAppDate] = useState<string>('');
  const [appTime, setAppTime] = useState<string>('');
  const [appLocation, setAppLocation] = useState<string>('');

  // Favorites management Modal
  const [favModalVisible, setFavModalVisible] = useState<boolean>(false);

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
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const profile = await DataService.getProfile(user.id);
      setStreak(profile.streak_count);
      setScansCountThisMonth(profile.scans_count_this_month ?? 0);
      setLastScanDate(profile.last_scan_date ?? null);
      
      // Calculate dynamic score based on streak
      setSkinScore(Math.min(98, 75 + (profile.streak_count * 2)));

      const routines = await DataService.getRoutines(user.id);
      const amRot = routines.find(r => r.type === 'AM') || null;
      const pmRot = routines.find(r => r.type === 'PM') || null;
      setAmRoutine(amRot);
      setPmRoutine(pmRot);

      const cabinet = await DataService.getUserProducts(user.id);
      setCabinetProducts(cabinet);
      const favs = cabinet.filter(p => p.is_favorite === true);
      setFavorites(favs);

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

      // Carregar agendamentos
      const appointments = await DataService.getAppointments(user.id);
      const upcoming = appointments.find(a => a.status === 'upcoming') || null;
      setNextAppointment(upcoming);
    } catch (e) {
      console.warn('Erro ao carregar dados do dia', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Toggle active routine task
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

  // Favoritos: Adicionar/Remover
  const toggleFavorite = async (product: UserProduct) => {
    if (!user) return;
    try {
      const isFav = !product.is_favorite;
      const updatedCabinet = await DataService.updateUserProduct(user.id, product.id, { is_favorite: isFav });
      setCabinetProducts(updatedCabinet);
      setFavorites(updatedCabinet.filter(p => p.is_favorite === true));
    } catch (e) {
      console.warn('Erro ao atualizar favorito', e);
    }
  };

  // Agenda: Adicionar, Editar e Deletar
  const resetAppForm = () => {
    setAppTitle('');
    setAppDate('');
    setAppTime('');
    setAppLocation('');
    setAppEditing(null);
  };

  const openAddAppointment = () => {
    resetAppForm();
    setAppModalVisible(true);
  };

  const openEditAppointment = (app: Appointment) => {
    setAppEditing(app);
    setAppTitle(app.title.startsWith('agenda.') ? t(app.title) : app.title);
    setAppDate(app.dateStr.startsWith('agenda.') ? t(app.dateStr) : app.dateStr);
    setAppTime(app.time);
    setAppLocation(app.location.startsWith('agenda.') ? t(app.location) : app.location);
    setAppModalVisible(true);
  };

  const handleAddOrEditAppointment = async () => {
    if (!appTitle.trim() || !appDate.trim() || !appTime.trim() || !appLocation.trim()) {
      Alert.alert(t('common.error'), t('alert.fields_required'));
      return;
    }
    if (!user) return;
    try {
      if (appEditing) {
        await DataService.updateAppointment(user.id, appEditing.id, {
          title: appTitle,
          dateStr: appDate,
          time: appTime,
          location: appLocation
        });
      } else {
        await DataService.addAppointment(user.id, {
          title: appTitle,
          dateStr: appDate,
          time: appTime,
          location: appLocation,
          status: 'upcoming'
        });
      }
      setAppModalVisible(false);
      resetAppForm();
      await loadData();
    } catch (e) {
      console.warn('Erro ao salvar agendamento', e);
      Alert.alert(t('common.error'), t('common.connection_error'));
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!user) return;
    Alert.alert(
      t('common.warning'),
      t('alert.delete_product_msg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await DataService.deleteAppointment(user.id, id);
              await loadData();
            } catch (e) {
              console.warn('Erro ao deletar agendamento', e);
            }
          }
        }
      ]
    );
  };

  const toggleAppointmentStatus = async (app: Appointment) => {
    if (!user) return;
    const nextStatus = app.status === 'upcoming' ? 'completed' : 'upcoming';
    try {
      await DataService.updateAppointment(user.id, app.id, { status: nextStatus });
      await loadData();
    } catch (e) {
      console.warn('Erro ao atualizar status do agendamento', e);
    }
  };

  // AI Scanner: Gerador de Diagnóstico Dinâmico
  const getActiveIngredientsMessage = () => {
    const ingredients = new Set<string>();
    let hasSpf = false;

    amSteps.forEach(s => {
      if (s.product) {
        if (s.product.custom_category === 'spf') hasSpf = true;
        s.product.custom_active_ingredients?.forEach(i => ingredients.add(i.trim().toLowerCase()));
      }
    });

    pmSteps.forEach(s => {
      if (s.product) {
        if (s.product.custom_category === 'spf') hasSpf = true;
        s.product.custom_active_ingredients?.forEach(i => ingredients.add(i.trim().toLowerCase()));
      }
    });

    const ingredientsList = Array.from(ingredients);

    if (language === 'pt') {
      let msg = "A análise da sua pele revela um perfil saudável. ";
      if (ingredientsList.length === 0) {
        msg += "Não detectamos produtos ativos em uso. Adicione produtos com princípios ativos (como Ácido Hialurônico ou Vitamina C) à sua rotina para que o leitor facial correlacione a eficácia.";
        return msg;
      }
      
      msg += "Com base na sua rotina ativa, ";
      const activeMsgs: string[] = [];
      if (ingredientsList.includes('retinolo') || ingredientsList.includes('retinol')) {
        activeMsgs.push("o Retinol está atuando na renovação celular e diminuição de linhas de expressão");
      }
      if (ingredientsList.includes('acido ialuronico') || ingredientsList.includes('ácido hialurônico') || ingredientsList.includes('hyaluronic acid')) {
        activeMsgs.push("o Ácido Hialurônico está retendo água e garantindo boa elasticidade e hidratação");
      }
      if (ingredientsList.includes('vitamina c') || ingredientsList.includes('vitamin c')) {
        activeMsgs.push("a Vitamina C está combatendo radicais livres e clareando manchas");
      }
      if (ingredientsList.includes('niacinamide') || ingredientsList.includes('niacinamida')) {
        activeMsgs.push("a Niacinamida está ajudando a suavizar poros e acalmar vermelhidões");
      }
      if (ingredientsList.includes('aha/bha') || ingredientsList.includes('aha') || ingredientsList.includes('bha')) {
        activeMsgs.push("os esfoliantes AHA/BHA estão desobstruindo os poros");
      }
      if (hasSpf) {
        activeMsgs.push("o uso diário de Protetor Solar (SPF) está protegendo a barreira cutânea contra danos UV");
      }

      if (activeMsgs.length > 0) {
        msg += activeMsgs.join(', ') + ".";
      } else {
        msg += "seus produtos com ativos estão fornecendo nutrição diária necessária para equilibrar sua pele.";
      }
      return msg;
    } else if (language === 'it') {
      let msg = "L'analisi della tua pelle rivela un profilo sano. ";
      if (ingredientsList.length === 0) {
        msg += "Non abbiamo rilevato prodotti attivi in uso. Aggiungi prodotti con principi attivi (come Acido Ialuronico o Vitamina C) alla tua routine per correlarne l'efficacia.";
        return msg;
      }
      
      msg += "In base alla tua routine attiva, ";
      const activeMsgs: string[] = [];
      if (ingredientsList.includes('retinolo') || ingredientsList.includes('retinol')) {
        activeMsgs.push("il Retinolo sta agendo sul rinnovamento cellulare e sulla riduzione delle rughe d'espressione");
      }
      if (ingredientsList.includes('acido ialuronico') || ingredientsList.includes('acido ialuronico') || ingredientsList.includes('hyaluronic acid')) {
        activeMsgs.push("l'Acido Ialuronico sta trattenendo l'acqua garantendo elasticità e idratazione");
      }
      if (ingredientsList.includes('vitamina c') || ingredientsList.includes('vitamin c')) {
        activeMsgs.push("la Vitamina C sta combattendo i radicali liberi ed illuminando il viso");
      }
      if (ingredientsList.includes('niacinamide') || ingredientsList.includes('niacinamida')) {
        activeMsgs.push("la Niacinamide sta aiutando a ridurre i pori dilatati e lenire gli arrossamenti");
      }
      if (ingredientsList.includes('aha/bha') || ingredientsList.includes('aha') || ingredientsList.includes('bha')) {
        activeMsgs.push("gli esfolianti AHA/BHA stanno liberando i pori ostruiti");
      }
      if (hasSpf) {
        activeMsgs.push("l'uso quotidiano della Protezione Solare (SPF) sta difendendo la barriera cutanea dai danni UV");
      }

      if (activeMsgs.length > 0) {
        msg += activeMsgs.join(', ') + ".";
      } else {
        msg += "i tuoi prodotti attivi stanno fornendo il nutrimento quotidiano necessario per bilanciare la pelle.";
      }
      return msg;
    } else {
      let msg = "Your skin analysis reveals a healthy profile. ";
      if (ingredientsList.length === 0) {
        msg += "We did not detect active ingredients in use. Add products with active ingredients (like Hyaluronic Acid or Vitamin C) to your routine for the scanner to correlate efficacy.";
        return msg;
      }
      
      msg += "Based on your active routine, ";
      const activeMsgs: string[] = [];
      if (ingredientsList.includes('retinolo') || ingredientsList.includes('retinol')) {
        activeMsgs.push("Retinol is working on cellular renewal and smoothing fine lines");
      }
      if (ingredientsList.includes('acido ialuronico') || ingredientsList.includes('hyaluronic acid')) {
        activeMsgs.push("Hyaluronic Acid is retaining water, ensuring elasticity and hydration");
      }
      if (ingredientsList.includes('vitamina c') || ingredientsList.includes('vitamin c')) {
        activeMsgs.push("Vitamin C is fighting free radicals and brightening the skin");
      }
      if (ingredientsList.includes('niacinamide') || ingredientsList.includes('niacinamida')) {
        activeMsgs.push("Niacinamide is helping smooth pores and calm redness");
      }
      if (ingredientsList.includes('aha/bha') || ingredientsList.includes('aha') || ingredientsList.includes('bha')) {
        activeMsgs.push("AHA/BHA chemical exfoliants are clearing your pores");
      }
      if (hasSpf) {
        activeMsgs.push("daily SPF use is protecting your skin barrier against UV damage");
      }

      if (activeMsgs.length > 0) {
        msg += activeMsgs.join(', ') + ".";
      } else {
        msg += "your active ingredients are providing daily nutrition to balance your skin.";
      }
      return msg;
    }
  };

  const handleScanCardClick = () => {
    if (!isPremium) {
      router.push('/paywall');
      return;
    }
    
    // Verificar limite
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let lastScanMonthStr = '';
    if (lastScanDate) {
      const lastScanD = new Date(lastScanDate);
      lastScanMonthStr = `${lastScanD.getFullYear()}-${String(lastScanD.getMonth() + 1).padStart(2, '0')}`;
    }
    let count = scansCountThisMonth;
    if (lastScanMonthStr && lastScanMonthStr !== currentMonthStr) {
      count = 0;
    }

    if (count >= 2) {
      Alert.alert(t('common.warning'), t('scan.limit_reached'));
      return;
    }

    setScanStep('select');
    setScanResults(null);
    setScanModalVisible(true);
  };

  const startScanning = (source: 'camera' | 'gallery') => {
    setScanStep('scanning');
    
    // Animar a linha vertical do scan
    let dir = 1;
    let currentTop = 10;
    const interval = setInterval(() => {
      currentTop += dir * 5;
      if (currentTop >= 90) {
        dir = -1;
      } else if (currentTop <= 10) {
        dir = 1;
      }
      setScanLineTop(currentTop);
    }, 50);

    setTimeout(async () => {
      clearInterval(interval);
      if (!user) return;

      const hScore = 75 + Math.floor(Math.random() * 20);
      const wScore = 65 + Math.floor(Math.random() * 25);
      const sScore = 15 + Math.floor(Math.random() * 45);
      const aScore = 70 + Math.floor(Math.random() * 25);

      const generatedDiagnosis = getActiveIngredientsMessage();

      const newScanResult = {
        hydration: hScore,
        wrinkles: wScore,
        sensitivity: sScore,
        acne: aScore,
        diagnosis: generatedDiagnosis
      };

      try {
        await DataService.addFacialScan(user.id, newScanResult);
        const success = await DataService.incrementScanCount(user.id);
        if (success) {
          await loadData();
        }
      } catch (err) {
        console.warn('Erro ao salvar analise', err);
      }

      setScanResults(newScanResult);
      setScanStep('results');
    }, 3500);
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
            {t('home.subtitle')}
          </Text>
        </View>
      </View>

      {/* Hero Card: Skin Score & Streak */}
      <View className="bg-brand-nude p-6 rounded-3xl mb-8 flex-row items-center justify-between shadow-sm border border-white/50">
        <View className="flex-1 pr-4">
          <Text className="font-sans text-xs uppercase tracking-widest font-semibold text-brand-bronze mb-1">
            {t('home.skin_health')}
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

        {/* Circular Progress */}
        <View className="w-20 h-20 bg-white rounded-full items-center justify-center shadow-sm border-[4px] border-brand-rose-light">
          <Text className="font-sans font-bold text-lg text-brand-bronze">{skinScore}%</Text>
        </View>
      </View>

      {/* AI Facial Scanner Banner */}
      <View className="bg-brand-rose-light/10 border border-brand-rose-metallic/30 rounded-3xl p-6 mb-8 shadow-sm relative overflow-hidden">
        <View className="flex-row justify-between items-center">
          <View className="flex-1 pr-4">
            <View className="flex-row items-center space-x-2 mb-2">
              <Sparkles size={14} color="#B97C63" />
              <Text className="font-sans text-xs uppercase tracking-widest font-bold text-brand-rose-metallic">
                {t('scan.title')}
              </Text>
              {!isPremium && (
                <View className="bg-brand-rose-metallic px-2 py-0.5 rounded-full ml-2">
                  <Text className="text-[8px] font-sans font-bold text-white uppercase">PREMIUM</Text>
                </View>
              )}
            </View>
            <Text className="font-serif text-lg font-bold text-brand-charcoal leading-tight">
              {t('scan.subtitle')}
            </Text>
            
            {isPremium ? (
              <Text className="font-sans text-xs text-brand-sage-dark mt-2 font-medium">
                {t('scan.remaining').replace('{n}', (Math.max(0, 2 - scansCountThisMonth)).toString())}
              </Text>
            ) : (
              <Text className="font-sans text-xs text-brand-sage-dark mt-2 font-medium">
                {t('scan.premium_required_msg')}
              </Text>
            )}
          </View>

          <TouchableOpacity 
            onPress={handleScanCardClick}
            className="w-14 h-14 bg-brand-rose-metallic rounded-2xl items-center justify-center shadow-md"
          >
            <Sparkles size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Próximos Cuidados (Agenda Preview) */}
      <View className="mb-8">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="font-serif text-xl text-brand-charcoal font-bold">{t('home.upcoming_care')}</Text>
          <TouchableOpacity onPress={openAddAppointment} className="p-2 bg-brand-rose-metallic rounded-full shadow-sm">
            <Plus size={16} color="white" />
          </TouchableOpacity>
        </View>

        {nextAppointment ? (
          <View className="bg-white p-5 rounded-3xl border border-brand-warm-gray shadow-sm">
            <View className="flex-row justify-between items-start mb-3">
              <TouchableOpacity onPress={() => toggleAppointmentStatus(nextAppointment)} className="flex-1 pr-2 flex-row items-start">
                {nextAppointment.status === 'upcoming' ? (
                  <Circle size={20} color="#E7D8D0" style={{ marginTop: 2, marginRight: 8 }} />
                ) : (
                  <CheckCircle2 size={20} color="#AEB09B" style={{ marginTop: 2, marginRight: 8 }} />
                )}
                <View className="flex-1">
                  <Text className={`font-sans text-sm font-bold text-brand-charcoal ${nextAppointment.status === 'completed' ? 'line-through text-brand-sage-dark' : ''}`}>
                    {nextAppointment.title.startsWith('agenda.') ? t(nextAppointment.title) : nextAppointment.title}
                  </Text>
                  <Text className="font-sans text-xs text-brand-sage-dark mt-1" numberOfLines={1}>
                    {nextAppointment.dateStr.startsWith('agenda.') ? t(nextAppointment.dateStr) : nextAppointment.dateStr} • {nextAppointment.time}
                  </Text>
                  <Text className="font-sans text-xs text-brand-sage-dark mt-0.5" numberOfLines={1}>
                    {nextAppointment.location.startsWith('agenda.') ? t(nextAppointment.location) : nextAppointment.location}
                  </Text>
                </View>
              </TouchableOpacity>
              <View className="flex-row items-center space-x-2">
                <TouchableOpacity onPress={() => openEditAppointment(nextAppointment)} className="p-2 bg-brand-nude/40 rounded-full mr-1">
                  <CalendarHeart size={16} color="#B97C63" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteAppointment(nextAppointment.id)} className="p-2 bg-red-50 rounded-full">
                  <Trash2 size={16} color="#D97D64" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <TouchableOpacity 
            onPress={openAddAppointment}
            className="bg-white p-4 rounded-2xl flex-row items-center justify-between border border-dashed border-brand-warm-gray shadow-sm"
          >
            <View className="flex-row items-center flex-1">
              <View className="w-12 h-12 bg-brand-ivory rounded-full items-center justify-center mr-4">
                <CalendarHeart size={20} color="#AEB09B" />
              </View>
              <View className="flex-1 pr-2">
                <Text className="font-sans text-sm font-bold text-brand-charcoal">
                  {t('agenda.no_treatments')}
                </Text>
                <Text className="font-sans text-xs text-brand-sage-dark mt-0.5" numberOfLines={1}>
                  {t('agenda.schedule_cta')}
                </Text>
              </View>
            </View>
            <ArrowRight size={18} color="#AEB09B" />
          </TouchableOpacity>
        )}
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
      <View className="mb-8">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="font-serif text-xl text-brand-charcoal font-bold">{t('home.favorites')}</Text>
          <TouchableOpacity 
            onPress={() => setFavModalVisible(true)} 
            className="px-3 py-1.5 bg-brand-nude border border-brand-warm-gray rounded-full"
          >
            <Text className="font-sans text-xs font-bold text-brand-bronze uppercase tracking-wider">
              {t('today.manage_favorites')}
            </Text>
          </TouchableOpacity>
        </View>

        {favorites.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible pb-4">
            {favorites.map(fav => (
              <View key={fav.id} className="bg-white border border-brand-warm-gray rounded-2xl p-4 w-48 mr-4 shadow-sm items-center relative">
                <TouchableOpacity 
                  onPress={() => toggleFavorite(fav)}
                  className="absolute top-2.5 right-2.5 p-1 z-10"
                >
                  <Star size={16} color="#B97C63" fill="#B97C63" />
                </TouchableOpacity>
                <View className="w-16 h-16 bg-brand-ivory rounded-full items-center justify-center mb-3">
                  <Star size={24} color="#D7A58D" fill="#F1E7E2" />
                </View>
                <Text className="font-sans text-sm font-bold text-brand-charcoal text-center" numberOfLines={2}>{fav.custom_name}</Text>
                <Text className="font-sans text-xs text-brand-sage-dark mt-1 text-center" numberOfLines={1}>{fav.custom_brand}</Text>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View className="bg-white p-6 rounded-3xl border border-dashed border-brand-warm-gray items-center shadow-sm">
            <Text className="text-sm font-sans text-brand-sage-dark text-center mb-4 leading-relaxed">
              {t('today.no_favorites')}
            </Text>
            <Text className="text-xs font-sans text-brand-sage-dark text-center mb-4 leading-relaxed">
              {t('today.favorites_instructions')}
            </Text>
            <TouchableOpacity
              onPress={() => setFavModalVisible(true)}
              className="px-5 py-2.5 bg-brand-rose-metallic rounded-full shadow-sm"
            >
              <Text className="font-sans text-xs font-semibold text-white uppercase tracking-wider">
                {t('today.manage_favorites')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Routine PM Checklist */}
      <View className="mb-24">
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

      {/* MODAL 1: ADICIONAR E EDITAR AGENDAMENTOS */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={appModalVisible}
        onRequestClose={() => { setAppModalVisible(false); resetAppForm(); }}
      >
        <View className="flex-1 justify-center items-center bg-black/60 px-6">
          <View className="bg-white w-full rounded-3xl p-6 shadow-xl border border-brand-warm-gray max-w-sm">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-lg font-serif text-brand-charcoal font-bold">
                {appEditing ? t('agenda.modal_title_edit') : t('agenda.modal_title_add')}
              </Text>
              <TouchableOpacity onPress={() => { setAppModalVisible(false); resetAppForm(); }}>
                <X size={20} color="#8C8E78" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 16 }}>
              <View>
                <Text className="text-xs font-sans font-semibold text-brand-charcoal mb-1 uppercase tracking-wider">
                  {t('agenda.placeholder_title')}
                </Text>
                <TextInput
                  value={appTitle}
                  onChangeText={setAppTitle}
                  placeholder="ex: Limpeza de Pele"
                  className="bg-brand-ivory px-4 py-3 border border-brand-warm-gray rounded-2xl font-sans text-base text-brand-charcoal"
                />
              </View>

              <View>
                <Text className="text-xs font-sans font-semibold text-brand-charcoal mb-1 uppercase tracking-wider">
                  Data
                </Text>
                <TextInput
                  value={appDate}
                  onChangeText={setAppDate}
                  placeholder="ex: Sexta-feira, 14 de Junho"
                  className="bg-brand-ivory px-4 py-3 border border-brand-warm-gray rounded-2xl font-sans text-base text-brand-charcoal"
                />
              </View>

              <View>
                <Text className="text-xs font-sans font-semibold text-brand-charcoal mb-1 uppercase tracking-wider">
                  Horário
                </Text>
                <TextInput
                  value={appTime}
                  onChangeText={setAppTime}
                  placeholder="ex: 14:00 - 15:30"
                  className="bg-brand-ivory px-4 py-3 border border-brand-warm-gray rounded-2xl font-sans text-base text-brand-charcoal"
                />
              </View>

              <View>
                <Text className="text-xs font-sans font-semibold text-brand-charcoal mb-1 uppercase tracking-wider">
                  {t('agenda.placeholder_location')}
                </Text>
                <TextInput
                  value={appLocation}
                  onChangeText={setAppLocation}
                  placeholder="ex: Clínica VisCare"
                  className="bg-brand-ivory px-4 py-3 border border-brand-warm-gray rounded-2xl font-sans text-base text-brand-charcoal"
                />
              </View>
            </View>

            <View className="flex-row space-x-3 mt-8">
              <TouchableOpacity
                onPress={() => { setAppModalVisible(false); resetAppForm(); }}
                className="flex-1 py-3 bg-brand-warm-gray rounded-full items-center mr-2"
              >
                <Text className="font-sans text-xs font-bold text-brand-charcoal uppercase tracking-wider">
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddOrEditAppointment}
                className="flex-1 py-3 bg-brand-rose-metallic rounded-full items-center"
              >
                <Text className="font-sans text-xs font-bold text-white uppercase tracking-wider">
                  {t('agenda.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: GERENCIAR PRODUTOS FAVORITOS */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={favModalVisible}
        onRequestClose={() => setFavModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white w-full rounded-t-3xl p-6 shadow-2xl max-h-[80%]">
            <View className="flex-row justify-between items-center mb-6 pb-2 border-b border-brand-warm-gray">
              <Text className="text-lg font-serif text-brand-charcoal font-bold">
                {t('today.manage_favorites')}
              </Text>
              <TouchableOpacity onPress={() => setFavModalVisible(false)}>
                <X size={20} color="#8C8E78" />
              </TouchableOpacity>
            </View>

            {cabinetProducts.length === 0 ? (
              <View className="items-center py-12">
                <Text className="font-sans text-sm text-brand-sage-dark text-center mb-6">
                  {t('products.empty_msg')}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setFavModalVisible(false);
                    router.push('/(tabs)/products');
                  }}
                  className="px-6 py-3 bg-brand-rose-metallic rounded-full"
                >
                  <Text className="font-sans text-xs font-bold text-white uppercase tracking-widest">
                    Ir para Armário
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView className="space-y-3 pb-8">
                {cabinetProducts.map(prod => {
                  const isFav = prod.is_favorite === true;
                  return (
                    <View 
                      key={prod.id} 
                      className="flex-row justify-between items-center p-4 bg-brand-ivory rounded-2xl border border-brand-warm-gray"
                    >
                      <View className="flex-1 pr-4">
                        <Text className="font-sans text-sm font-bold text-brand-charcoal">
                          {prod.custom_name}
                        </Text>
                        <Text className="font-sans text-xs text-brand-sage-dark mt-0.5">
                          {prod.custom_brand}
                        </Text>
                      </View>
                      
                      <TouchableOpacity 
                        onPress={() => toggleFavorite(prod)}
                        className="p-2 bg-white rounded-full shadow-sm"
                      >
                        <Star 
                          size={20} 
                          color="#B97C63" 
                          fill={isFav ? "#B97C63" : "none"} 
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 3: LEITOR FACIAL IA */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={scanModalVisible}
        onRequestClose={() => setScanModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/80 px-6">
          <View className="bg-white w-full rounded-3xl p-6 shadow-2xl border border-brand-warm-gray max-w-md my-8 flex-col max-h-[85%]">
            
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-serif text-brand-charcoal font-bold">
                {t('scan.title')}
              </Text>
              <TouchableOpacity onPress={() => setScanModalVisible(false)}>
                <X size={20} color="#8C8E78" />
              </TouchableOpacity>
            </View>

            {scanStep === 'select' && (
              <View className="items-center py-6">
                <View className="w-24 h-24 bg-brand-rose-light/20 rounded-full items-center justify-center mb-6">
                  <Camera size={44} color="#B97C63" />
                </View>
                <Text className="font-sans text-sm text-brand-sage-dark text-center mb-8 px-4 leading-relaxed">
                  {t('scan.subtitle')}
                </Text>
                
                <View className="w-full space-y-4">
                  <TouchableOpacity
                    onPress={() => startScanning('camera')}
                    className="w-full py-4 bg-brand-rose-metallic rounded-full flex-row items-center justify-center space-x-2 shadow-sm mb-3"
                  >
                    <Camera size={18} color="white" />
                    <Text className="text-white font-sans text-sm font-bold uppercase tracking-wider">
                      {t('scan.btn_camera')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => startScanning('gallery')}
                    className="w-full py-4 bg-brand-nude border border-brand-warm-gray rounded-full flex-row items-center justify-center space-x-2"
                  >
                    <ImageIcon size={18} color="#B97C63" />
                    <Text className="text-brand-charcoal font-sans text-sm font-bold uppercase tracking-wider">
                      {t('scan.btn_gallery')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {scanStep === 'scanning' && (
              <View className="items-center justify-center py-12">
                <View className="w-56 h-56 rounded-full border-4 border-dashed border-brand-rose-metallic items-center justify-center relative overflow-hidden bg-brand-nude/40 mb-6">
                  <View className="opacity-40">
                    <Sparkles size={100} color="#B97C63" />
                  </View>

                  <View 
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      height: 4,
                      backgroundColor: '#B97C63',
                      shadowColor: '#B97C63',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.8,
                      shadowRadius: 4,
                      elevation: 5,
                      top: `${scanLineTop}%`
                    }}
                  />
                </View>

                <ActivityIndicator size="small" color="#B97C63" className="mb-4" />
                <Text className="font-serif text-lg text-brand-bronze font-bold">
                  {t('scan.loading')}
                </Text>
                <Text className="font-sans text-xs text-brand-sage-dark mt-2 text-center">
                  Mapeando pontos da pele...
                </Text>
              </View>
            )}

            {scanStep === 'results' && scanResults && (
              <ScrollView className="flex-1 pr-1" showsVerticalScrollIndicator={true}>
                <View className="items-center mb-6 mt-2">
                  <View className="w-12 h-12 bg-green-50 rounded-full items-center justify-center mb-3">
                    <Sparkles size={24} color="#B97C63" />
                  </View>
                  <Text className="font-serif text-lg font-bold text-brand-charcoal text-center">
                    {t('scan.results_title')}
                  </Text>
                </View>

                <View className="space-y-4 mb-6">
                  <View>
                    <View className="flex-row justify-between mb-1">
                      <Text className="font-sans text-xs font-semibold text-brand-charcoal">{t('scan.score_hydration')}</Text>
                      <Text className="font-sans text-xs font-bold text-brand-rose-metallic">{scanResults.hydration}%</Text>
                    </View>
                    <View className="h-2 bg-brand-nude rounded-full overflow-hidden">
                      <View style={{ width: `${scanResults.hydration}%` }} className="h-full bg-brand-rose-metallic" />
                    </View>
                  </View>

                  <View>
                    <View className="flex-row justify-between mb-1">
                      <Text className="font-sans text-xs font-semibold text-brand-charcoal">{t('scan.score_wrinkles')}</Text>
                      <Text className="font-sans text-xs font-bold text-brand-rose-metallic">{scanResults.wrinkles}%</Text>
                    </View>
                    <View className="h-2 bg-brand-nude rounded-full overflow-hidden">
                      <View style={{ width: `${scanResults.wrinkles}%` }} className="h-full bg-brand-rose-metallic" />
                    </View>
                  </View>

                  <View>
                    <View className="flex-row justify-between mb-1">
                      <Text className="font-sans text-xs font-semibold text-brand-charcoal">{t('scan.score_sensitivity')}</Text>
                      <Text className="font-sans text-xs font-bold text-brand-rose-metallic">{scanResults.sensitivity}%</Text>
                    </View>
                    <View className="h-2 bg-brand-nude rounded-full overflow-hidden">
                      <View style={{ width: `${scanResults.sensitivity}%` }} className="h-full bg-brand-rose-metallic" />
                    </View>
                  </View>

                  <View>
                    <View className="flex-row justify-between mb-1">
                      <Text className="font-sans text-xs font-semibold text-brand-charcoal">{t('scan.score_acne')}</Text>
                      <Text className="font-sans text-xs font-bold text-brand-rose-metallic">{scanResults.acne}%</Text>
                    </View>
                    <View className="h-2 bg-brand-nude rounded-full overflow-hidden">
                      <View style={{ width: `${scanResults.acne}%` }} className="h-full bg-brand-rose-metallic" />
                    </View>
                  </View>
                </View>

                <View className="bg-brand-nude p-4 rounded-2xl mb-6 border border-brand-warm-gray">
                  <Text className="font-serif text-sm font-bold text-brand-charcoal mb-2">
                    {t('scan.diagnosis_title')}
                  </Text>
                  <Text className="font-sans text-xs text-brand-sage-dark leading-relaxed">
                    {scanResults.diagnosis}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setScanModalVisible(false)}
                  className="w-full py-3.5 bg-brand-rose-metallic rounded-full items-center shadow-sm"
                >
                  <Text className="text-white font-sans text-xs font-bold uppercase tracking-wider">
                    {t('scan.back_to_dashboard')}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
