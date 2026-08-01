import { SkinProfile, Product, MOCK_PRODUCTS } from './mockDb';
import { DataService } from './dataService';
import { Language } from '../context/LocalizationContext';
import { supabase } from './supabase';

export interface ProductRecommendation {
  product: Product;
  reason: {
    it: string;
    en: string;
    pt: string;
  };
  bestTime: {
    it: string;
    en: string;
    pt: string;
  };
}

/**
 * Motor de Recomendação de Produtos baseado no perfil de pele.
 * Mapeia skin_type + goals + concerns → produtos ideais do catálogo.
 */
export class AIRecommendationService {

  /**
   * NOVA FASE 2: Orquestrador Inteligente (Gemini Edge Functions)
   * Chama os 3 agentes em cadeia para montar uma recomendação totalmente personalizada.
   */
  static async getIntelligentRecommendations(userProfile: any, analysis: any, language: string = 'pt') {
    try {
      // 1. Agente Dermatológico
      const { data: dermData, error: dermErr } = await supabase.functions.invoke('agent-dermatologist', {
        body: { analysis, userProfile, language }
      });
      if (dermErr || !dermData) throw new Error(dermErr?.message || 'Erro no Agente Dermatológico');

      // 2. Agente de Rotina
      const { data: routineData, error: routineErr } = await supabase.functions.invoke('agent-routine', {
        body: { 
          recommendedIngredients: dermData.recommended_ingredients, 
          avoidIngredients: dermData.avoid_ingredients,
          userProfile,
          language 
        }
      });
      if (routineErr || !routineData) throw new Error(routineErr?.message || 'Erro no Agente de Rotina');

      // 3. Agente de Produtos
      let catalog = [];
      try { catalog = await DataService.getGlobalProducts(); } catch { catalog = MOCK_PRODUCTS; }

      const { data: prodData, error: prodErr } = await supabase.functions.invoke('agent-products', {
        body: { 
          recommendedIngredients: dermData.recommended_ingredients,
          catalog,
          language 
        }
      });
      if (prodErr || !prodData) throw new Error(prodErr?.message || 'Erro no Agente de Produtos');

      // Formatar produtos retornados
      const recommendations: ProductRecommendation[] = [];
      if (prodData.recommended_products) {
        prodData.recommended_products.forEach((rec: any) => {
          const product = catalog.find(p => p.id === rec.product_id);
          if (product) {
            recommendations.push({
              product,
              reason: { pt: rec.reason, en: rec.reason, it: rec.reason },
              bestTime: { pt: 'Manhã/Noite', en: 'AM/PM', it: 'Mattina/Sera' }
            });
          }
        });
      }

      return {
        dermatologistAdvice: dermData.general_advice,
        routine: routineData, // { am: [], pm: [] }
        products: recommendations
      };
    } catch (err) {
      console.warn('Erro na orquestração de IA:', err);
      // Fallback para a lógica antiga caso a API falhe
      const fallbackRecs = await this.getRecommendations(userProfile as SkinProfile);
      return {
        dermatologistAdvice: 'Baseado no seu perfil, recomendamos focar em hidratação e proteção.',
        routine: null,
        products: fallbackRecs
      };
    }
  }

  static async getRecommendations(skinProfile: SkinProfile): Promise<ProductRecommendation[]> {
    // Buscar catálogo de produtos (do Supabase ou mock)
    let catalog: Product[];
    try {
      catalog = await DataService.getGlobalProducts();
    } catch {
      catalog = MOCK_PRODUCTS;
    }

    const recommendations: ProductRecommendation[] = [];
    const addedProductIds = new Set<string>();
    
    const idToNameMap: Record<string, string> = {
      'p-1': 'Gentle Cleanser',
      'p-2': 'Hydrating Cleanser',
      'p-3': 'BHA Blackhead Power Liquid',
      'p-4': 'Glycolic Acid 7% Toning Solution',
      'p-5': 'Retinol 0.2% in Squalane',
      'p-6': 'Hyaluronic Acid 2% + B5',
      'p-7': 'Vitamin C 15% Super Serum',
      'p-8': 'Natural Moisturizing Factors + HA',
      'p-9': 'Ultra Facial Cream',
      'p-10': 'Anthelios UVMune 400 SPF 50+',
      'p-11': 'Watery Essence SPF 50+',
    };

    const addProduct = (
      productId: string, 
      reason: { it: string; en: string; pt: string },
      bestTime: { it: string; en: string; pt: string }
    ) => {
      if (addedProductIds.has(productId)) return;
      const mappedName = idToNameMap[productId] || productId;
      const product = catalog.find(p => p.id === productId || p.name === mappedName);
      if (product) {
        addedProductIds.add(productId);
        recommendations.push({ product, reason, bestTime });
      }
    };

    // === REGRA 1: LIMPADOR baseado no tipo de pele ===
    if (skinProfile.skin_type === 'oily' || skinProfile.skin_type === 'combination') {
      addProduct('p-1', {
        it: 'Detergente delicato ideale per pelle grassa/mista. Uso suggerito: Mattina e Sera.',
        en: 'Gentle cleanser ideal for oily/combination skin. Suggested use: Morning & Night.',
        pt: 'Limpador suave ideal para pele oleosa/mista. Uso sugerido: Manhã e Noite.'
      }, {
        it: '☀️ Mattina / 🌙 Sera',
        en: '☀️ Morning / 🌙 Night',
        pt: '☀️ Manhã / 🌙 Noite'
      });
    } else {
      // Pele seca ou normal
      addProduct('p-2', {
        it: 'Detergente idratante perfetto per pelle secca/normale. Uso suggerito: Mattina e Sera.',
        en: 'Hydrating cleanser perfect for dry/normal skin. Suggested use: Morning & Night.',
        pt: 'Limpador hidratante perfeito para pele seca/normal. Uso sugerido: Manhã e Noite.'
      }, {
        it: '☀️ Mattina / 🌙 Sera',
        en: '☀️ Morning / 🌙 Night',
        pt: '☀️ Manhã / 🌙 Noite'
      });
    }

    // === REGRA 2: TÔNICO baseado em preocupações ===
    const concernsLower = skinProfile.concerns.map(c => c.toLowerCase());
    const goalsLower = skinProfile.goals.map(g => g.toLowerCase());

    // Se tem poros dilatados, acne ou pele oleosa → BHA
    const needsBHA = skinProfile.skin_type === 'oily' ||
      concernsLower.some(c => c.includes('por') || c.includes('acne') || c.includes('acn'));
    
    if (needsBHA) {
      addProduct('p-3', {
        it: 'Il BHA pulisce i pori in profondità. Uso suggerito: Solo Sera, 2-3 volte a settimana.',
        en: 'BHA deeply cleanses pores. Suggested use: Night only, 2-3 times a week.',
        pt: 'O BHA limpa os poros profundamente. Uso sugerido: Apenas à Noite, 2-3 vezes por semana.'
      }, {
        it: '🌙 Sera',
        en: '🌙 Night',
        pt: '🌙 Noite'
      });
    }

    // Se quer iluminar ou tem manchas → Tônico AHA
    const needsBrightening = concernsLower.some(c => c.includes('manch') || c.includes('spot') || c.includes('macchi')) ||
      goalsLower.some(g => g.includes('illumin') || g.includes('bright') || g.includes('ilumin'));
    
    if (needsBrightening) {
      addProduct('p-4', {
        it: 'L\'acido glicolico schiarisce le macchie. Uso suggerito: Solo Sera, 2-3 volte a settimana.',
        en: 'Glycolic acid fades dark spots. Suggested use: Night only, 2-3 times a week.',
        pt: 'O ácido glicólico clareia manchas. Uso sugerido: Apenas à Noite, 2-3 vezes por semana.'
      }, {
        it: '🌙 Sera',
        en: '🌙 Night',
        pt: '🌙 Noite'
      });
    }

    // === REGRA 3: TRATAMENTO baseado em objetivos ===
    // Anti-aging → Retinol (apenas se não for sensível ou com cuidado)
    const wantsAntiAging = goalsLower.some(g => g.includes('anti') || g.includes('rug') || g.includes('wrink') || g.includes('età'));
    
    if (wantsAntiAging && !skinProfile.is_sensitive) {
      addProduct('p-5', {
        it: 'Il Retinolo combatte le rughe. Uso suggerito: Solo Sera, usare SPF al mattino.',
        en: 'Retinol fights wrinkles. Suggested use: Night only, use SPF in the morning.',
        pt: 'O Retinol combate as rugas. Uso sugerido: Apenas à Noite, use sempre SPF pela manhã.'
      }, {
        it: '🌙 Sera',
        en: '🌙 Night',
        pt: '🌙 Noite'
      });
    }

    // Hidratação → Ácido Hialurônico
    const wantsHydration = goalsLower.some(g => g.includes('idrat') || g.includes('hydrat') || g.includes('hidrat')) ||
      concernsLower.some(c => c.includes('secch') || c.includes('dry') || c.includes('ressec'));
    
    if (wantsHydration || skinProfile.skin_type === 'dry') {
      addProduct('p-6', {
        it: 'L\'Acido Ialuronico dona un\'idratazione profonda. Uso suggerito: Mattina e Sera su pelle umida.',
        en: 'Hyaluronic Acid provides deep hydration. Suggested use: Morning & Night on damp skin.',
        pt: 'O Ácido Hialurônico proporciona hidratação profunda. Uso sugerido: Manhã e Noite na pele úmida.'
      }, {
        it: '☀️ Mattina / 🌙 Sera',
        en: '☀️ Morning / 🌙 Night',
        pt: '☀️ Manhã / 🌙 Noite'
      });
    }

    // Iluminar / Manchas → Vitamina C
    if (needsBrightening || wantsAntiAging) {
      addProduct('p-7', {
        it: 'La Vitamina C illumina e protegge. Uso suggerito: Mattina, prima della crema solare.',
        en: 'Vitamin C brightens and protects. Suggested use: Morning, before sunscreen.',
        pt: 'A Vitamina C ilumina e protege. Uso sugerido: Manhã, antes do protetor solar.'
      }, {
        it: '☀️ Mattina',
        en: '☀️ Morning',
        pt: '☀️ Manhã'
      });
    }

    // Barreira → Niacinamide (se sensível ou barreira)
    const wantsBarrier = goalsLower.some(g => g.includes('barri') || g.includes('barrier'));
    if (skinProfile.is_sensitive || wantsBarrier) {
      // Niacinamide está no cleanser p-2, mas podemos recomendar o ácido hialurônico para hidratar
      addProduct('p-6', {
        it: 'L\'Acido Ialuronico rinforza la barriera. Uso suggerito: Mattina e Sera.',
        en: 'Hyaluronic Acid strengthens the barrier. Suggested use: Morning & Night.',
        pt: 'O Ácido Hialurônico fortalece a barreira. Uso suggerido: Manhã e Noite.'
      }, {
        it: '☀️ Mattina / 🌙 Sera',
        en: '☀️ Morning / 🌙 Night',
        pt: '☀️ Manhã / 🌙 Noite'
      });
    }

    // === REGRA 4: HIDRATANTE ===
    if (skinProfile.skin_type === 'dry' || skinProfile.age > 35) {
      addProduct('p-9', {
        it: 'Crema ricca per pelle nutrita. Uso suggerito: Mattina e Sera.',
        en: 'Rich cream for nourished skin. Suggested use: Morning & Night.',
        pt: 'Creme rico para nutrir a pele. Uso sugerido: Manhã e Noite.'
      }, {
        it: '☀️ Mattina / 🌙 Sera',
        en: '☀️ Morning / 🌙 Night',
        pt: '☀️ Manhã / 🌙 Noite'
      });
    } else {
      addProduct('p-8', {
        it: 'Idratante leggero. Uso suggerito: Mattina e Sera.',
        en: 'Lightweight moisturizer. Suggested use: Morning & Night.',
        pt: 'Hidratante leve. Uso suggerido: Manhã e Noite.'
      }, {
        it: '☀️ Mattina / 🌙 Sera',
        en: '☀️ Morning / 🌙 Night',
        pt: '☀️ Manhã / 🌙 Noite'
      });
    }

    // === REGRA 5: SPF OBRIGATÓRIO ===
    if (skinProfile.skin_type === 'oily') {
      addProduct('p-11', {
        it: 'Protezione solare leggera per pelle grassa. Uso suggerito: Mattina, riapplicare ogni 2 ore.',
        en: 'Light sunscreen for oily skin. Suggested use: Morning, reapply every 2 hours.',
        pt: 'Protetor solar leve para pele oleosa. Uso suggerido: Manhã, reaplicar a cada 2 horas.'
      }, {
        it: '☀️ Mattina / 🌤️ Pomeriggio',
        en: '☀️ Morning / 🌤️ Afternoon',
        pt: '☀️ Manhã / 🌤️ Tarde'
      });
    } else {
      addProduct('p-10', {
        it: 'Protezione solare SPF 50+. Uso suggerito: Mattina, riapplicare ogni 2 ore.',
        en: 'SPF 50+ Sunscreen. Suggested use: Morning, reapply every 2 hours.',
        pt: 'Protetor solar FPS 50+. Uso sugerido: Manhã, reaplicar a cada 2 horas.'
      }, {
        it: '☀️ Mattina / 🌤️ Pomeriggio',
        en: '☀️ Morning / 🌤️ Afternoon',
        pt: '☀️ Manhã / 🌤️ Tarde'
      });
    }

    return recommendations;
  }

  /**
   * Adiciona automaticamente os produtos recomendados ao armário do utilizador.
   */
  static async addRecommendationsToCABinet(
    userId: string, 
    recommendations: ProductRecommendation[]
  ): Promise<void> {
    for (const rec of recommendations) {
      await DataService.addUserProduct(userId, {
        product_id: rec.product.id,
        custom_name: rec.product.name,
        custom_brand: rec.product.brand,
        custom_category: rec.product.category,
        custom_active_ingredients: rec.product.active_ingredients,
        opened_at: null,
        expiration_months: null
      });
    }
  }
}
