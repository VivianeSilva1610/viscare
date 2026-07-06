import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LocalizationContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Sparkles, Check, X, ShieldCheck, Lock, CreditCard,
  RefreshCw, BadgeCheck, Zap, Star, Gift
} from 'lucide-react-native';
import {
  getPricingInfo, PricingInfo, PlanType
} from '../services/paymentService';
import { DataService } from '../services/dataService';

export default function PaywallScreen() {
  const { purchasePremium, purchaseTopup, restorePurchases, isPremium, user, refreshProfile } = useAuth();
  const { t, language } = useTranslation();
  const router = useRouter();
  const localParams = useLocalSearchParams();

  const [loadingTopup, setLoadingTopup] = useState<boolean>(false);
  const [loadingMonthly, setLoadingMonthly] = useState<boolean>(false);
  const [restoring, setRestoring] = useState<boolean>(false);
  const [pricing, setPricing] = useState<PricingInfo | null>(null);

  const [showNativeRedirect, setShowNativeRedirect] = useState<boolean>(false);
  const [redirectType, setRedirectType] = useState<'success' | 'canceled' | null>(null);

  useEffect(() => {
    setPricing(getPricingInfo());
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      if (localParams.success === 'true') {
        const plan = (localParams.plan as PlanType) || 'monthly';
        handleWebPurchaseSuccess(plan);
      } else if (localParams.canceled === 'true') {
        Alert.alert(t('common.error'), t('paywall.cancelled'));
      }
      return;
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isSuccess = params.get('success') === 'true';
      const isCanceled = params.get('canceled') === 'true';
      const plan = (params.get('plan') as PlanType) || 'monthly';

      if (isSuccess) {
        if (!user) {
          setShowNativeRedirect(true);
          setRedirectType('success');
        } else {
          handleWebPurchaseSuccess(plan);
        }
      } else if (isCanceled) {
        setShowNativeRedirect(true);
        setRedirectType('canceled');
      }
    }
  }, [user, localParams.success, localParams.canceled]);

  const handleWebPurchaseSuccess = async (plan: PlanType) => {
    if (!user?.id) return;
    const setLoading = plan === 'topup' ? setLoadingTopup : setLoadingMonthly;
    setLoading(true);
    try {
      if (plan === 'topup') {
        await DataService.addTopupCredits(user.id, 2, 3);
        await refreshProfile();
        Alert.alert(
          t('paywall.purchase_topup_title'),
          t('paywall.purchase_topup_msg'),
          [{ text: 'OK', onPress: () => router.replace('/(tabs)/today') }]
        );
      } else {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
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
      }
    } catch {
      Alert.alert(t('common.error'), 'Erro ao ativar. Contacte o suporte.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPremium) router.back();
  }, [isPremium]);

  const handleBuyTopup = async () => {
    setLoadingTopup(true);
    try {
      await purchaseTopup();
      Alert.alert(
        t('paywall.purchase_topup_title'),
        t('paywall.purchase_topup_msg'),
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e: any) {
      if (e?.message !== 'CANCELLED' && e?.message !== 'REDIRECTED') {
        Alert.alert(t('common.error'), t('alert.purchase_error'));
      }
    } finally {
      setLoadingTopup(false);
    }
  };

  const handleSubscribeMonthly = async () => {
    setLoadingMonthly(true);
    try {
      await purchasePremium('monthly');
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
      setLoadingMonthly(false);
    }
  };

  const topupPrice   = pricing?.topup.local   || t('paywall.loading_price');
  const monthlyPrice = pricing?.monthly.local  || t('paywall.loading_price');

  if (showNativeRedirect) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8F4F1', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{
          width: 72, height: 72,
          backgroundColor: redirectType === 'success' ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.1)',
          borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 24,
        }}>
          {redirectType === 'success' ? <Sparkles size={36} color="#4CAF50" /> : <X size={36} color="#F44336" />}
        </View>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#333', textAlign: 'center', marginBottom: 12 }}>
          {redirectType === 'success' ? 'Pagamento Concluído!' : 'Pagamento Cancelado'}
        </Text>
        <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 32, lineHeight: 20 }}>
          {redirectType === 'success'
            ? 'Sua compra foi processada. Clique abaixo para retornar ao aplicativo.'
            : 'O pagamento foi cancelado. Clique abaixo para voltar ao aplicativo.'}
        </Text>
        <TouchableOpacity
          onPress={() => {
            if (redirectType === 'success') {
              router.replace('/(tabs)/today');
            } else {
              router.replace('/paywall');
            }
          }}
          style={{ backgroundColor: redirectType === 'success' ? '#4CAF50' : '#B97C63', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 12 }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
            {redirectType === 'success' ? 'Continuar' : 'Voltar ao Aplicativo'}
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
          style={{ padding: 8, backgroundColor: '#EDE8E4', borderRadius: 999 }}
          accessibilityLabel={t('accessibility.close_paywall')}
        >
          <X size={18} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <View style={{
            width: 64, height: 64, backgroundColor: 'rgba(185,124,99,0.1)',
            borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 14,
          }}>
            <Sparkles size={30} color="#B97C63" />
          </View>
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#B97C63', textAlign: 'center', marginBottom: 6 }}>
            {t('paywall.title')}
          </Text>
          <Text style={{ fontSize: 13, color: '#8C8E78', textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 }}>
            {t('paywall.subtitle')}
          </Text>
          {pricing && pricing.country !== 'BRL' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0EBE7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, marginTop: 10 }}>
              <Zap size={10} color="#B97C63" />
              <Text style={{ fontSize: 10, color: '#B97C63', marginLeft: 4, fontWeight: '600' }}>
                {t('paywall.currency_note')} ({pricing.country})
              </Text>
            </View>
          )}
        </View>

        {/* ── PLANO AVULSO ─────────────────────────────────────────────── */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 24, padding: 20,
          marginBottom: 16, borderWidth: 1.5, borderColor: '#EDE8E4',
          shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
          position: 'relative',
        }}>
          {/* Badge */}
          <View style={{
            position: 'absolute', top: -10, left: 20,
            backgroundColor: '#8C8E78', borderRadius: 999,
            paddingHorizontal: 10, paddingVertical: 3,
          }}>
            <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700', letterSpacing: 0.5 }}>
              {t('paywall.topup_badge')}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Gift size={16} color="#8C8E78" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#3D3D3D' }}>
                  {t('paywall.topup_plan')}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: '#8C8E78', lineHeight: 16 }}>
                {t('paywall.topup_desc')}
              </Text>
            </View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#3D3D3D' }}>
              {topupPrice}
            </Text>
          </View>

          {/* Features */}
          {[t('paywall.feat_scan'), t('paywall.feat_unlimited')].map((feat, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ width: 20, height: 20, borderRadius: 999, backgroundColor: '#F5EDE9', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <Check size={12} color="#B97C63" />
              </View>
              <Text style={{ flex: 1, fontSize: 12, color: '#555', lineHeight: 17 }}>{feat}</Text>
            </View>
          ))}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleBuyTopup}
            disabled={loadingTopup || loadingMonthly}
            style={{
              marginTop: 14, width: '100%', paddingVertical: 14,
              backgroundColor: loadingTopup ? '#C5C5C5' : '#6D6D6D',
              borderRadius: 999, alignItems: 'center', justifyContent: 'center',
              flexDirection: 'row', gap: 8,
            }}
          >
            {loadingTopup
              ? <ActivityIndicator size="small" color="white" />
              : <>
                  <Gift size={16} color="white" />
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                    {t('paywall.topup_btn')} · {topupPrice}
                  </Text>
                </>
            }
          </TouchableOpacity>
        </View>

        {/* ── PLANO MENSAL (destaque) ──────────────────────────────────── */}
        <View style={{
          backgroundColor: 'rgba(185,124,99,0.04)', borderRadius: 24, padding: 20,
          marginBottom: 24, borderWidth: 2, borderColor: '#B97C63',
          shadowColor: '#B97C63', shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
          position: 'relative',
        }}>
          {/* Badge */}
          <View style={{
            position: 'absolute', top: -10, left: 20,
            backgroundColor: '#B97C63', borderRadius: 999,
            paddingHorizontal: 10, paddingVertical: 3,
          }}>
            <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700', letterSpacing: 0.5 }}>
              {t('paywall.monthly_badge')}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Star size={16} color="#B97C63" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#3D3D3D' }}>
                  {t('paywall.monthly_plan')}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: '#8C8E78', lineHeight: 16 }}>
                {t('paywall.monthly_desc')}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#B97C63' }}>
                {monthlyPrice}
              </Text>
              <Text style={{ fontSize: 10, color: '#8C8E78' }}>
                {t('paywall.price_month')}
              </Text>
            </View>
          </View>

          {/* Features */}
          {[
            t('paywall.feat_ai'),
            t('paywall.feat_unlimited'),
            t('paywall.feat_journal'),
          ].map((feat, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ width: 20, height: 20, borderRadius: 999, backgroundColor: '#F5EDE9', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <Check size={12} color="#B97C63" />
              </View>
              <Text style={{ flex: 1, fontSize: 12, color: '#555', lineHeight: 17 }}>{feat}</Text>
            </View>
          ))}

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleSubscribeMonthly}
            disabled={loadingTopup || loadingMonthly}
            style={{
              marginTop: 14, width: '100%', paddingVertical: 15,
              backgroundColor: loadingMonthly ? '#D4A899' : '#B97C63',
              borderRadius: 999, alignItems: 'center', justifyContent: 'center',
              flexDirection: 'row', gap: 8,
              shadowColor: '#B97C63', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
            }}
          >
            {loadingMonthly
              ? <ActivityIndicator size="small" color="white" />
              : <>
                  <ShieldCheck size={16} color="white" />
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                    {t('paywall.monthly_btn')} · {monthlyPrice}{language === 'pt' ? '/mês' : language === 'it' ? '/mese' : '/mo'}
                  </Text>
                </>
            }
          </TouchableOpacity>
        </View>

        {/* Restaurar Compras */}
        <TouchableOpacity
          onPress={async () => {
            setRestoring(true);
            try {
              const ok = await restorePurchases();
              if (ok) {
                Alert.alert(t('paywall.purchase_success_title'), t('paywall.restore_success'), [{ text: 'OK', onPress: () => router.back() }]);
              } else {
                Alert.alert(t('paywall.restore'), t('paywall.restore_no_purchase'));
              }
            } finally {
              setRestoring(false);
            }
          }}
          disabled={restoring || loadingTopup || loadingMonthly}
          style={{ alignItems: 'center', paddingVertical: 8, marginBottom: 20 }}
        >
          {restoring
            ? <ActivityIndicator size="small" color="#B97C63" />
            : <Text style={{ fontSize: 12, color: '#B97C63', fontWeight: '600', textDecorationLine: 'underline' }}>
                {t('paywall.restore')}
              </Text>
          }
        </TouchableOpacity>

        {/* Selos de Segurança */}
        <View style={{
          backgroundColor: '#fff', borderRadius: 20, padding: 16,
          borderWidth: 1, borderColor: '#EDE8E4', marginBottom: 16,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 }}>
            {[
              { icon: <Lock size={18} color="#4CAF50" />, label: t('paywall.ssl_badge'), bg: '#F0F9F0' },
              { icon: <CreditCard size={18} color="#FF9800" />, label: t('paywall.secure_badge'), bg: '#FFF8F0' },
              { icon: <BadgeCheck size={18} color="#3F51B5" />, label: t('paywall.cancel_anytime'), bg: '#F0F4FF' },
            ].map((s, i) => (
              <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: s.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 5 }}>
                  {s.icon}
                </View>
                <Text style={{ fontSize: 9, color: '#3D3D3D', fontWeight: '700', textAlign: 'center' }}>{s.label}</Text>
              </View>
            ))}
          </View>
          <View style={{ backgroundColor: '#F8F9FA', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'flex-start' }}>
            <ShieldCheck size={13} color="#4CAF50" style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 10, color: '#666', marginLeft: 8, lineHeight: 15 }}>
              {t('paywall.store_info')}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: 0.6 }}>
          <RefreshCw size={11} color="#8C8E78" />
          <Text style={{ fontSize: 10, color: '#8C8E78' }}>
            {t('paywall.no_hidden_fees')} · {t('paywall.cancel_anytime')}
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}
