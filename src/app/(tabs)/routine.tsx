import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Platform, FlatList } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LocalizationContext';
import { DataService } from '../../services/dataService';
import { UserProduct, Routine, RoutineStep, CompatibilityRule } from '../../services/mockDb';
import { Sparkles, Trash2, ArrowUp, ArrowDown, Plus, X, CheckCircle, AlertTriangle, AlertCircle, GripVertical } from 'lucide-react-native';
import { AIRecommendationService } from '../../services/aiRecommendations';
import { SkinProfile } from '../../services/mockDb';
import { useFocusEffect } from 'expo-router';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';

export default function RoutineScreen() {
  const { user } = useAuth();
  const { t, language } = useTranslation();

  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'AM' | 'PM'>('AM');
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [steps, setSteps] = useState<(RoutineStep & { product?: UserProduct })[]>([]);
  const [cabinet, setCabinet] = useState<UserProduct[]>([]);
  
  // Estados do Verificador de Compatibilidade
  const [compatStatus, setCompatStatus] = useState<'green' | 'yellow' | 'red'>('green');
  const [compatConflicts, setCompatConflicts] = useState<CompatibilityRule[]>([]);
  const [compatSynergies, setCompatSynergies] = useState<CompatibilityRule[]>([]);

  // Estados para Adicionar Prodotto Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Carregar gabinete do usuário
      const products = await DataService.getUserProducts(user.id);
      setCabinet(products);

      // Carregar rotinas
      const userRoutines = await DataService.getRoutines(user.id);
      setRoutines(userRoutines);

      // Selecionar a rotina atual
      const currentRoutine = userRoutines.find(r => r.type === activeTab);
      if (currentRoutine) {
        const routineSteps = await DataService.getRoutineSteps(currentRoutine.id);
        const enriched = routineSteps.map(s => ({
          ...s,
          product: products.find(p => p.id === s.user_product_id)
        })).sort((a, b) => a.position - b.position);
        setSteps(enriched);

        // Rodar verificador de compatibilidade
        await runCompatibilityCheck(enriched);
      }
    } catch (e) {
      console.warn('Erro ao carregar rotina', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user, activeTab])
  );

  // Ordem de categorias recomendada dermatologicamente
  const CATEGORY_ORDER = {
    cleanser: 1,
    toner: 2,
    treatment: 3,
    moisturizer: 4,
    spf: 5
  };

  // Gerador de Notas Ativas com base na IA
  const generateStepNote = (category: string, activeIngredients: string[], routineType: 'AM' | 'PM', stepNumber: number) => {
    let typeLabel = '';
    let desc = '';
    const cat = category.toLowerCase();

    if (cat === 'cleanser') {
      typeLabel = language === 'pt' ? 'Limpar' : language === 'it' ? 'Detersione' : 'Cleanse';
      desc = routineType === 'AM'
        ? (language === 'pt' ? 'Limpe suavemente o rosto para começar o dia.' : language === 'it' ? 'Pulisci delicatamente il viso per iniziare la giornata.' : 'Gently cleanse your face to start the day.')
        : (language === 'pt' ? 'Remova as impurezas e a maquiagem acumuladas.' : language === 'it' ? 'Rimuovi le impurità e il trucco accumulati.' : 'Remove accumulated impurities and makeup.');
    } else if (cat === 'toner') {
      typeLabel = language === 'pt' ? 'Tonificar' : language === 'it' ? 'Tonificare' : 'Tone';
      desc = language === 'pt' ? 'Aplique dando batidinhas para restaurar o pH.' : language === 'it' ? 'Applica picchiettando per ripristinare il pH.' : 'Pat gently to restore pH balance.';
    } else if (cat === 'treatment') {
      typeLabel = language === 'pt' ? 'Tratar' : language === 'it' ? 'Trattamento' : 'Treat';
      const hasPhotosensitive = activeIngredients?.some(i => {
        const name = i.toLowerCase();
        return name.includes('retinol') || name.includes('retinolo') || name.includes('aha') || name.includes('bha') || name.includes('glicol') || name.includes('salicil');
      });
      if (hasPhotosensitive) {
        desc = language === 'pt' ? 'Recomendado para uso na rotina da noite. Use protetor solar pela manhã.' : language === 'it' ? 'Consigliato per l\'uso nella routine serale. Usa la protezione solare al mattino.' : 'Recommended for night routine use. Use sunscreen in the morning.';
      } else {
        desc = language === 'pt' ? 'Use uma pequena quantidade e massageie com cuidado.' : language === 'it' ? 'Usa una piccola quantità e massaggia con cura.' : 'Use a small amount and massage gently.';
      }
    } else if (cat === 'moisturizer') {
      typeLabel = language === 'pt' ? 'Hidratar' : language === 'it' ? 'Idratare' : 'Moisturize';
      desc = language === 'pt' ? 'Massageie para selar a hidratação.' : language === 'it' ? 'Massaggia per sigillare l\'idratazione.' : 'Massage to lock in hydration.';
    } else if (cat === 'spf') {
      typeLabel = language === 'pt' ? 'Proteger' : language === 'it' ? 'Protezione' : 'Protect';
      desc = language === 'pt' ? 'Proteção solar obrigatória pela manhã. Reaplique durante o dia.' : language === 'it' ? 'Protezione solare obbligatoria al mattino. Riapplica durante il giorno.' : 'Mandatory morning sun protection. Reapply throughout the day.';
    }

    return language === 'pt'
      ? `${stepNumber}º Passo: ${typeLabel} - ${desc}`
      : language === 'it'
      ? `${stepNumber}° Passaggio: ${typeLabel} - ${desc}`
      : `Step ${stepNumber}: ${typeLabel} - ${desc}`;
  };

  // Ordena os passos usando a ordem dermatológica da IA e gera as notas
  const orderStepsDermatologicallyAndAnnotate = (
    stepsList: (RoutineStep & { product?: UserProduct })[],
    routineType: 'AM' | 'PM'
  ) => {
    const sorted = [...stepsList].sort((a, b) => {
      const catA = a.product?.custom_category || 'cleanser';
      const catB = b.product?.custom_category || 'cleanser';
      const orderA = CATEGORY_ORDER[catA] || 99;
      const orderB = CATEGORY_ORDER[catB] || 99;
      return orderA - orderB;
    });

    return sorted.map((s, idx) => {
      const stepNumber = idx + 1;
      const category = s.product?.custom_category || 'cleanser';
      const actives = s.product?.custom_active_ingredients || [];
      return {
        ...s,
        position: idx,
        notes: generateStepNote(category, actives, routineType, stepNumber)
      };
    });
  };

  // Apenas anota os passos na ordem fornecida (mantém a ordenação manual das setas)
  const annotateStepsOrderOnly = (
    stepsList: (RoutineStep & { product?: UserProduct })[],
    routineType: 'AM' | 'PM'
  ) => {
    return stepsList.map((s, idx) => {
      const stepNumber = idx + 1;
      const category = s.product?.custom_category || 'cleanser';
      const actives = s.product?.custom_active_ingredients || [];
      return {
        ...s,
        position: idx,
        notes: generateStepNote(category, actives, routineType, stepNumber)
      };
    });
  };

  // Executar motor de regras de compatibilidade
  const runCompatibilityCheck = async (currentSteps: (RoutineStep & { product?: UserProduct })[]) => {
    // Extrair ingredientes ativos dos produtos na rotina
    const ingredients: string[] = [];
    currentSteps.forEach(s => {
      if (s.product) {
        const activeList = s.product.custom_active_ingredients;
        activeList.forEach(ing => {
          if (ing && !ingredients.includes(ing)) {
            ingredients.push(ing);
          }
        });
      }
    });

    if (ingredients.length <= 1) {
      setCompatStatus('green');
      setCompatConflicts([]);
      setCompatSynergies([]);
      return;
    }

    const res = await DataService.checkCompatibility(ingredients);
    setCompatStatus(res.status);
    setCompatConflicts(res.conflicts.filter(c => c.severity !== 'green'));
    setCompatSynergies(res.conflicts.filter(c => c.severity === 'green'));
  };

  // Reordenação de passos (Drag and Drop)
  const handleReorderSteps = async (newData: (RoutineStep & { product?: UserProduct })[]) => {
    // Atualizar índices de posição e notas
    const annotated = annotateStepsOrderOnly(newData, activeTab);
    
    setSteps(annotated);
    const currentRoutine = routines.find(r => r.type === activeTab);
    if (currentRoutine) {
      await DataService.saveRoutineSteps(currentRoutine.id, annotated as RoutineStep[]);
      await runCompatibilityCheck(annotated);
    }
  };

  // Remover passo
  const removeStep = async (stepId: string) => {
    const updated = steps.filter(s => s.id !== stepId);
    
    // Atualizar índices de posição e notas
    const annotated = annotateStepsOrderOnly(updated, activeTab);

    setSteps(annotated);
    const currentRoutine = routines.find(r => r.type === activeTab);
    if (currentRoutine) {
      await DataService.saveRoutineSteps(currentRoutine.id, annotated as RoutineStep[]);
      await runCompatibilityCheck(annotated);
    }
  };

  // Adicionar produto selecionado à rotina
  const addProductToRoutine = async (userProductId: string) => {
    const currentRoutine = routines.find(r => r.type === activeTab);
    if (!currentRoutine) return;

    // Evitar duplicidade na mesma rotina
    if (steps.some(s => s.user_product_id === userProductId)) {
      Alert.alert(t('common.info'), t('alert.product_exists'));
      return;
    }

    const product = cabinet.find(p => p.id === userProductId);
    const newStep: Omit<RoutineStep, 'id' | 'routine_id'> = {
      user_product_id: userProductId,
      position: steps.length,
      notes: '',
      is_completed: false
    };

    setIsAddModalOpen(false);
    setLoading(true);

    try {
      const allSteps = [...steps, { ...newStep, id: `temp-${Math.random()}`, routine_id: currentRoutine.id, product }];
      
      // Ordenar dermatologicamente e anotar com a IA
      const orderedAndAnnotated = orderStepsDermatologicallyAndAnnotate(allSteps, activeTab);

      // Salvar no banco
      await DataService.saveRoutineSteps(currentRoutine.id, orderedAndAnnotated as RoutineStep[]);
      await loadData();
    } catch (e) {
      console.warn(e);
      setLoading(false);
    }
  };

  // Gerar rotina com IA
  const handleGenerateWithAI = async () => {
    setGenerating(true);
    try {
      let currentCabinet = cabinet;

      // Se o armário está vazio, tenta preencher automaticamente com as recomendações da IA
      if (currentCabinet.length === 0) {
        const skinProfile = await DataService.getSkinProfile(user?.id || 'guest-user-id');

        if (!skinProfile) {
          // Sem perfil de pele — orienta o usuário a completar o quiz
          Alert.alert(
            t('common.info'),
            language === 'pt'
              ? 'Complete o questionário de perfil de pele para que a IA possa gerar sua rotina personalizada.'
              : language === 'it'
              ? 'Completa il questionario del profilo pelle per ricevere una routine personalizzata dall\'IA.'
              : 'Complete the skin profile quiz so the AI can generate your personalized routine.',
            [{ text: 'OK' }]
          );
          setGenerating(false);
          return;
        }

        // Buscar recomendações baseadas no perfil de pele
        const recommendations = await AIRecommendationService.getRecommendations(skinProfile as SkinProfile);

        if (recommendations.length === 0) {
          Alert.alert(t('common.error'), t('alert.routine_error'));
          setGenerating(false);
          return;
        }

        // Adicionar os produtos recomendados ao armário automaticamente
        const userId = user?.id || 'guest-user-id';
        for (const rec of recommendations) {
          await DataService.addUserProduct(userId, {
            product_id: rec.product.id,
            custom_name: rec.product.name,
            custom_brand: rec.product.brand,
            custom_category: rec.product.category,
            custom_active_ingredients: rec.product.active_ingredients,
            opened_at: new Date().toISOString().split('T')[0],
            expiration_months: 12
          });
        }

        // Recarregar o armário
        currentCabinet = await DataService.getUserProducts(userId);
        setCabinet(currentCabinet);

        Alert.alert(
          t('common.info'),
          language === 'pt'
            ? `✨ A IA adicionou ${recommendations.length} produto(s) ao seu armário com base no seu perfil de pele e está gerando sua rotina!`
            : language === 'it'
            ? `✨ L'IA ha aggiunto ${recommendations.length} prodotto/i al tuo armadietto in base al tuo profilo pelle e sta generando la tua routine!`
            : `✨ AI added ${recommendations.length} product(s) to your cabinet based on your skin profile and is generating your routine!`
        );
      }

      const res = await DataService.generateRoutine(user?.id || 'guest-user-id', activeTab);
      if (res.success && res.routineSteps) {
        const currentRoutine = routines.find(r => r.type === activeTab);
        if (currentRoutine) {
          const fullSteps = res.routineSteps.map((s, idx) => ({
            id: `step-${Math.random()}`,
            routine_id: currentRoutine.id,
            user_product_id: s.user_product_id,
            position: idx,
            notes: s.notes,
            is_completed: s.is_completed,
            product: currentCabinet.find(p => p.id === s.user_product_id)
          }));

          // Ordenar dermatologicamente e anotar com a IA para formatar as notas da mesma forma
          const orderedAndAnnotated = orderStepsDermatologicallyAndAnnotate(fullSteps, activeTab);

          setSteps(orderedAndAnnotated);
          await DataService.saveRoutineSteps(currentRoutine.id, orderedAndAnnotated as RoutineStep[]);
          await runCompatibilityCheck(orderedAndAnnotated);

          Alert.alert(
            t('common.info'),
            t('alert.routine_success')
          );
        }
      } else {
        Alert.alert(t('common.error'), t(res.error || 'alert.routine_error'));
      }
    } catch (e) {
      Alert.alert(t('common.error'), t('common.connection_error'));
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-ivory">
        <ActivityIndicator size="large" color="#B97C63" />
      </View>
    );
  }

  // Filtrar produtos no armário que ainda não estão nessa rotina
  const availableProducts = cabinet.filter(p => !steps.some(s => s.user_product_id === p.id));

  const renderRoutineStep = ({ item: step, drag, isActive, getIndex }: RenderItemParams<RoutineStep & { product?: UserProduct }>) => {
    const index = getIndex() || 0;
    
    // Check if step's product has an ingredient in compatConflicts
    let isConflicted = false;
    if (step.product?.custom_active_ingredients) {
      isConflicted = step.product.custom_active_ingredients.some(ing => 
        compatConflicts.some(conflict => 
          conflict.ingredient_a.toLowerCase() === ing.toLowerCase() || 
          conflict.ingredient_b.toLowerCase() === ing.toLowerCase()
        )
      );
    }

    const InnerContent = (
        <View
          className={`bg-white p-4 rounded-3xl flex-row items-center justify-between shadow-sm mb-4 ${
            isActive ? 'opacity-80 scale-105 border-brand-rose-metallic border-2' : 
            isConflicted ? 'border-2 border-red-300' : 'border border-brand-beige'
          }`}
        >
          {/* Grip Handler */}
          <TouchableOpacity onLongPress={Platform.OS === 'web' ? undefined : drag} delayLongPress={150} className={`mr-3 p-1 ${Platform.OS === 'web' ? 'opacity-50' : ''}`}>
            <GripVertical size={20} color="#AEB09B" />
          </TouchableOpacity>
          
          <View className="flex-1 pr-3">
            <View className="flex-row items-center space-x-2">
              <View className="w-5 h-5 bg-brand-beige rounded-full items-center justify-center">
                <Text className="text-[10px] font-sans font-bold text-brand-sage-dark">{index + 1}</Text>
              </View>
              <Text className="font-sans text-sm font-bold text-brand-charcoal">
                {step.product?.custom_name || t('home.product_default')}
              </Text>
            </View>
            <Text className="font-sans text-xs text-[#8E8E93] mt-0.5 ml-7">
              {step.product?.custom_brand || t('home.brand_default')} • <Text className="capitalize">{step.product?.custom_category}</Text>
            </Text>
            {step.product?.custom_active_ingredients.length ? (
              <Text className="font-sans text-[11px] text-brand-rose-light mt-1 ml-7">
                ✨ {step.product.custom_active_ingredients.join(', ')}
              </Text>
            ) : null}
            {step.notes ? (
              <Text className="font-sans text-xs text-brand-sage-dark mt-1 ml-7 italic">
                {step.notes}
              </Text>
            ) : null}
          </View>

          <View className="flex-row items-center space-x-1">
            <TouchableOpacity
              onPress={() => removeStep(step.id)}
              className="p-2 rounded-xl bg-red-500/10"
              accessibilityLabel={t('accessibility.remove_step')}
            >
              <Trash2 size={14} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
    );

    return Platform.OS === 'web' ? InnerContent : (
      <ScaleDecorator>
        {InnerContent}
      </ScaleDecorator>
    );
  };

  return (
    <View className="flex-1 bg-brand-ivory pt-12">
      {/* Header */}
      <View className="px-6 py-4 flex-row justify-between items-center border-b border-brand-beige">
      <Text className="text-2xl font-serif text-brand-bronze font-bold">
        {t('routine.tab_title')}
      </Text>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleGenerateWithAI}
        disabled={generating}
        className="bg-brand-rose-metallic px-4 py-2 rounded-full flex-row items-center space-x-1.5 shadow-sm"
      >
        {generating ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <>
            <Sparkles size={16} color="white" />
            <Text className="text-white font-sans text-xs font-bold">{t('routine.generate_ai')}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>

    {/* AM/PM Tabs */}
    <View className="flex-row px-6 my-4">
      <TouchableOpacity
        onPress={() => setActiveTab('AM')}
        className={`flex-1 py-3 items-center rounded-2xl mr-2 ${activeTab === 'AM' ? 'bg-brand-rose-light/10 border border-brand-rose-metallic/30' : 'bg-white border border-brand-beige'}`}
      >
        <Text className={`font-sans text-sm font-bold ${activeTab === 'AM' ? 'text-brand-rose-metallic' : 'text-[#8E8E93]'}`}>
          {t('routine.am_label')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setActiveTab('PM')}
        className={`flex-1 py-3 items-center rounded-2xl ${activeTab === 'PM' ? 'bg-brand-rose-light/10 border border-brand-rose-metallic/30' : 'bg-white border border-brand-beige'}`}
      >
        <Text className={`font-sans text-sm font-bold ${activeTab === 'PM' ? 'text-brand-rose-metallic' : 'text-[#8E8E93]'}`}>
          {t('routine.pm_label')}
        </Text>
      </TouchableOpacity>
    </View>

    <View className="flex-1">
      {steps.length === 0 ? (
        <ScrollView className="flex-1 px-6">
          <View className="bg-white p-8 rounded-3xl border border-brand-beige items-center justify-center my-6">
            <Text className="font-sans text-sm text-brand-sage-dark text-center leading-relaxed mb-6">
              {t('routine.empty_desc')}
            </Text>
            <TouchableOpacity
              onPress={() => setIsAddModalOpen(true)}
              className="px-6 py-3 bg-brand-rose-metallic rounded-full flex-row items-center space-x-2 shadow-sm"
            >
              <Plus size={16} color="white" />
              <Text className="text-white font-sans text-sm font-bold">{t('routine.add_step')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : Platform.OS === 'web' ? (
        <FlatList
          data={steps}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => renderRoutineStep({ item, getIndex: () => index, isActive: false, drag: () => {} } as any)}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 80 }}
          ListHeaderComponent={
            <View className="mb-2">
              {/* COMPATIBILITY STATUS BANNER */}
              {steps.length > 1 && (
                <View className={`p-4 rounded-3xl mb-4 border flex-row items-start ${
                  compatStatus === 'red' 
                    ? 'bg-red-500/10 border-red-500/30' 
                    : compatStatus === 'yellow' 
                      ? 'bg-yellow-500/10 border-yellow-500/30' 
                      : 'bg-brand-sage-light/15 border-brand-sage-light/30'
                }`}>
                  <View className="mr-3 mt-0.5">
                    {compatStatus === 'red' ? (
                      <AlertCircle size={20} color="#EF4444" />
                    ) : compatStatus === 'yellow' ? (
                      <AlertTriangle size={20} color="#F5A623" />
                    ) : (
                      <CheckCircle size={20} color="#AEB09B" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className={`font-serif text-sm font-bold ${
                      compatStatus === 'red' ? 'text-red-500' : compatStatus === 'yellow' ? 'text-yellow-600' : 'text-brand-sage-dark'
                    }`}>
                      {compatStatus === 'red' ? t('compat.danger') : compatStatus === 'yellow' ? t('compat.caution') : t('compat.safe')}
                    </Text>
                    <Text className="font-sans text-xs text-brand-charcoal mt-1 leading-relaxed">
                      {compatStatus === 'green' ? t('compat.safe_desc') : (
                        t('compat.conflict_count').replace('{n}', compatConflicts.length.toString())
                      )}
                    </Text>
                    
                    {/* Explicações adicionais do conflito */}
                    {compatConflicts.length > 0 && (
                      <View className="mt-3 pt-2 border-t border-black/5 space-y-2">
                        {compatConflicts.map((c, i) => (
                           <Text key={i} className="font-sans text-[11px] text-brand-charcoal leading-relaxed">
                            {c.severity === 'red' ? '❌' : '⚠️'} <Text className="font-semibold">{c.ingredient_a} + {c.ingredient_b}:</Text> {
                              language === 'pt' ? c.description_pt : language === 'en' ? c.description_en : c.description_it
                            }
                          </Text>
                        ))}
                      </View>
                    )}

                    {/* Sinergias (Ótimas Combinações) */}
                    {compatSynergies.length > 0 && (
                      <View className="mt-3 pt-2 border-t border-black/5 space-y-2">
                        <Text className="font-sans text-[11px] font-bold text-brand-sage-dark uppercase tracking-wider">
                          {t('compat.synergies_title')}
                        </Text>
                        {compatSynergies.map((c, i) => (
                          <Text key={i} className="font-sans text-[11px] text-brand-charcoal leading-relaxed">
                            ✨ <Text className="font-semibold">{c.ingredient_a} + {c.ingredient_b}:</Text> {
                              language === 'pt' ? c.description_pt : language === 'en' ? c.description_en : c.description_it
                            }
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              )}

              <Text className="font-sans text-xs text-brand-sage-dark mb-4">
                {t('routine.order_hint')}
              </Text>
            </View>
          }
          ListFooterComponent={
            <TouchableOpacity
              onPress={() => setIsAddModalOpen(true)}
              className="w-full py-4 border-2 border-dashed border-brand-rose-metallic/30 rounded-3xl flex-row items-center justify-center space-x-2 mt-4"
            >
              <Plus size={18} color="#B97C63" />
              <Text className="text-brand-rose-metallic font-sans text-sm font-bold">{t('routine.add_step')}</Text>
            </TouchableOpacity>
          }
        />
      ) : (
        <DraggableFlatList
          data={steps}
          keyExtractor={(item) => item.id}
          onDragEnd={({ data }) => handleReorderSteps(data)}
          renderItem={renderRoutineStep}
          activationDistance={20}
          containerStyle={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 80 }}
          ListHeaderComponent={
            <View className="mb-2">
              {/* COMPATIBILITY STATUS BANNER */}
              {steps.length > 1 && (
                <View className={`p-4 rounded-3xl mb-4 border flex-row items-start ${
                  compatStatus === 'red' 
                    ? 'bg-red-500/10 border-red-500/30' 
                    : compatStatus === 'yellow' 
                      ? 'bg-yellow-500/10 border-yellow-500/30' 
                      : 'bg-brand-sage-light/15 border-brand-sage-light/30'
                }`}>
                  <View className="mr-3 mt-0.5">
                    {compatStatus === 'red' ? (
                      <AlertCircle size={20} color="#EF4444" />
                    ) : compatStatus === 'yellow' ? (
                      <AlertTriangle size={20} color="#F5A623" />
                    ) : (
                      <CheckCircle size={20} color="#AEB09B" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className={`font-serif text-sm font-bold ${
                      compatStatus === 'red' ? 'text-red-500' : compatStatus === 'yellow' ? 'text-yellow-600' : 'text-brand-sage-dark'
                    }`}>
                      {compatStatus === 'red' ? t('compat.danger') : compatStatus === 'yellow' ? t('compat.caution') : t('compat.safe')}
                    </Text>
                    <Text className="font-sans text-xs text-brand-charcoal mt-1 leading-relaxed">
                      {compatStatus === 'green' ? t('compat.safe_desc') : (
                        t('compat.conflict_count').replace('{n}', compatConflicts.length.toString())
                      )}
                    </Text>
                    
                    {/* Explicações adicionais do conflito */}
                    {compatConflicts.length > 0 && (
                      <View className="mt-3 pt-2 border-t border-black/5 space-y-2">
                        {compatConflicts.map((c, i) => (
                           <Text key={i} className="font-sans text-[11px] text-brand-charcoal leading-relaxed">
                            {c.severity === 'red' ? '❌' : '⚠️'} <Text className="font-semibold">{c.ingredient_a} + {c.ingredient_b}:</Text> {
                              language === 'pt' ? c.description_pt : language === 'en' ? c.description_en : c.description_it
                            }
                          </Text>
                        ))}
                      </View>
                    )}

                    {/* Sinergias (Ótimas Combinações) */}
                    {compatSynergies.length > 0 && (
                      <View className="mt-3 pt-2 border-t border-black/5 space-y-2">
                        <Text className="font-sans text-[11px] font-bold text-brand-sage-dark uppercase tracking-wider">
                          {t('compat.synergies_title')}
                        </Text>
                        {compatSynergies.map((c, i) => (
                          <Text key={i} className="font-sans text-[11px] text-brand-charcoal leading-relaxed">
                            ✨ <Text className="font-semibold">{c.ingredient_a} + {c.ingredient_b}:</Text> {
                              language === 'pt' ? c.description_pt : language === 'en' ? c.description_en : c.description_it
                            }
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              )}

              <Text className="font-sans text-xs text-brand-sage-dark mb-4">
                {t('routine.order_hint')}
              </Text>
            </View>
          }
          ListFooterComponent={
            <TouchableOpacity
              onPress={() => setIsAddModalOpen(true)}
              className="w-full py-4 border-2 border-dashed border-brand-rose-metallic/30 rounded-3xl flex-row items-center justify-center space-x-2 mt-4"
            >
              <Plus size={18} color="#B97C63" />
              <Text className="text-brand-rose-metallic font-sans text-sm font-bold">{t('routine.add_step')}</Text>
            </TouchableOpacity>
          }
        />
      )}
    </View>

    {/* MODAL ADICIONAR PRODUTO */}
    <Modal
      visible={isAddModalOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setIsAddModalOpen(false)}
    >
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-white rounded-t-[32px] p-6 max-h-[80%]">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-serif text-brand-bronze font-bold">
              {t('routine.add_step')}
            </Text>
            <TouchableOpacity
              onPress={() => setIsAddModalOpen(false)}
              className="p-2 bg-brand-beige rounded-full"
            >
              <X size={16} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          {availableProducts.length === 0 ? (
            <View className="py-8 items-center">
              <Text className="font-sans text-sm text-brand-sage-dark text-center leading-relaxed">
                {t('routine.available_empty_desc')}
              </Text>
            </View>
          ) : (
            <ScrollView className="space-y-3">
              {availableProducts.map(p => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => addProductToRoutine(p.id)}
                  className="flex-row items-center justify-between p-4 border border-brand-beige rounded-2xl bg-white active:bg-brand-beige/50"
                >
                  <View className="flex-1">
                    <Text className="font-sans text-sm font-bold text-brand-charcoal">
                      {p.custom_name}
                    </Text>
                    <Text className="font-sans text-xs text-[#8E8E93]">
                      {p.custom_brand} • <Text className="capitalize">{p.custom_category}</Text>
                    </Text>
                  </View>
                  <Plus size={18} color="#B97C63" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  </View>
  );
}
