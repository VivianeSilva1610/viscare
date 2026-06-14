import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LocalizationContext';
import { DataService } from '../../services/dataService';
import { UserProduct, Routine, RoutineStep, CompatibilityRule } from '../../services/mockDb';
import { Sparkles, Trash2, ArrowUp, ArrowDown, Plus, X, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react-native';

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

  useEffect(() => {
    loadData();
  }, [user, activeTab]);

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
      return;
    }

    const res = await DataService.checkCompatibility(ingredients);
    setCompatStatus(res.status);
    setCompatConflicts(res.conflicts);
  };

  // Reordenação de passos (Subir)
  const moveUp = async (index: number) => {
    if (index === 0) return;
    const updated = [...steps];
    // Trocar posições
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;

    // Atualizar índices de posição
    updated.forEach((s, idx) => {
      s.position = idx;
    });

    setSteps(updated);
    const currentRoutine = routines.find(r => r.type === activeTab);
    if (currentRoutine) {
      await DataService.saveRoutineSteps(currentRoutine.id, updated);
      await runCompatibilityCheck(updated);
    }
  };

  // Reordenação de passos (Descer)
  const moveDown = async (index: number) => {
    if (index === steps.length - 1) return;
    const updated = [...steps];
    // Trocar posições
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;

    // Atualizar índices de posição
    updated.forEach((s, idx) => {
      s.position = idx;
    });

    setSteps(updated);
    const currentRoutine = routines.find(r => r.type === activeTab);
    if (currentRoutine) {
      await DataService.saveRoutineSteps(currentRoutine.id, updated);
      await runCompatibilityCheck(updated);
    }
  };

  // Remover passo
  const removeStep = async (stepId: string) => {
    const updated = steps.filter(s => s.id !== stepId);
    // Reajustar posições
    updated.forEach((s, idx) => {
      s.position = idx;
    });

    setSteps(updated);
    const currentRoutine = routines.find(r => r.type === activeTab);
    if (currentRoutine) {
      await DataService.saveRoutineSteps(currentRoutine.id, updated);
      await runCompatibilityCheck(updated);
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
      // Salvar no banco
      await DataService.saveRoutineSteps(currentRoutine.id, allSteps as RoutineStep[]);
      await loadData();
    } catch (e) {
      console.warn(e);
      setLoading(false);
    }
  };

  // Gerar rotina com IA
  const handleGenerateWithAI = async () => {
    if (cabinet.length === 0) {
      Alert.alert(t('common.info'), t('routine.empty_cabinet_warning'));
      return;
    }

    setGenerating(true);
    try {
      const res = await DataService.generateRoutine(user?.id || 'guest-user-id', activeTab);
      if (res.success && res.routineSteps) {
        const currentRoutine = routines.find(r => r.type === activeTab);
        if (currentRoutine) {
          // Converter mock local format para passos completos
          const fullSteps = res.routineSteps.map((s, idx) => ({
            id: `step-${Math.random()}`,
            routine_id: currentRoutine.id,
            user_product_id: s.user_product_id,
            position: idx,
            notes: s.notes,
            is_completed: s.is_completed,
            product: cabinet.find(p => p.id === s.user_product_id)
          }));

          setSteps(fullSteps);
          await DataService.saveRoutineSteps(currentRoutine.id, fullSteps as RoutineStep[]);
          await runCompatibilityCheck(fullSteps);
          
          Alert.alert(
            t('common.info'),
            t('alert.routine_success')
          );
        }
      } else {
        Alert.alert(t('common.error'), res.error || t('alert.routine_error'));
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

      <ScrollView className="flex-1 px-6">
        
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
                      ⚠️ <Text className="font-semibold">{c.ingredient_a} + {c.ingredient_b}:</Text> {
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

        {/* List of steps */}
        {steps.length === 0 ? (
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
        ) : (
          <View className="space-y-4 pb-20">
            {steps.map((step, index) => (
              <View
                key={step.id}
                className="bg-white p-4 border border-brand-beige rounded-3xl flex-row items-center justify-between shadow-sm"
              >
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

                {/* Controles de reordenação e deleção */}
                <View className="flex-row items-center space-x-1">
                  <TouchableOpacity
                    onPress={() => moveUp(index)}
                    disabled={index === 0}
                    className={`p-2 rounded-xl bg-brand-beige ${index === 0 ? 'opacity-40' : ''}`}
                    accessibilityLabel={t('accessibility.move_up')}
                  >
                    <ArrowUp size={14} color="#8E8E93" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveDown(index)}
                    disabled={index === steps.length - 1}
                    className={`p-2 rounded-xl bg-brand-beige ${index === steps.length - 1 ? 'opacity-40' : ''}`}
                    accessibilityLabel={t('accessibility.move_down')}
                  >
                    <ArrowDown size={14} color="#8E8E93" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => removeStep(step.id)}
                    className="p-2 rounded-xl bg-red-500/10"
                    accessibilityLabel={t('accessibility.remove_step')}
                  >
                    <Trash2 size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity
              onPress={() => setIsAddModalOpen(true)}
              className="w-full py-4 border-2 border-dashed border-brand-rose-metallic/30 rounded-3xl flex-row items-center justify-center space-x-2 mt-2"
            >
              <Plus size={18} color="#B97C63" />
              <Text className="text-brand-rose-metallic font-sans text-sm font-bold">{t('routine.add_step')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

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
