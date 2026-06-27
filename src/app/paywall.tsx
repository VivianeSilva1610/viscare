import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LocalizationContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
  const localParams = useLocalSearchParams();

  const [loading, setLoading] = useState<boolean>(false);
  const [restoring, setRestoring] = useState<boolean>(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('lifetime');
  const [pricing, setPricing] = useState<PricingInfo | null>(null);
  
  // Controle de redirecionamento para o app nativo
  const [showNativeRedirect, setShowNativeRedirect] = useState<boolean>(false);
  const [redirectPlan, setRedirectPlan] = useState<PlanType>('lifetime');
  const [redirectType, setRedirectType] = useState<'success' | 'canceled' | null>(null);

  // Carregar informações de preço na moeda local do dispositivo
  useEffect(() => {
    const info = getPricingInfo();
    setPricing(info);
  }, []);

  // Verificar se retornou de um pagamento bem-sucedido na Web ou Mobile (via deep link)
  useEffect(() => {
    // 1. Tratamento no Mobile (Native Deep Linking)
    if (Platform.OS !== 'web') {
      if (localParams.success === 'true') {
        const plan = (localParams.plan as PlanType) || 'lifetime';
        handleWebPurchaseSuccess(plan);
      } else if (localParams.canceled === 'true') {
        Alert.alert(t('common.error'), 'Pagamento cancelado pelo usuário.');
      }
      return;
    }

    // 2. Tratamento no Web (Browser / In-App Browser)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isSuccess = params.get('success') === 'true';
      const isCanceled = params.get('canceled') === 'true';
      const plan = (params.get('plan') as PlanType) || 'lifetime';

      if (isSuccess) {
        if (!user) {
          // Usuário não está logado na web (ex: abriu o Stripe no WebView/WebBrowser do app móvel)
          // Mostramos a tela de redirecionamento nativo e acionamos o deep link do app
          setShowNativeRedirect(true);
          setRedirectPlan(plan);
          setRedirectType('success');
          
          // Tenta redirecionar automaticamente para o app nativo
          setTimeout(() => {
            window.location.href = `viscare://paywall?success=true&plan=${plan}`;
          }, 1000);
        } else {
          // Usuário logado na web, atualiza o perfil direto no banco
          handleWebPurchaseSuccess(plan);
        }
      } else if (isCanceled) {
        if (!user) {
          setShowNativeRedirect(true);
          setRedirectType('canceled');
          setTimeout(() => {
            window.location.href = `viscare://paywall?canceled=true`;
          }, 1000);
        } else {
          Alert.alert(t('common.error'), 'Pagamento cancelado pelo usuário.');
        }
      }
    }
  }, [user, localParams.success, localParams.canceled]);

  const handleWebPurchaseSuccess = async (plan: PlanType) => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 100);
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

  const lifetimePrice = pricing?.lifetime.local || t('paywall.loading_price');

  if (showNativeRedirect) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8F4F1', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{
          width: 72, height: 72,
          backgroundColor: redirectType === 'success' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
          borderRadius: 20,
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
        }}>
          {redirectType === 'success' ? (
            <Sparkles size={36} color="#4CAF50" />
          ) : (
            <X size={36} color="#F44336" />
          )}
        </View>
        
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#333', textAlign: 'center', marginBottom: 12 }}>
          {redirectType === 'success' ? 'Pagamento Concluído!' : 'Pagamento Cancelado'}
        </Text>
        
        <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 32, lineHeight: 20 }}>
          {redirectType === 'success' 
            ? 'Sua assinatura foi processada com sucesso. Clique no botão abaixo para retornar ao aplicativo e liberar seu acesso Premium.'
            : 'O pagamento foi cancelado. Clique no botão abaixo para voltar ao aplicativo.'}
        </Text>

        <TouchableOpacity
          onPress={() => {
            const url = redirectType === 'success' 
              ? `viscare://paywall?success=true&plan=${redirectPlan}`
              : 'viscare://paywall?canceled=true';
            if (typeof window !== 'undefined') {
              window.location.href = url;
            }
          }}
          style={{
            backgroundColor: redirectType === 'success' ? '#4CAF50' : '#B97C63',
            paddingVertical: 14,
            paddingHorizontal: 28,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
            {redirectType === 'success' ? 'Abrir no Aplicativo' : 'Voltar ao Aplicativo'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

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
          {/* Plano Vitalício */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedPlan('lifetime')}
            style={{
              padding: 18, borderRadius: 20,
              borderWidth: 2,
              borderColor: '#B97C63',
              backgroundColor: 'rgba(185,124,99,0.06)',
              position: 'relative',
            }}
          >
            {/* Badge */}
            <View style={{
              position: 'absolute', top: -10, right: 16,
              backgroundColor: '#B97C63', borderRadius: 999,
              paddingHorizontal: 10, paddingVertical: 3,
            }}>
              <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>
                {t('paywall.lifetime_badge') || 'PAGAMENTO ÚNICO'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#3D3D3D' }}>
                  {t('paywall.lifetime_plan') || 'Acesso Vitalício'}
                </Text>
                <Text style={{ fontSize: 12, color: '#8C8E78', marginTop: 2 }}>
                  {t('paywall.lifetime_desc') || 'Pague uma vez, use para sempre'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#B97C63' }}>
                  {lifetimePrice}
                </Text>
              </View>
            </View>

            <View style={{
              position: 'absolute', top: 16, left: -8,
              width: 16, height: 16, borderRadius: 999,
              backgroundColor: '#B97C63',
              borderWidth: 2, borderColor: '#fff',
            }} />
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
