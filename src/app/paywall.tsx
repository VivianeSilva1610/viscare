import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LocalizationContext';
import { useRouter } from 'expo-router';
import { Sparkles, Check, X, ShieldCheck, HeartHandshake } from 'lucide-react-native';

export default function PaywallScreen() {
  const { purchasePremium, isPremium } = useAuth();
  const { t, language } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      // Simulação da compra via RevenueCat
      await purchasePremium(selectedPlan);
      
      Alert.alert(
        t('paywall.purchase_success_title'),
        t('paywall.purchase_success_msg'),
        [
          { 
            text: 'OK', 
            onPress: () => router.back() 
          }
        ]
      );
    } catch (e) {
      Alert.alert(t('common.error'), t('alert.purchase_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = () => {
    Alert.alert(
      t('paywall.restore'),
      t('paywall.restore_no_purchase')
    );
  };

  return (
    <View className="flex-1 bg-brand-ivory">
      {/* Botão de Fechar */}
      <View className="flex-row justify-end p-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 bg-brand-beige rounded-full"
          accessibilityLabel={t('accessibility.close_paywall')}
        >
          <X size={18} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 pb-12">
        <View className="items-center mt-2 mb-6">
          <View className="w-16 h-16 bg-brand-rose-metallic/10 rounded-2xl items-center justify-center mb-4">
            <Sparkles size={36} color="#B97C63" />
          </View>
          <Text className="text-2xl font-serif text-brand-bronze font-bold text-center">
            {t('paywall.title')}
          </Text>
          <Text className="text-sm font-sans text-brand-sage-dark text-center mt-2 px-4 leading-relaxed">
            {t('paywall.subtitle')}
          </Text>
        </View>

        {/* Benefícios */}
        <View className="bg-white p-5 border border-brand-beige rounded-3xl mb-8 space-y-4 shadow-sm">
          <View className="flex-row items-start space-x-3">
            <Check size={18} color="#AEB09B" className="mt-0.5" />
            <Text className="flex-1 font-sans text-xs text-brand-charcoal leading-relaxed">
              {t('paywall.feat_unlimited')}
            </Text>
          </View>

          <View className="flex-row items-start space-x-3">
            <Check size={18} color="#AEB09B" className="mt-0.5" />
            <Text className="flex-1 font-sans text-xs text-brand-charcoal leading-relaxed">
              {t('paywall.feat_ai')}
            </Text>
          </View>

          <View className="flex-row items-start space-x-3">
            <Check size={18} color="#AEB09B" className="mt-0.5" />
            <Text className="flex-1 font-sans text-xs text-brand-charcoal leading-relaxed">
              {t('paywall.feat_journal')}
            </Text>
          </View>
        </View>

        {/* Seleção de Planos */}
        <View className="space-y-3">
          {/* Mensal */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedPlan('monthly')}
            className={`p-5 rounded-3xl border flex-row justify-between items-center ${
              selectedPlan === 'monthly' ? 'bg-brand-rose-light/10 border-brand-rose-metallic' : 'bg-white border-brand-beige'
            }`}
          >
            <View>
              <Text className="font-sans text-sm font-bold text-brand-charcoal">Abbonamento Mensile</Text>
              <Text className="font-sans text-xs text-brand-sage-dark mt-1">7 giorni di prova gratuita, poi annulli quando vuoi</Text>
            </View>
            <Text className="font-serif text-sm font-bold text-brand-charcoal">
              {t('paywall.monthly')}
            </Text>
          </TouchableOpacity>

          {/* Anual */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedPlan('yearly')}
            className={`p-5 rounded-3xl border flex-row justify-between items-center ${
              selectedPlan === 'yearly' ? 'bg-brand-rose-light/10 border-brand-rose-metallic' : 'bg-white border-brand-beige'
            }`}
          >
            <View>
              <View className="flex-row items-center space-x-1.5">
                <Text className="font-sans text-sm font-bold text-brand-charcoal">Abbonamento Annuale</Text>
                <View className="bg-brand-rose-metallic px-2 py-0.5 rounded-full">
                  <Text className="text-[8px] font-sans font-bold text-white uppercase">Salva 37%</Text>
                </View>
              </View>
              <Text className="font-sans text-xs text-brand-sage-dark mt-1">7 giorni di prova gratuita, pagamento annuale unico</Text>
            </View>
            <Text className="font-serif text-sm font-bold text-brand-charcoal">
              {t('paywall.yearly')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Botão de Compra */}
        <View className="mt-8 space-y-3">
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleSubscribe}
            className="w-full py-4 bg-brand-rose-metallic rounded-full items-center flex-row justify-center space-x-2 shadow-md"
          >
            {loading ? <ActivityIndicator size="small" color="white" /> : (
              <>
                <ShieldCheck size={18} color="white" />
                <Text className="text-white font-sans text-base font-bold">
                  {t('paywall.trial')}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Restaurar Compras */}
          <TouchableOpacity
            onPress={handleRestore}
            className="w-full py-3 items-center"
          >
            <Text className="font-sans text-xs font-semibold text-brand-rose-metallic">
              {t('paywall.restore')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Selo de Confiança */}
        <View className="flex-row items-center justify-center space-x-1.5 mt-8 opacity-60">
          <HeartHandshake size={14} color="#8E8E93" />
          <Text className="font-sans text-[10px] text-brand-sage-dark text-center">
            Paga in tutta sicurezza. Cancella la prova in qualsiasi momento.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
