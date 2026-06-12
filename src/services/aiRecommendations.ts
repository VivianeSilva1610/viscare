import { SkinProfile, Product, MOCK_PRODUCTS } from './mockDb';
import { DataService } from './dataService';
import { Language } from '../context/LocalizationContext';

export interface ProductRecommendation {
  product: Product;
  reason: {
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

    const addProduct = (productId: string, reason: { it: string; en: string; pt: string }) => {
      if (addedProductIds.has(productId)) return;
      const product = catalog.find(p => p.id === productId);
      if (product) {
        addedProductIds.add(productId);
        recommendations.push({ product, reason });
      }
    };

    // === REGRA 1: LIMPADOR baseado no tipo de pele ===
    if (skinProfile.skin_type === 'oily' || skinProfile.skin_type === 'combination') {
      addProduct('p-1', {
        it: 'Detergente delicato ideale per pelle grassa/mista, rimuove il sebo senza seccare.',
        en: 'Gentle cleanser ideal for oily/combination skin, removes sebum without drying.',
        pt: 'Limpador suave ideal para pele oleosa/mista, remove o sebo sem ressecar.'
      });
    } else {
      // Pele seca ou normal
      addProduct('p-2', {
        it: 'Detergente idratante perfetto per pelle secca/normale, mantiene l\'idratazione.',
        en: 'Hydrating cleanser perfect for dry/normal skin, maintains moisture.',
        pt: 'Limpador hidratante perfeito para pele seca/normal, mantém a hidratação.'
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
        it: 'Il BHA penetra nei pori e li pulisce in profondità, ideale per pelle grassa e acne.',
        en: 'BHA penetrates pores and deeply cleanses them, ideal for oily skin and acne.',
        pt: 'O BHA penetra nos poros e os limpa profundamente, ideal para pele oleosa e acne.'
      });
    }

    // Se quer iluminar ou tem manchas → Tônico AHA
    const needsBrightening = concernsLower.some(c => c.includes('manch') || c.includes('spot') || c.includes('macchi')) ||
      goalsLower.some(g => g.includes('illumin') || g.includes('bright') || g.includes('ilumin'));
    
    if (needsBrightening) {
      addProduct('p-4', {
        it: 'L\'acido glicolico esfolia delicatamente e schiarisce le macchie scure per una pelle luminosa.',
        en: 'Glycolic acid gently exfoliates and fades dark spots for brighter skin.',
        pt: 'O ácido glicólico esfolia suavemente e clareia manchas escuras para uma pele luminosa.'
      });
    }

    // === REGRA 3: TRATAMENTO baseado em objetivos ===
    // Anti-aging → Retinol (apenas se não for sensível ou com cuidado)
    const wantsAntiAging = goalsLower.some(g => g.includes('anti') || g.includes('rug') || g.includes('wrink') || g.includes('età'));
    
    if (wantsAntiAging && !skinProfile.is_sensitive) {
      addProduct('p-5', {
        it: 'Il Retinolo stimola il turnover cellulare e la produzione di collagene per combattere le rughe.',
        en: 'Retinol stimulates cell turnover and collagen production to fight wrinkles.',
        pt: 'O Retinol estimula a renovação celular e a produção de colágeno para combater rugas.'
      });
    }

    // Hidratação → Ácido Hialurônico
    const wantsHydration = goalsLower.some(g => g.includes('idrat') || g.includes('hydrat') || g.includes('hidrat')) ||
      concernsLower.some(c => c.includes('secch') || c.includes('dry') || c.includes('ressec'));
    
    if (wantsHydration || skinProfile.skin_type === 'dry') {
      addProduct('p-6', {
        it: 'L\'Acido Ialuronico trattiene fino a 1000 volte il suo peso in acqua per un\'idratazione profonda.',
        en: 'Hyaluronic Acid holds up to 1000x its weight in water for deep hydration.',
        pt: 'O Ácido Hialurônico retém até 1000x seu peso em água para hidratação profunda.'
      });
    }

    // Iluminar / Manchas → Vitamina C
    if (needsBrightening || wantsAntiAging) {
      addProduct('p-7', {
        it: 'La Vitamina C è un potente antiossidante che illumina e protegge dai radicali liberi.',
        en: 'Vitamin C is a powerful antioxidant that brightens and protects from free radicals.',
        pt: 'A Vitamina C é um poderoso antioxidante que ilumina e protege dos radicais livres.'
      });
    }

    // Barreira → Niacinamide (se sensível ou barreira)
    const wantsBarrier = goalsLower.some(g => g.includes('barri') || g.includes('barrier'));
    if (skinProfile.is_sensitive || wantsBarrier) {
      // Niacinamide está no cleanser p-2, mas podemos recomendar o ácido hialurônico para hidratar
      addProduct('p-6', {
        it: 'L\'Acido Ialuronico rinforza la barriera cutanea e dona idratazione profonda.',
        en: 'Hyaluronic Acid strengthens the skin barrier and provides deep hydration.',
        pt: 'O Ácido Hialurônico fortalece a barreira cutânea e proporciona hidratação profunda.'
      });
    }

    // === REGRA 4: HIDRATANTE ===
    if (skinProfile.skin_type === 'dry' || skinProfile.age > 35) {
      addProduct('p-9', {
        it: 'Crema idratante ricca e premium per una pelle morbida e nutrita tutto il giorno.',
        en: 'Rich premium moisturizer for soft and nourished skin all day long.',
        pt: 'Creme hidratante rico e premium para uma pele macia e nutrida o dia todo.'
      });
    } else {
      addProduct('p-8', {
        it: 'Idratante leggero con fattori idratanti naturali, perfetto per uso quotidiano.',
        en: 'Lightweight moisturizer with natural moisturizing factors, perfect for daily use.',
        pt: 'Hidratante leve com fatores de hidratação naturais, perfeito para uso diário.'
      });
    }

    // === REGRA 5: SPF OBRIGATÓRIO ===
    if (skinProfile.skin_type === 'oily') {
      addProduct('p-11', {
        it: 'Protezione solare leggera a base acquosa, ideale per pelle grassa. Non unge!',
        en: 'Lightweight water-based sunscreen, ideal for oily skin. Non-greasy!',
        pt: 'Protetor solar leve à base de água, ideal para pele oleosa. Não oleoso!'
      });
    } else {
      addProduct('p-10', {
        it: 'Protezione solare SPF 50+ con filtri UVA/UVB avanzati. Essenziale ogni mattina!',
        en: 'SPF 50+ sunscreen with advanced UVA/UVB filters. Essential every morning!',
        pt: 'Protetor solar FPS 50+ com filtros UVA/UVB avançados. Essencial todas as manhãs!'
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
