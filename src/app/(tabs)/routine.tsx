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
    if (!user) return;
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
      Alert.alert('Info', 'Questo prodotto è già presente nella rotina.');
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
      Alert.alert('Info', t('routine.empty_cabinet_warning'));
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
            'Sparkles',
            language === 'it' 
              ? 'Routine ottimizzata con successo secondo le regole dermatologiche!' 
              : language === 'pt' 
                ? 'Rotina otimizada com sucesso segundo as regras dermatológicas!' 
                : 'Routine successfully optimized according to dermatological rules!'
          );
        }
      } else {
        Alert.alert('Erro', res.error || 'Erro ao gerar rotina');
      }
    } catch (e) {
      Alert.alert('Erro', 'Erro de conexão.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FAF9F6]">
        <ActivityIndicator size="large" color="#8F9779" />
      </View>
    );
  }

  // Filtrar produtos no armário que ainda não estão nessa rotina
  const availableProducts = cabinet.filter(p => !steps.some(s => s.user_product_id === p.id));

  return (
    <View className="flex-1 bg-[#FAF9F6] pt-12">
      {/* Header */}
      <View className="px-6 py-4 flex-row justify-between items-center border-b border-[#F2F0EB]">
        <Text className="text-2xl font-serif text-[#2C2C2E] font-bold">
          {t('routine.tab_title')}
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleGenerateWithAI}
          disabled={generating}
          className="bg-[#8F9779] px-4 py-2 rounded-full flex-row items-center space-x-1.5 shadow-sm"
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
          className={`flex-1 py-3 items-center rounded-2xl mr-2 ${activeTab === 'AM' ? 'bg-[#8F9779]/15 border border-[#8F9779]/30' : 'bg-white border border-[#E5E5EA]'}`}
        >
          <Text className={`font-sans text-sm font-bold ${activeTab === 'AM' ? 'text-[#8F9779]' : 'text-[#8E8E93]'}`}>
            {t('routine.am_label')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('PM')}
          className={`flex-1 py-3 items-center rounded-2xl ${activeTab === 'PM' ? 'bg-[#8F9779]/15 border border-[#8F9779]/30' : 'bg-white border border-[#E5E5EA]'}`}
        >
          <Text className={`font-sans text-sm font-bold ${activeTab === 'PM' ? 'text-[#8F9779]' : 'text-[#8E8E93]'}`}>
            {t('routine.pm_label')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6">
        
        {/* COMPATIBILITY STATUS BANNER */}
        {steps.length > 1 && (
          <View className={`p-4 rounded-3xl mb-4 border flex-row items-start ${
            compatStatus === 'red' 
              ? 'bg-[#D97D64]/10 border-[#D97D64]/30' 
              : compatStatus === 'yellow' 
                ? 'bg-[#F5C75D]/10 border-[#F5C75D]/30' 
                : 'bg-[#8F9779]/10 border-[#8F9779]/30'
          }`}>
            <View className="mr-3 mt-0.5">
              {compatStatus === 'red' ? (
                <AlertCircle size={20} color="#D97D64" />
              ) : compatStatus === 'yellow' ? (
                <AlertTriangle size={20} color="#F5C75D" />
              ) : (
                <CheckCircle size={20} color="#8F9779" />
              )}
            </View>
            <View className="flex-1">
              <Text className={`font-serif text-sm font-bold ${
                compatStatus === 'red' ? 'text-[#D97D64]' : compatStatus === 'yellow' ? 'text-[#D09A0A]' : 'text-[#8F9779]'
              }`}>
                {compatStatus === 'red' ? t('compat.danger') : compatStatus === 'yellow' ? t('compat.caution') : t('compat.safe')}
              </Text>
              <Text className="font-sans text-xs text-[#2C2C2E] mt-1 leading-relaxed">
                {compatStatus === 'green' ? t('compat.safe_desc') : (
                  language === 'pt' ? `${compatConflicts.length} conflito(s) de ingrediente ativo detectados nesta rotina.` :
                  language === 'en' ? `${compatConflicts.length} active ingredient conflict(s) detected in this routine.` :
                  `${compatConflicts.length} conflitto(i) di principi attivi rilevati in questa rotina.`
                )}
              </Text>
              
              {/* Explicações adicionais do conflito */}
              {compatConflicts.length > 0 && (
                <View className="mt-3 pt-2 border-t border-black/5 space-y-2">
                  {compatConflicts.map((c, i) => (
                    <Text key={i} className="font-sans text-[11px] text-[#2C2C2E] leading-relaxed">
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

        <Text className="font-sans text-xs text-[#8E8E93] mb-4">
          {t('routine.order_hint')}
        </Text>

        {/* List of steps */}
        {steps.length === 0 ? (
          <View className="bg-white p-8 rounded-3xl border border-[#F2F0EB] items-center justify-center my-6">
            <Text className="font-sans text-sm text-[#8E8E93] text-center leading-relaxed mb-6">
              Non ci sono passaggi configurati per questa rotina. Aggiungi i prodotti dal tuo armadietto o genera con la nostra IA.
            </Text>
            <TouchableOpacity
              onPress={() => setIsAddModalOpen(true)}
              className="px-6 py-3 bg-[#8F9779] rounded-full flex-row items-center space-x-2 shadow-sm"
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
                className="bg-white p-4 border border-[#F2F0EB] rounded-3xl flex-row items-center justify-between shadow-sm"
              >
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center space-x-2">
                    <View className="w-5 h-5 bg-[#F2F0EB] rounded-full items-center justify-center">
                      <Text className="text-[10px] font-sans font-bold text-[#8E8E93]">{index + 1}</Text>
                    </View>
                    <Text className="font-sans text-sm font-bold text-[#2C2C2E]">
                      {step.product?.custom_name || 'Prodotto'}
                    </Text>
                  </View>
                  <Text className="font-sans text-xs text-[#8E8E93] mt-0.5 ml-7">
                    {step.product?.custom_brand || 'Marca'} • <Text className="capitalize">{step.product?.custom_category}</Text>
                  </Text>
                  {step.product?.custom_active_ingredients.length ? (
                    <Text className="font-sans text-[11px] text-[#D97D64] mt-1 ml-7">
                      ✨ {step.product.custom_active_ingredients.join(', ')}
                    </Text>
                  ) : null}
                  {step.notes ? (
                    <Text className="font-sans text-xs text-[#8F9779] mt-1 ml-7 italic">
                      {step.notes}
                    </Text>
                  ) : null}
                </View>

                {/* Controles de reordenação e deleção */}
                <View className="flex-row items-center space-x-1">
                  <TouchableOpacity
                    onPress={() => moveUp(index)}
                    disabled={index === 0}
                    className={`p-2 rounded-xl bg-[#F2F0EB] ${index === 0 ? 'opacity-40' : ''}`}
                    accessibilityLabel="Sposta in alto"
                  >
                    <ArrowUp size={14} color="#8E8E93" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveDown(index)}
                    disabled={index === steps.length - 1}
                    className={`p-2 rounded-xl bg-[#F2F0EB] ${index === steps.length - 1 ? 'opacity-40' : ''}`}
                    accessibilityLabel="Sposta in basso"
                  >
                    <ArrowDown size={14} color="#8E8E93" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => removeStep(step.id)}
                    className="p-2 rounded-xl bg-[#D97D64]/10"
                    accessibilityLabel="Rimuovi passo"
                  >
                    <Trash2 size={14} color="#D97D64" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity
              onPress={() => setIsAddModalOpen(true)}
              className="w-full py-4 border-2 border-dashed border-[#8F9779]/30 rounded-3xl flex-row items-center justify-center space-x-2 mt-2"
            >
              <Plus size={18} color="#8F9779" />
              <Text className="text-[#8F9779] font-sans text-sm font-bold">{t('routine.add_step')}</Text>
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
              <Text className="text-xl font-serif text-[#2C2C2E] font-bold">
                {t('routine.add_step')}
              </Text>
              <TouchableOpacity
                onPress={() => setIsAddModalOpen(false)}
                className="p-2 bg-[#F2F0EB] rounded-full"
              >
                <X size={16} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {availableProducts.length === 0 ? (
              <View className="py-8 items-center">
                <Text className="font-sans text-sm text-[#8E8E93] text-center leading-relaxed">
                  Tutti i prodotti del tuo armadietto sono già in questa rotina o non hai ancora registrato prodotti.
                </Text>
              </View>
            ) : (
              <ScrollView className="space-y-3">
                {availableProducts.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => addProductToRoutine(p.id)}
                    className="flex-row items-center justify-between p-4 border border-[#F2F0EB] rounded-2xl bg-white active:bg-[#F2F0EB]/50"
                  >
                    <View className="flex-1">
                      <Text className="font-sans text-sm font-bold text-[#2C2C2E]">
                        {p.custom_name}
                      </Text>
                      <Text className="font-sans text-xs text-[#8E8E93]">
                        {p.custom_brand} • <Text className="capitalize">{p.custom_category}</Text>
                      </Text>
                    </View>
                    <Plus size={18} color="#8F9779" />
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
