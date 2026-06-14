import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LocalizationContext';
import { useRouter } from 'expo-router';
import {
  Sparkles, Check, X, ShieldCheck, Lock, CreditCard,
  RefreshCw, BadgeCheck, Zap, Star, Camera
} from 'lucide-react-native';
import {
  getPricingInfo, PricingInfo, PlanType
} from '../services/paymentService';
import { DataService } from '../services/dataService';

export default function PaywallScreen() {
  const { purchasePremium, restorePurchases, isPremium, user, refreshProfile } = useAuth();
  const { t, language } = useTranslation();
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(false);
  const [restoring, setRestoring] = useState<boolean>(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('yearly'); // anual pré-selecionado (melhor valor)
  const [pricing, setPricing] = useState<PricingInfo | null>(null);

  // Carregar informações de preço na moeda local do dispositivo
  useEffect(() => {
    const info = getPricingInfo();
    setPricing(info);
  }, []);

  // Verificar se retornou de um pagamento bem-sucedido na Web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('success') === 'true') {
        const plan = (params.get('plan') as PlanType) || 'yearly';
        handleWebPurchaseSuccess(plan);
      } else if (params.get('canceled') === 'true') {
        Alert.alert(t('common.error'), 'Pagamento cancelado pelo usuário.');
      }
    }
  }, [user]);

  const handleWebPurchaseSuccess = async (plan: PlanType) => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (plan === 'monthly' ? 30 : 365));
      await DataService.updateProfile(user.id, {
        subscription_plan: 'premium',
        subscription_expires_at: expiresAt.toISOString(),
      });
      await refreshProfile();
      Alert.alert(
        t('paywall.purchase_success_title'),
        t('paywall.purchase_success_msg'),
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/today') }]
      );
    } catch (e) {
      Alert.alert(t('common.error'), 'Erro ao ativar sua assinatura.');
    } finally {
      setLoading(false);
    }
  };

  // Se já for premium, fecha
  useEffect(() => {
    if (isPremium) {
      router.back();
    }
  }, [isPremium]);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      await purchasePremium(selectedPlan);
      Alert.alert(
        t('paywall.purchase_success_title'),
        t('paywall.purchase_success_msg'),
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e: any) {
      if (e?.message !== 'CANCELLED' && e?.message !== 'REDIRECTED') {
        Alert.alert(t('common.error'), t('alert.purchase_error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const restored = await restorePurchases();
      if (restored) {
        Alert.alert(
          t('paywall.purchase_success_title'),
          t('paywall.restore_success'),
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert(t('paywall.restore'), t('paywall.restore_no_purchase'));
      }
    } finally {
      setRestoring(false);
    }
  };

  const formatPrice = (template: string, price: string) =>
    template.replace('{price}', price);

  const monthlyPrice = pricing?.monthly.local || t('paywall.loading_price');
  const yearlyPrice = pricing?.yearly.local || t('paywall.loading_price');
  const yearlyMonthEquiv = pricing
    ? (() => {
        const v = convertAndFormatMonthEquiv(pricing);
        return t('paywall.per_month_equivalent').replace('{price}', v);
      })()
    : '';

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F4F1' }}>
      {/* Botão Fechar */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 16, paddingTop: 56 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            padding: 8, backgroundColor: '#EDE8E4',
            borderRadius: 999,
          }}
          accessibilityLabel={t('accessibility.close_paywall')}
        >
          <X size={18} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <View style={{
            width: 72, height: 72,
            backgroundColor: 'rgba(185,124,99,0.1)',
            borderRadius: 20,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
          }}>
            <Sparkles size={36} color="#B97C63" />
          </View>
          <Text style={{
            fontSize: 26, fontWeight: '700',
            color: '#B97C63', textAlign: 'center',
            marginBottom: 8, letterSpacing: -0.5,
          }}>
            {t('paywall.title')}
          </Text>
          <Text style={{
            fontSize: 14, color: '#8C8E78',
            textAlign: 'center', lineHeight: 20, paddingHorizontal: 16,
          }}>
            {t('paywall.subtitle')}
          </Text>

          {/* Badge da moeda local */}
          {pricing && pricing.country !== 'BRL' && (
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: '#F0EBE7', borderRadius: 999,
              paddingHorizontal: 12, paddingVertical: 4, marginTop: 12,
            }}>
              <Zap size={11} color="#B97C63" />
              <Text style={{ fontSize: 11, color: '#B97C63', marginLeft: 4, fontWeight: '600' }}>
                {t('paywall.currency_note')} ({pricing.country})
              </Text>
            </View>
          )}
        </View>

        {/* Benefícios */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 24, padding: 20,
          marginBottom: 20, borderWidth: 1, borderColor: '#EDE8E4',
          shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
        }}>
          {[
            { icon: <Check size={16} color="#B97C63" />, text: t('paywall.feat_unlimited') },
            { icon: <Camera size={16} color="#B97C63" />, text: t('paywall.feat_ai') },
            { icon: <Star size={16} color="#B97C63" />, text: t('paywall.feat_journal') },
            { icon: <Zap size={16} color="#B97C63" />, text: t('paywall.feat_scan') },
          ].map((item, i) => (
            <View key={i} style={{
              flexDirection: 'row', alignItems: 'flex-start',
              marginBottom: i < 3 ? 14 : 0,
            }}>
              <View style={{
                width: 28, height: 28, borderRadius: 999,
                backgroundColor: '#F5EDE9',
                alignItems: 'center', justifyContent: 'center',
                marginRight: 12, marginTop: 1,
              }}>
                {item.icon}
              </View>
              <Text style={{
                flex: 1, fontSize: 13, color: '#3D3D3D', lineHeight: 19,
              }}>
                {item.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Seleção de Planos */}
        <View style={{ gap: 12, marginBottom: 24 }}>

          {/* Plano Anual (destacado como melhor valor) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedPlan('yearly')}
            style={{
              padding: 18, borderRadius: 20,
              borderWidth: 2,
              borderColor: selectedPlan === 'yearly' ? '#B97C63' : '#EDE8E4',
              backgroundColor: selectedPlan === 'yearly' ? 'rgba(185,124,99,0.06)' : '#fff',
              position: 'relative',
            }}
          >
            {/* Badge Melhor Valor */}
            <View style={{
              position: 'absolute', top: -10, right: 16,
              backgroundColor: '#B97C63', borderRadius: 999,
              paddingHorizontal: 10, paddingVertical: 3,
            }}>
              <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>
                {t('paywall.save_percent')}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#3D3D3D' }}>
                  {t('paywall.yearly_plan')}
                </Text>
                <Text style={{ fontSize: 12, color: '#8C8E78', marginTop: 2 }}>
                  {t('paywall.yearly_desc')}
                </Text>
                {yearlyMonthEquiv ? (
                  <Text style={{ fontSize: 11, color: '#B97C63', marginTop: 4, fontWeight: '600' }}>
                    {yearlyMonthEquiv}
                  </Text>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#B97C63' }}>
                  {yearlyPrice}
                </Text>
                <Text style={{ fontSize: 10, color: '#8C8E78' }}>
                  {t('paywall.price_year')}
                </Text>
              </View>
            </View>

            {selectedPlan === 'yearly' && (
              <View style={{
                position: 'absolute', top: 16, left: -8,
                width: 16, height: 16, borderRadius: 999,
                backgroundColor: '#B97C63',
                borderWidth: 2, borderColor: '#fff',
              }} />
            )}
          </TouchableOpacity>

          {/* Plano Mensal */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedPlan('monthly')}
            style={{
              padding: 18, borderRadius: 20,
              borderWidth: 2,
              borderColor: selectedPlan === 'monthly' ? '#B97C63' : '#EDE8E4',
              backgroundColor: selectedPlan === 'monthly' ? 'rgba(185,124,99,0.06)' : '#fff',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#3D3D3D' }}>
                  {t('paywall.monthly_plan')}
                </Text>
                <Text style={{ fontSize: 12, color: '#8C8E78', marginTop: 2 }}>
                  {t('paywall.monthly_desc')}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#3D3D3D' }}>
                  {monthlyPrice}
                </Text>
                <Text style={{ fontSize: 10, color: '#8C8E78' }}>
                  {t('paywall.price_month')}
                </Text>
              </View>
            </View>

            {selectedPlan === 'monthly' && (
              <View style={{
                position: 'absolute', top: 16, left: -8,
                width: 16, height: 16, borderRadius: 999,
                backgroundColor: '#B97C63',
                borderWidth: 2, borderColor: '#fff',
              }} />
            )}
          </TouchableOpacity>
        </View>

        {/* Botão Principal de Compra */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleSubscribe}
          disabled={loading || restoring}
          style={{
            width: '100%', paddingVertical: 17,
            backgroundColor: loading ? '#D4A899' : '#B97C63',
            borderRadius: 999,
            alignItems: 'center', justifyContent: 'center',
            flexDirection: 'row', gap: 8,
            shadowColor: '#B97C63', shadowOpacity: 0.35,
            shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
            elevation: 6,
            marginBottom: 12,
          }}
        >
          {loading
            ? <ActivityIndicator size="small" color="white" />
            : (
              <>
                <ShieldCheck size={18} color="white" />
                <Text style={{
                  color: '#fff', fontSize: 15,
                  fontWeight: '700', letterSpacing: 0.3,
                }}>
                  {t('paywall.trial')}
                </Text>
              </>
            )
          }
        </TouchableOpacity>

        {/* Restaurar Compras */}
        <TouchableOpacity
          onPress={handleRestore}
          disabled={restoring || loading}
          style={{ alignItems: 'center', paddingVertical: 10, marginBottom: 20 }}
        >
          {restoring
            ? <ActivityIndicator size="small" color="#B97C63" />
            : (
              <Text style={{
                fontSize: 13, color: '#B97C63',
                fontWeight: '600', textDecorationLine: 'underline',
              }}>
                {t('paywall.restore')}
              </Text>
            )
          }
        </TouchableOpacity>

        {/* ── Selos de Segurança ─────────────────────────────────────────────── */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 20, padding: 16,
          borderWidth: 1, borderColor: '#EDE8E4', marginBottom: 16,
        }}>
          <View style={{
            flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12,
          }}>
            {/* SSL */}
            <View style={{ alignItems: 'center', flex: 1 }}>
              <View style={{
                width: 40, height: 40, borderRadius: 12,
                backgroundColor: '#F0F9F0',
                alignItems: 'center', justifyContent: 'center', marginBottom: 6,
              }}>
                <Lock size={20} color="#4CAF50" />
              </View>
              <Text style={{ fontSize: 10, color: '#3D3D3D', fontWeight: '700', textAlign: 'center' }}>
                {t('paywall.ssl_badge')}
              </Text>
            </View>

            {/* Pagamento Seguro */}
            <View style={{ alignItems: 'center', flex: 1 }}>
              <View style={{
                width: 40, height: 40, borderRadius: 12,
                backgroundColor: '#FFF8F0',
                alignItems: 'center', justifyContent: 'center', marginBottom: 6,
              }}>
                <CreditCard size={20} color="#FF9800" />
              </View>
              <Text style={{ fontSize: 10, color: '#3D3D3D', fontWeight: '700', textAlign: 'center' }}>
                {t('paywall.secure_badge')}
              </Text>
            </View>

            {/* Cancele Quando Quiser */}
            <View style={{ alignItems: 'center', flex: 1 }}>
              <View style={{
                width: 40, height: 40, borderRadius: 12,
                backgroundColor: '#F0F4FF',
                alignItems: 'center', justifyContent: 'center', marginBottom: 6,
              }}>
                <BadgeCheck size={20} color="#3F51B5" />
              </View>
              <Text style={{ fontSize: 10, color: '#3D3D3D', fontWeight: '700', textAlign: 'center' }}>
                {t('paywall.cancel_anytime')}
              </Text>
            </View>
          </View>

          {/* Nota sobre proteção do cartão */}
          <View style={{
            backgroundColor: '#F8F9FA', borderRadius: 12,
            padding: 12, flexDirection: 'row', alignItems: 'flex-start',
          }}>
            <ShieldCheck size={14} color="#4CAF50" style={{ marginTop: 1 }} />
            <Text style={{
              flex: 1, fontSize: 11, color: '#666',
              marginLeft: 8, lineHeight: 16,
            }}>
              {t('paywall.store_info')}
            </Text>
          </View>
        </View>

        {/* Sem taxas ocultas */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          justifyContent: 'center', gap: 6, opacity: 0.65,
        }}>
          <RefreshCw size={12} color="#8C8E78" />
          <Text style={{ fontSize: 11, color: '#8C8E78' }}>
            {t('paywall.no_hidden_fees')} · {t('paywall.cancel_anytime')}
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

// Calcula o equivalente mensal do plano anual para comparação
function convertAndFormatMonthEquiv(pricing: PricingInfo): string {
  if (!pricing) return '';
  const rateInfo = getExchangeRateInfo(pricing.yearly.currency);
  const monthly = pricing.yearly.brl / 12; // mensal em BRL
  const converted = monthly * rateInfo.rate;
  const rounded = rateInfo.decimals === 0
    ? Math.round(converted)
    : Math.round(converted * 100) / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: pricing.yearly.currency,
      minimumFractionDigits: rateInfo.decimals,
      maximumFractionDigits: rateInfo.decimals,
    }).format(rounded);
  } catch {
    return `${rateInfo.symbol}${rounded.toFixed(rateInfo.decimals)}`;
  }
}

function getExchangeRateInfo(currency: string): { rate: number; symbol: string; decimals: number } {
  const table: Record<string, { rate: number; symbol: string; decimals: number }> = {
    'EUR': { rate: 0.17, symbol: '€', decimals: 2 },
    'USD': { rate: 0.18, symbol: '$', decimals: 2 },
    'GBP': { rate: 0.15, symbol: '£', decimals: 2 },
    'JPY': { rate: 27.5, symbol: '¥', decimals: 0 },
    'BRL': { rate: 1.0,  symbol: 'R$', decimals: 2 },
    'CHF': { rate: 0.16, symbol: 'Fr', decimals: 2 },
    'AUD': { rate: 0.28, symbol: 'A$', decimals: 2 },
    'CAD': { rate: 0.25, symbol: 'C$', decimals: 2 },
  };
  return table[currency] || table['BRL'];
}
