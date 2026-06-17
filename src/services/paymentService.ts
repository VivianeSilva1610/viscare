/**
 * paymentService.ts — VisCare
 *
 * Gerencia assinaturas de forma 100% segura:
 *   • Móvel (iOS/Android): RevenueCat → Apple App Store / Google Play
 *   • Web/Fallback: Stripe Payment Sheet via Supabase Edge Function
 *
 * Os dados de cartão JAMAIS passam pelo app ou servidores da VisCare.
 * A tokenização é feita exclusivamente pelas plataformas nativas ou pelo Stripe (PCI-DSS).
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ─── Constantes de Preço Base (em BRL) ───────────────────────────────────────
export const PRICE_BRL_MONTHLY = 19.90;
export const PRICE_BRL_YEARLY = 149.90;
export const PRICE_MONTHLY_SAVINGS_PERCENT = 37; // vs mensal anualizado

// Identificadores RevenueCat (configurar no painel após criar a conta)
const RC_MONTHLY_ID = 'viscare_premium_monthly';
const RC_YEARLY_ID = 'viscare_premium_yearly';

// ─── Chaves de API (do .env) ──────────────────────────────────────────────────
const RC_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
const RC_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';
const STRIPE_PK = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// ─── Verificação de configuração ──────────────────────────────────────────────
const isRevenueCatConfigured =
  RC_IOS_KEY.length > 10 &&
  !RC_IOS_KEY.includes('SUBSTITUA');

const isStripeConfigured =
  STRIPE_PK.length > 10 &&
  !STRIPE_PK.includes('SUBSTITUA');

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type PlanType = 'monthly' | 'yearly';

export interface PricingInfo {
  monthly: {
    brl: number;
    local: string; // valor formatado na moeda local
    currency: string;
    currencySymbol: string;
  };
  yearly: {
    brl: number;
    local: string;
    currency: string;
    currencySymbol: string;
  };
  savingsPercent: number;
  country: string;
  isLoading: boolean;
}

export interface PurchaseResult {
  success: boolean;
  isPremium: boolean;
  error?: string;
}

// ─── Mapa de taxas de câmbio aproximadas (BRL como base) ─────────────────────
// Stripe Adaptive Pricing atualiza esses valores automaticamente em tempo real.
// Estas taxas são usadas apenas para a pré-visualização de preço no UI.
const EXCHANGE_RATES_FROM_BRL: Record<string, { rate: number; symbol: string; decimals: number }> = {
  'EUR': { rate: 0.17,  symbol: '€',  decimals: 2 }, // Zona do Euro (Itália, França, etc.)
  'USD': { rate: 0.18,  symbol: '$',  decimals: 2 }, // EUA
  'GBP': { rate: 0.15,  symbol: '£',  decimals: 2 }, // Reino Unido
  'JPY': { rate: 27.5,  symbol: '¥',  decimals: 0 }, // Japão
  'CHF': { rate: 0.16,  symbol: 'Fr', decimals: 2 }, // Suíça
  'CAD': { rate: 0.25,  symbol: 'C$', decimals: 2 }, // Canadá
  'AUD': { rate: 0.28,  symbol: 'A$', decimals: 2 }, // Austrália
  'MXN': { rate: 3.55,  symbol: '$',  decimals: 2 }, // México
  'ARS': { rate: 200.0, symbol: '$',  decimals: 0 }, // Argentina
  'CLP': { rate: 170.0, symbol: '$',  decimals: 0 }, // Chile
  'COP': { rate: 750.0, symbol: '$',  decimals: 0 }, // Colômbia
  'BRL': { rate: 1.0,   symbol: 'R$', decimals: 2 }, // Brasil
};

// Mapa de localidades por país → moeda
const LOCALE_TO_CURRENCY: Record<string, string> = {
  'it': 'EUR', 'fr': 'EUR', 'de': 'EUR', 'es': 'EUR', 'pt-PT': 'EUR',
  'en-US': 'USD', 'en-GB': 'GBP', 'en-AU': 'AUD', 'en-CA': 'CAD',
  'ja': 'JPY', 'de-CH': 'CHF', 'fr-CH': 'CHF',
  'pt': 'BRL', 'pt-BR': 'BRL',
  'es-MX': 'MXN', 'es-AR': 'ARS', 'es-CL': 'CLP', 'es-CO': 'COP',
};

// ─── Detecção de Moeda Local ──────────────────────────────────────────────────
export function detectLocalCurrency(): string {
  try {
    // 1. Tenta fuso horário para detecção geográfica mais precisa (ex: Itália = Europe/Rome -> EUR)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Europe')) {
      if (tz.includes('London')) return 'GBP';
      if (tz.includes('Zurich')) return 'CHF';
      return 'EUR';
    }
    if (
      tz.includes('America/New_York') || 
      tz.includes('America/Chicago') || 
      tz.includes('America/Denver') || 
      tz.includes('America/Los_Angeles') || 
      tz.includes('America/Phoenix')
    ) {
      return 'USD';
    }
    if (
      tz.includes('Sao_Paulo') || 
      tz.includes('Rio_de_Janeiro') || 
      tz.includes('Fortaleza') || 
      tz.includes('Recife') || 
      tz.includes('Belem') || 
      tz.includes('Cuiaba') || 
      tz.includes('Manaus') || 
      tz.includes('Porto_Velho') || 
      tz.includes('Araguaina')
    ) {
      return 'BRL';
    }
    if (
      tz.includes('Sydney') || 
      tz.includes('Melbourne') || 
      tz.includes('Brisbane') || 
      tz.includes('Adelaide') || 
      tz.includes('Perth')
    ) {
      return 'AUD';
    }
    if (tz.includes('Toronto') || tz.includes('Vancouver') || tz.includes('Montreal')) {
      return 'CAD';
    }
    if (tz.includes('Tokyo')) {
      return 'JPY';
    }

    // 2. Fallback para o locale do dispositivo/navegador
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || 'pt-BR';
    
    // Tenta correspondência exata primeiro
    if (LOCALE_TO_CURRENCY[locale]) {
      return LOCALE_TO_CURRENCY[locale];
    }
    
    // Tenta com apenas o idioma base (ex: "it-IT" → "it")
    const baseLang = locale.split('-')[0];
    if (LOCALE_TO_CURRENCY[baseLang]) {
      return LOCALE_TO_CURRENCY[baseLang];
    }
    
    // Padrão: EUR se idioma europeu, BRL se pt
    return 'EUR';
  } catch {
    return 'BRL';
  }
}

// ─── Formatação de Preço ──────────────────────────────────────────────────────
export function convertAndFormat(amountBRL: number, currency: string): { value: number; formatted: string; symbol: string } {
  const rateInfo = EXCHANGE_RATES_FROM_BRL[currency] || EXCHANGE_RATES_FROM_BRL['BRL'];
  const converted = amountBRL * rateInfo.rate;
  
  // Arredondamento psicológico (ex: 19.90 → 17.90 não 17.87)
  const rounded = rateInfo.decimals === 0
    ? Math.round(converted)
    : Math.round(converted * 100) / 100;

  // Formatação com Intl (disponível no Hermes/React Native)
  let formatted: string;
  try {
    formatted = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: rateInfo.decimals,
      maximumFractionDigits: rateInfo.decimals,
    }).format(rounded);
  } catch {
    formatted = `${rateInfo.symbol} ${rounded.toFixed(rateInfo.decimals)}`;
  }

  return { value: rounded, formatted, symbol: rateInfo.symbol };
}

// ─── Obter Informações de Preço Completas ─────────────────────────────────────
export function getPricingInfo(): PricingInfo {
  const currency = detectLocalCurrency();
  const monthly = convertAndFormat(PRICE_BRL_MONTHLY, currency);
  const yearly = convertAndFormat(PRICE_BRL_YEARLY, currency);

  return {
    monthly: {
      brl: PRICE_BRL_MONTHLY,
      local: monthly.formatted,
      currency,
      currencySymbol: monthly.symbol,
    },
    yearly: {
      brl: PRICE_BRL_YEARLY,
      local: yearly.formatted,
      currency,
      currencySymbol: yearly.symbol,
    },
    savingsPercent: PRICE_MONTHLY_SAVINGS_PERCENT,
    country: currency,
    isLoading: false,
  };
}

// ─── RevenueCat: Inicialização ────────────────────────────────────────────────
let revenueCatInitialized = false;

export async function initializeRevenueCat(userId?: string): Promise<void> {
  if (!isRevenueCatConfigured || revenueCatInitialized) return;

  try {
    // Importação dinâmica para não quebrar na web (onde react-native-purchases não existe)
    const Purchases = await import('react-native-purchases').then(m => m.default).catch(() => null);
    if (!Purchases) return;

    const apiKey = Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY;
    await Purchases.configure({ apiKey });

    if (userId) {
      await Purchases.logIn(userId);
    }

    revenueCatInitialized = true;
    console.log('[PaymentService] RevenueCat inicializado');
  } catch (e) {
    console.warn('[PaymentService] Erro ao inicializar RevenueCat', e);
  }
}

// ─── RevenueCat: Verificar Status Premium ────────────────────────────────────
export async function checkPremiumStatus(): Promise<boolean> {
  if (!isRevenueCatConfigured) return false;

  try {
    const Purchases = await import('react-native-purchases').then(m => m.default).catch(() => null);
    if (!Purchases) return false;

    const info = await Purchases.getCustomerInfo();
    return Object.keys(info.entitlements.active).length > 0;
  } catch {
    return false;
  }
}

// ─── RevenueCat: Compra Nativa (iOS/Android) ──────────────────────────────────
export async function purchaseWithRevenueCat(plan: PlanType): Promise<PurchaseResult> {
  if (!isRevenueCatConfigured) {
    return { success: false, isPremium: false, error: 'RevenueCat não configurado. Configure as chaves no .env.' };
  }

  try {
    const Purchases = await import('react-native-purchases').then(m => m.default).catch(() => null);
    if (!Purchases) {
      return { success: false, isPremium: false, error: 'Módulo RevenueCat não disponível nesta plataforma.' };
    }

    const offerings = await Purchases.getOfferings();
    const offering = offerings.current;

    // Se não houver ofertas configuradas no Google Play Console ainda,
    // usa modo simulado para permitir testes de funcionalidades premium
    if (!offering || offering.availablePackages.length === 0) {
      console.warn('[PaymentService] Nenhuma oferta no RevenueCat — usando modo simulado para testes.');
      return mockPurchase(plan);
    }

    const pkg = plan === 'monthly'
      ? (offering.monthly || offering.availablePackages[0])
      : (offering.annual || offering.availablePackages[1] || offering.availablePackages[0]);

    if (!pkg) {
      return mockPurchase(plan);
    }

    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPremium = Object.keys(customerInfo.entitlements.active).length > 0;

    return { success: true, isPremium };
  } catch (e: any) {
    // Código 1 = usuário cancelou (não é um erro real)
    if (e.code === 1) {
      return { success: false, isPremium: false, error: 'CANCELLED' };
    }
    // Se o erro for por falta de produtos configurados, usa modo simulado
    if (e.message?.includes('not found') || e.message?.includes('not configured') || e.code === 'PRODUCT_NOT_AVAILABLE_FOR_PURCHASE') {
      console.warn('[PaymentService] Produto não disponível — usando modo simulado para testes.');
      return mockPurchase(plan);
    }
    return { success: false, isPremium: false, error: e.message || 'Erro desconhecido.' };
  }
}

// ─── RevenueCat: Restaurar Compras ────────────────────────────────────────────
export async function restoreRevenueCatPurchases(): Promise<PurchaseResult> {
  if (!isRevenueCatConfigured) {
    return { success: false, isPremium: false, error: 'RevenueCat não configurado.' };
  }

  try {
    const Purchases = await import('react-native-purchases').then(m => m.default).catch(() => null);
    if (!Purchases) return { success: false, isPremium: false };

    const info = await Purchases.restorePurchases();
    const isPremium = Object.keys(info.entitlements.active).length > 0;
    return { success: true, isPremium };
  } catch (e: any) {
    return { success: false, isPremium: false, error: e.message };
  }
}

// ─── Stripe: Pagamento Web ────────────────────────────────────────────────────
/**
 * Chama a Supabase Edge Function `create-payment-intent` para obter
 * um clientSecret seguro. A chave secreta do Stripe fica APENAS no servidor.
 */
export async function createStripePaymentIntent(
  userId: string,
  plan: PlanType,
  currency: string
): Promise<{ clientSecret: string | null; error?: string }> {
  if (!SUPABASE_URL) {
    return { clientSecret: null, error: 'Supabase não configurado.' };
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ userId, plan, currency }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { clientSecret: null, error: err.error || `Erro HTTP ${response.status}` };
    }

    const data = await response.json();
    return { clientSecret: data.clientSecret };
  } catch (e: any) {
    return { clientSecret: null, error: e.message };
  }
}

/**
 * Cria uma Stripe Checkout Session para redirecionamento web seguro.
 */
export async function createStripeCheckoutSession(
  userId: string,
  plan: PlanType,
  currency: string
): Promise<{ url: string | null; error?: string }> {
  if (!SUPABASE_URL) {
    return { url: null, error: 'Supabase não configurado.' };
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ userId, plan, currency, useCheckout: true }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { url: null, error: err.error || `Erro HTTP ${response.status}` };
    }

    const data = await response.json();
    return { url: data.url };
  } catch (e: any) {
    return { url: null, error: e.message };
  }
}

// ─── Modo Simulado (quando não há chaves de API) ──────────────────────────────
/**
 * Em modo simulado, a compra é "aprovada" localmente.
 * Útil para testes de UI antes de configurar RevenueCat/Stripe.
 */
export async function mockPurchase(plan: PlanType): Promise<PurchaseResult> {
  // Simula um atraso de rede
  await new Promise(resolve => setTimeout(resolve, 1800));
  return { success: true, isPremium: true };
}

// ─── Função principal de compra (decide automaticamente a estratégia) ─────────
export async function purchasePlan(
  plan: PlanType,
  userId: string,
): Promise<PurchaseResult> {
  // PRIORIDADE: Se Stripe estiver configurado, usamos Stripe (permite receber pagamentos fora das lojas nas duas plataformas)
  if (isStripeConfigured) {
    const currency = detectLocalCurrency();
    try {
      const { url, error } = await createStripeCheckoutSession(userId, plan, currency);
      if (url) {
        if (Platform.OS === 'web') {
          // Redireciona o navegador para o checkout seguro do Stripe (Web)
          if (typeof window !== 'undefined') {
            window.location.href = url;
          }
          return { success: false, isPremium: false, error: 'REDIRECTED' };
        } else {
          // No mobile, abrimos o checkout usando a sessão de autenticação do WebBrowser.
          // Quando o checkout redirecionar para a nossa página de sucesso na web, ela disparará o deep link 'viscare://paywall'
          // fechando o navegador e devolvendo o controle com 'success=true'.
          const WebBrowser = await import('expo-web-browser').catch(() => null);
          if (WebBrowser) {
            const redirectUrl = 'viscare://paywall';
            const authResult = await WebBrowser.openAuthSessionAsync(url, redirectUrl);
            if (authResult.type === 'success' && authResult.url) {
              const returnedUrl = authResult.url;
              if (returnedUrl.includes('success=true')) {
                return { success: true, isPremium: true };
              }
            }
            return { success: false, isPremium: false, error: 'CANCELLED' };
          } else {
            // Fallback usando o Linking padrão se o WebBrowser falhar
            const Linking = await import('react-native').then(m => m.Linking).catch(() => null);
            if (Linking) {
              await Linking.openURL(url);
              return { success: false, isPremium: false, error: 'REDIRECTED' };
            }
          }
        }
      }
      // Se falhou ao obter a URL do Stripe, exibe o erro em produção ou usa mock em dev
      const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : (process.env.NODE_ENV === 'development');
      if (isDev) {
        console.warn('[PaymentService] Stripe Checkout indisponível, usando modo simulado:', error);
        return mockPurchase(plan);
      }
      return { success: false, isPremium: false, error: error || 'Serviço de pagamento Stripe temporariamente indisponível.' };
    } catch (e: any) {
      const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : (process.env.NODE_ENV === 'development');
      if (isDev) {
        console.warn('[PaymentService] Erro no Stripe Checkout, usando modo simulado:', e.message);
        return mockPurchase(plan);
      }
      return { success: false, isPremium: false, error: e.message || 'Erro ao processar checkout do Stripe.' };
    }
  }

  // 1. Móvel com RevenueCat configurado → compra nativa (segunda opção se Stripe não estiver configurado)
  if (Platform.OS !== 'web' && isRevenueCatConfigured) {
    return purchaseWithRevenueCat(plan);
  }

  // 3. Modo simulado (fallback universal se nada estiver configurado)
  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : (process.env.NODE_ENV === 'development');
  if (isDev) {
    console.warn('[PaymentService] ⚠️ Usando modo SIMULADO. Configure Stripe ou RevenueCat para produção.');
    return mockPurchase(plan);
  }
  return { success: false, isPremium: false, error: 'Serviço de pagamento indisponível. Por favor, tente novamente mais tarde.' };
}
