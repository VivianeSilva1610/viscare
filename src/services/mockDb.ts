import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  language: 'it' | 'en' | 'pt';
  subscription_plan: 'free' | 'premium' | 'influencer';
  subscription_expires_at: string | null;
  streak_count: number;
  last_active_date: string | null;
  scans_count_this_month?: number;
  last_scan_date?: string | null;
  biometric_consent_at?: string | null;
  terms_accepted_at?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  welcome_scans_used?: boolean;
  welcome_searches_used?: boolean;
  topup_scans?: number;
  topup_searches?: number;
  topup_vis_questions?: number;
}

export interface SkinProfile {
  user_id: string;
  skin_type: 'oily' | 'dry' | 'combination' | 'normal';
  age: number;
  is_sensitive: boolean;
  goals: string[];
  concerns: string[];
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: 'cleanser' | 'toner' | 'treatment' | 'moisturizer' | 'spf';
  active_ingredients: string[];
}

export interface UserProduct {
  id: string;
  user_id: string;
  product_id: string | null;
  custom_name: string;
  custom_brand: string;
  custom_category: 'cleanser' | 'toner' | 'treatment' | 'moisturizer' | 'spf';
  custom_active_ingredients: string[];
  opened_at: string | null;
  expiration_months: number | null;
  is_favorite?: boolean;
  ai_evaluation?: string | null;
}

export interface Ingredient {
  id: string;
  name: string;
  benefits_it: string;
  benefits_en: string;
  benefits_pt: string;
  evidence_level: 'High' | 'Moderate' | 'Low';
  description_it: string;
  description_en: string;
  description_pt: string;
}

export interface Routine {
  id: string;
  user_id: string;
  type: 'AM' | 'PM';
  is_active: boolean;
}

export interface RoutineStep {
  id: string;
  routine_id: string;
  user_product_id: string;
  position: number;
  notes: string | null;
  is_completed: boolean;
}

export interface CompatibilityRule {
  id: string;
  ingredient_a: string;
  ingredient_b: string;
  severity: 'green' | 'yellow' | 'red';
  description_it: string;
  description_en: string;
  description_pt: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  type: 'AM' | 'SPF' | 'PM';
  time: string;
  is_enabled: boolean;
}

export interface Appointment {
  id: string;
  user_id: string;
  title: string;
  dateStr: string;
  time: string;
  location: string;
  status: 'upcoming' | 'completed';
}

// DADOS SEED PARA O MODO MOCK
export const MOCK_INGREDIENTS: Ingredient[] = [
  {
    id: 'ing-1',
    name: 'Retinolo',
    benefits_it: 'Antietà, riduzione rughe, rigenerazione cellulare',
    benefits_en: 'Anti-aging, wrinkle reduction, cell regeneration',
    benefits_pt: 'Antienvelhecimento, redução de rugas, regeneração celular',
    evidence_level: 'High',
    description_it: 'Derivato della Vitamina A che stimola il turnover cellulare e la produzione di collagene.',
    description_en: 'Vitamin A derivative that stimulates cell turnover and collagen production.',
    description_pt: 'Derivado da Vitamina A que estimula a renovação celular e a produção de colágeno.'
  },
  {
    id: 'ing-2',
    name: 'Vitamina C',
    benefits_it: 'Antiossidante, illuminante, produzione di collagene',
    benefits_en: 'Antioxidant, brightening, collagen production',
    benefits_pt: 'Antioxidante, iluminador, produção de colágeno',
    evidence_level: 'High',
    description_it: 'Potente antiossidante che contrasta i radicali liberi, schiarisce le macchie scure e dona luminosità.',
    description_en: 'Powerful antioxidant that neutralizes free radicals, fades dark spots, and boosts radiance.',
    description_pt: 'Potente antioxidante que neutraliza os radicais livres, clareia manchas escuras e aumenta a luminosidade.'
  },
  {
    id: 'ing-3',
    name: 'Acido Ialuronico',
    benefits_it: 'Idratazione profonda, rimpolpante, lenitivo',
    benefits_en: 'Deep hydration, plumping, soothing',
    benefits_pt: 'Hidratação profunda, preenchimento, calmante',
    evidence_level: 'High',
    description_it: 'Molecola in grado di trattenere fino a 1000 volte il suo peso in acqua per un\'idratazione ottimale.',
    description_en: 'Molecule capable of holding up to 1000 times its weight in water for optimal hydration.',
    description_pt: 'Molécula capaz de reter até 1000 vezes seu peso em água para uma hidratação ideal.'
  },
  {
    id: 'ing-4',
    name: 'AHA/BHA',
    benefits_it: 'Esfoliazione, rimozione cellule morte, pulizia dei pori',
    benefits_en: 'Exfoliation, dead cell removal, pore clearing',
    benefits_pt: 'Esfoliação, remoção de células mortas, desobstrução dos poros',
    evidence_level: 'High',
    description_it: 'Acidi (es. Glicolico, Salicilico) che promuovono l\'esfoliazione chimica eliminando impurità e cellule morte.',
    description_en: 'Acids (e.g., Glycolic, Salicylic) promoting chemical exfoliation, removing impurities and dead cells.',
    description_pt: 'Ácidos (ex: Glicólico, Salicílico) que promovem a esfoliação química, removendo impurezas e células mortas.'
  },
  {
    id: 'ing-5',
    name: 'Niacinamide',
    benefits_it: 'Regolazione del sebo, anti-arrossamento, barriera cutanea',
    benefits_en: 'Sebum regulation, anti-redness, skin barrier support',
    benefits_pt: 'Regulação do sebo, anti-vermelhidão, suporte à barreira cutânea',
    evidence_level: 'High',
    description_it: 'Vitamina B3 che migliora l\'elasticità, riduce le discromie e rinforza la barriera cutanea.',
    description_en: 'Vitamin B3 that improves elasticity, reduces discolorations, and strengthens the skin barrier.',
    description_pt: 'Vitamina B3 que melhora a elasticidade, reduz descolorações e fortalece a barreira cutânea.'
  },
  {
    id: 'ing-6',
    name: 'PDRN (Polidesossiribonucleotide)',
    benefits_it: 'Rigenerazione cellulare, guarigione delle ferite, antietà',
    benefits_en: 'Cellular regeneration, wound healing, anti-aging',
    benefits_pt: 'Regeneração celular, cicatrização, antienvelhecimento',
    evidence_level: 'Moderate',
    description_it: 'Derivato dal DNA del salmone, stimola la riparazione dei tessuti e migliora l\'elasticità e l\'idratazione della pelle.',
    description_en: 'Derived from salmon DNA, it stimulates tissue repair and improves skin elasticity and hydration.',
    description_pt: 'Derivado do DNA de salmão, estimula a reparação de tecidos e melhora a elasticidade e hidratação da pele.'
  }
];

export const MOCK_PRODUCTS: Product[] = [
  { id: 'p-1', name: 'Gentle Cleanser', brand: 'CeraVe', category: 'cleanser', active_ingredients: ['Acido Ialuronico'] },
  { id: 'p-2', name: 'Hydrating Cleanser', brand: 'Cetaphil', category: 'cleanser', active_ingredients: ['Niacinamide'] },
  { id: 'p-3', name: 'BHA Blackhead Power Liquid', brand: 'COSRX', category: 'toner', active_ingredients: ['AHA/BHA'] },
  { id: 'p-4', name: 'Glycolic Acid 7% Toning Solution', brand: 'The Ordinary', category: 'toner', active_ingredients: ['AHA/BHA'] },
  { id: 'p-5', name: 'Retinol 0.2% in Squalane', brand: 'The Ordinary', category: 'treatment', active_ingredients: ['Retinolo'] },
  { id: 'p-6', name: 'Hyaluronic Acid 2% + B5', brand: 'The Ordinary', category: 'treatment', active_ingredients: ['Acido Ialuronico'] },
  { id: 'p-7', name: 'Vitamin C 15% Super Serum', brand: 'Paula\'s Choice', category: 'treatment', active_ingredients: ['Vitamina C'] },
  { id: 'p-8', name: 'Natural Moisturizing Factors + HA', brand: 'The Ordinary', category: 'moisturizer', active_ingredients: ['Acido Ialuronico'] },
  { id: 'p-9', name: 'Ultra Facial Cream', brand: 'Kiehl\'s', category: 'moisturizer', active_ingredients: ['Acido Ialuronico'] },
  { id: 'p-10', name: 'Anthelios UVMune 400 SPF 50+', brand: 'La Roche-Posay', category: 'spf', active_ingredients: [] },
  { id: 'p-11', name: 'Watery Essence SPF 50+', brand: 'Bioré', category: 'spf', active_ingredients: ['Acido Ialuronico'] }
];

export const MOCK_COMPATIBILITY_RULES: CompatibilityRule[] = [
  {
    id: 'rule-1',
    ingredient_a: 'Retinolo',
    ingredient_b: 'Vitamina C',
    severity: 'red',
    description_it: 'Retinolo e Vitamina C richiedono pH diversi e possono causare forti irritazioni se usati insieme. Usa la Vitamina C al mattino e il Retinolo la sera.',
    description_en: 'Retinol and Vitamin C require different pH levels and can cause severe irritation if used together. Use Vitamin C in the morning and Retinol at night.',
    description_pt: 'Retinol e Vitamina C requerem pHs diferentes e podem causar irritação severa se usados juntos. Use a Vitamina C de manhã e o Retinol à noite.'
  },
  {
    id: 'rule-2',
    ingredient_a: 'Retinolo',
    ingredient_b: 'AHA/BHA',
    severity: 'red',
    description_it: 'Entrambi esfoliano la pelle. L\'uso combinato può danneggiare la barriera cutanea causando secchezza e arrossamento. Alterna le sere d\'uso.',
    description_en: 'Both exfoliate the skin. Combined use can compromise the skin barrier leading to extreme dryness and redness. Alternate nights of use.',
    description_pt: 'Ambos esfoliam a pele. O uso combinado pode comprometer a barreira cutânea, levando a ressecamento extremo e vermelhidão. Alterne as noites de uso.'
  },
  {
    id: 'rule-3',
    ingredient_a: 'AHA/BHA',
    ingredient_b: 'Vitamina C',
    severity: 'yellow',
    description_it: 'L\'uso simultaneo può sovraccaricare la pelle ed esfoliare eccessivamente. Si consiglia di usarli in momenti diversi della giornata.',
    description_en: 'Simultaneous use can overload the skin and over-exfoliate. It is recommended to use them at different times of the day.',
    description_pt: 'O uso simultâneo pode sobrecarregar a pele e esfoliar excessivamente. Recomenda-se usá-los em momentos diferentes do dia.'
  },
  {
    id: 'rule-4',
    ingredient_a: 'Retinolo',
    ingredient_b: 'Acido Ialuronico',
    severity: 'green',
    description_it: 'L\'Acido Ialuronico idrata in profondità e riduce la secchezza associata al Retinolo. Ottima combinazione per ripristinare la barriera cutanea.',
    description_en: 'Hyaluronic Acid deeply hydrates and reduces dryness associated with Retinol. Excellent combination to restore the skin barrier.',
    description_pt: 'O Ácido Hialurônico hidrata profundamente e reduz o ressecamento associado ao Retinol. Excelente combinação para restaurar a barreira da pele.'
  },
  {
    id: 'rule-5',
    ingredient_a: 'Niacinamide',
    ingredient_b: 'Vitamina C',
    severity: 'yellow',
    description_it: 'In alcune formulazioni acide, la Niacinamide può ridurre l\'efficacia della Vitamina C. Se la pelle si arrossa, usali separatamente.',
    description_en: 'In some acidic formulations, Niacinamide can decrease Vitamin C effectiveness. If your skin flushes, use them at different times.',
    description_pt: 'Em algumas formulações ácidas, a Niacinamida pode diminuir a eficácia da Vitamina C. Se a pele ficar avermelhada, use-os em momentos diferentes.'
  },
  {
    id: 'rule-6',
    ingredient_a: 'Niacinamide',
    ingredient_b: 'Retinolo',
    severity: 'green',
    description_it: 'La Niacinamide lenisce la pelle e rafforza la barriera protettiva, riducendo l\'irritazione tipica del Retinolo. Combinazione consigliata.',
    description_en: 'Niacinamide soothes the skin and strengthens the protective barrier, mitigating the typical irritation of Retinol. Recommended combo.',
    description_pt: 'A Niacinamida acalma a pele e fortalece a barreira protetora, mitigando a irritação típica do Retinol. Combinação recomendada.'
  }
];

// BANCO DE DADOS EM MEMÓRIA LOCAL / PERSISTIDO COM ASYNC STORAGE
export class MockDatabase {
  private static async getJson<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const data = await AsyncStorage.getItem(`viscare_mock_${key}`);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private static async saveJson<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(`viscare_mock_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn('Erro ao salvar no AsyncStorage', e);
    }
  }

  static async clearAll(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const viscareKeys = keys.filter(k => k.startsWith('viscare_mock_'));
    await AsyncStorage.multiRemove(viscareKeys);
  }

  // PROFILE
  static async getProfile(userId: string): Promise<Profile> {
    const profiles = await this.getJson<Profile[]>('profiles', []);
    let profile = profiles.find(p => p.id === userId);
    if (!profile) {
      profile = {
        id: userId,
        email: 'user@viscare.com',
        display_name: '',
        language: 'it',
        subscription_plan: 'free',
        subscription_expires_at: null,
        streak_count: 0,
        last_active_date: null,
        scans_count_this_month: 0,
        last_scan_date: null
      };
      profiles.push(profile);
      await this.saveJson('profiles', profiles);
    } else {
      // Garantir campos para perfis existentes
      let updated = false;
      if (profile.scans_count_this_month === undefined) {
        profile.scans_count_this_month = 0;
        updated = true;
      }
      if (profile.last_scan_date === undefined) {
        profile.last_scan_date = null;
        updated = true;
      }
      if (updated) {
        await this.saveJson('profiles', profiles);
      }
    }
    return profile;
  }

  static async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const profiles = await this.getJson<Profile[]>('profiles', []);
    const idx = profiles.findIndex(p => p.id === userId);
    let updated: Profile;
    if (idx !== -1) {
      updated = { ...profiles[idx], ...updates };
      profiles[idx] = updated;
    } else {
      updated = {
        id: userId,
        email: 'user@viscare.com',
        display_name: '',
        language: 'it',
        subscription_plan: 'free',
        subscription_expires_at: null,
        streak_count: 0,
        last_active_date: null,
        scans_count_this_month: 0,
        last_scan_date: null,
        ...updates
      };
      profiles.push(updated);
    }
    await this.saveJson('profiles', profiles);
    return updated;
  }

  // SKIN PROFILE
  static async getSkinProfile(userId: string): Promise<SkinProfile | null> {
    const skinProfiles = await this.getJson<SkinProfile[]>('skin_profiles', []);
    return skinProfiles.find(sp => sp.user_id === userId) || null;
  }

  static async saveSkinProfile(userId: string, skinProfile: Omit<SkinProfile, 'user_id'>): Promise<SkinProfile> {
    const skinProfiles = await this.getJson<SkinProfile[]>('skin_profiles', []);
    const idx = skinProfiles.findIndex(sp => sp.user_id === userId);
    const newSp: SkinProfile = { user_id: userId, ...skinProfile };
    if (idx !== -1) {
      skinProfiles[idx] = newSp;
    } else {
      skinProfiles.push(newSp);
    }
    await this.saveJson('skin_profiles', skinProfiles);
    return newSp;
  }

  // USER PRODUCTS (SKINCARE CABINET)
  static async getUserProducts(userId: string): Promise<UserProduct[]> {
    return this.getJson<UserProduct[]>(`user_products_${userId}`, []);
  }

  static async addUserProduct(userId: string, product: Omit<UserProduct, 'id' | 'user_id'>): Promise<UserProduct> {
    const products = await this.getUserProducts(userId);
    const newProduct: UserProduct = {
      id: `up-${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      is_favorite: false,
      ...product
    };
    products.push(newProduct);
    await this.saveJson(`user_products_${userId}`, products);
    return newProduct;
  }

  static async updateUserProduct(userId: string, productId: string, updates: Partial<UserProduct>): Promise<UserProduct[]> {
    const products = await this.getUserProducts(userId);
    const idx = products.findIndex(p => p.id === productId);
    if (idx !== -1) {
      products[idx] = { ...products[idx], ...updates };
      await this.saveJson(`user_products_${userId}`, products);
    }
    return products;
  }

  static async deleteUserProduct(userId: string, productId: string): Promise<void> {
    let products = await this.getUserProducts(userId);
    products = products.filter(p => p.id !== productId);
    await this.saveJson(`user_products_${userId}`, products);

    // Também remover passos de rotina associados a esse produto
    const routines = await this.getRoutines(userId);
    for (const r of routines) {
      let steps = await this.getRoutineSteps(r.id);
      if (steps.some(s => s.user_product_id === productId)) {
        steps = steps.filter(s => s.user_product_id !== productId);
        // reordenar
        steps.forEach((s, index) => { s.position = index; });
        await this.saveJson(`routine_steps_${r.id}`, steps);
      }
    }
  }

  // ROUTINES
  static async getRoutines(userId: string): Promise<Routine[]> {
    let routines = await this.getJson<Routine[]>(`routines_${userId}`, []);
    if (routines.length === 0) {
      routines = [
        { id: `rot-am-${userId}`, user_id: userId, type: 'AM', is_active: true },
        { id: `rot-pm-${userId}`, user_id: userId, type: 'PM', is_active: true }
      ];
      await this.saveJson(`routines_${userId}`, routines);
    }
    return routines;
  }

  // ROUTINE STEPS
  static async getRoutineSteps(routineId: string): Promise<RoutineStep[]> {
    return this.getJson<RoutineStep[]>(`routine_steps_${routineId}`, []);
  }

  static async saveRoutineSteps(routineId: string, steps: RoutineStep[]): Promise<void> {
    await this.saveJson(`routine_steps_${routineId}`, steps);
  }

  // REMINDERS
  static async getReminders(userId: string): Promise<Reminder[]> {
    let reminders = await this.getJson<Reminder[]>(`reminders_${userId}`, []);
    if (reminders.length === 0) {
      reminders = [
        { id: `rem-am-${userId}`, user_id: userId, type: 'AM', time: '07:00:00', is_enabled: true },
        { id: `rem-spf-${userId}`, user_id: userId, type: 'SPF', time: '12:00:00', is_enabled: true },
        { id: `rem-pm-${userId}`, user_id: userId, type: 'PM', time: '22:00:00', is_enabled: true }
      ];
      await this.saveJson(`reminders_${userId}`, reminders);
    }
    return reminders;
  }

  static async updateReminder(userId: string, type: 'AM' | 'SPF' | 'PM', updates: Partial<Reminder>): Promise<Reminder[]> {
    const reminders = await this.getReminders(userId);
    const idx = reminders.findIndex(r => r.type === type);
    if (idx !== -1) {
      reminders[idx] = { ...reminders[idx], ...updates };
      await this.saveJson(`reminders_${userId}`, reminders);
    }
    return reminders;
  }

  // APPOINTMENTS (AGENDA)
  static async getAppointments(userId: string): Promise<Appointment[]> {
    let appointments = await this.getJson<Appointment[]>(`appointments_${userId}`, []);
    if (appointments.length === 0) {
      appointments = [
        {
          id: `app-1-${userId}`,
          user_id: userId,
          title: 'agenda.treatment_deep_cleansing',
          dateStr: 'agenda.day_14_jun',
          time: '14:00 - 15:30',
          location: 'agenda.clinic_name',
          status: 'upcoming'
        },
        {
          id: `app-2-${userId}`,
          user_id: userId,
          title: 'agenda.treatment_peeling',
          dateStr: 'agenda.day_27_jun',
          time: '10:00 - 11:00',
          location: 'agenda.clinic_name',
          status: 'upcoming'
        }
      ];
      await this.saveJson(`appointments_${userId}`, appointments);
    }
    return appointments;
  }

  static async saveAppointments(userId: string, appointments: Appointment[]): Promise<void> {
    await this.saveJson(`appointments_${userId}`, appointments);
  }

  static async addAppointment(userId: string, appointment: Omit<Appointment, 'id' | 'user_id'>): Promise<Appointment> {
    const appointments = await this.getAppointments(userId);
    const newApp: Appointment = {
      id: `app-${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      ...appointment
    };
    appointments.push(newApp);
    await this.saveAppointments(userId, appointments);
    return newApp;
  }

  static async deleteAppointment(userId: string, appointmentId: string): Promise<void> {
    let appointments = await this.getAppointments(userId);
    appointments = appointments.filter(a => a.id !== appointmentId);
    await this.saveAppointments(userId, appointments);
  }

  static async updateAppointment(userId: string, appointmentId: string, updates: Partial<Appointment>): Promise<Appointment[]> {
    const appointments = await this.getAppointments(userId);
    const idx = appointments.findIndex(a => a.id === appointmentId);
    if (idx !== -1) {
      appointments[idx] = { ...appointments[idx], ...updates };
      await this.saveAppointments(userId, appointments);
    }
    return appointments;
  }

  // FACIAL SCANS
  static async getFacialScans(userId: string): Promise<any[]> {
    return this.getJson<any[]>(`facial_scans_${userId}`, []);
  }

  static async addFacialScan(userId: string, scanResult: any): Promise<void> {
    const scans = await this.getFacialScans(userId);
    const newScan = {
      id: `scan-${Math.random().toString(36).substr(2, 9)}`,
      date: new Date().toISOString(),
      ...scanResult
    };
    scans.push(newScan);
    await this.saveJson(`facial_scans_${userId}`, scans);
  }

  static async deleteFacialScans(userId: string): Promise<void> {
    await this.saveJson(`facial_scans_${userId}`, []);
  }

  static async incrementScanCount(userId: string): Promise<boolean> {
    const profile = await this.getProfile(userId);
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let lastScanMonthStr = '';
    if (profile.last_scan_date) {
      const lastScanDate = new Date(profile.last_scan_date);
      lastScanMonthStr = `${lastScanDate.getFullYear()}-${String(lastScanDate.getMonth() + 1).padStart(2, '0')}`;
    }

    let count = profile.scans_count_this_month ?? 0;
    if (lastScanMonthStr && lastScanMonthStr !== currentMonthStr) {
      count = 0; // Novo mês, reseta
    }

    const isUnlimitedUser = profile.email?.toLowerCase() === 'viroedu@gmail.com';
    if (count >= 6 && !isUnlimitedUser) {
      return false; // Excedeu o limite de 6 mensais
    }

    await this.updateProfile(userId, {
      scans_count_this_month: count + 1,
      last_scan_date: now.toISOString()
    });
    return true;
  }
}
