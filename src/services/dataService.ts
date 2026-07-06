import { supabase, isSupabaseConfigured } from './supabase';
import { 
  MockDatabase, 
  Profile, 
  SkinProfile, 
  UserProduct, 
  Product, 
  Ingredient, 
  Routine, 
  RoutineStep, 
  CompatibilityRule, 
  Reminder,
  Appointment,
  MOCK_INGREDIENTS,
  MOCK_PRODUCTS,
  MOCK_COMPATIBILITY_RULES
} from './mockDb';

export class DataService {
  // Verificar se o usuário está autenticado no Supabase real
  private static async getAuthUserId(): Promise<string | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data } = await supabase.auth.getSession();
      return data.session?.user?.id || null;
    } catch {
      return null;
    }
  }

  // 1. OBTÊR PERFIL
  static async getProfile(userId: string): Promise<Profile> {
    const realUid = await this.getAuthUserId();
    if (realUid) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', realUid)
        .single();
      if (!error && data) return data as Profile;
    }
    return MockDatabase.getProfile(userId);
  }

  // 2. ATUALIZAR PERFIL
  static async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const realUid = await this.getAuthUserId();
    if (realUid) {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', realUid)
        .select()
        .single();
      if (!error && data) return data as Profile;
    }
    return MockDatabase.updateProfile(userId, updates);
  }

  // 3. OBTÊR SKIN PROFILE
  static async getSkinProfile(userId: string): Promise<SkinProfile | null> {
    const realUid = await this.getAuthUserId();
    if (realUid) {
      const { data, error } = await supabase
        .from('skin_profiles')
        .select('*')
        .eq('user_id', realUid)
        .single();
      if (!error && data) return data as SkinProfile;
    }
    return MockDatabase.getSkinProfile(userId);
  }

  // 4. SALVAR SKIN PROFILE
  static async saveSkinProfile(userId: string, skinProfile: Omit<SkinProfile, 'user_id'>): Promise<SkinProfile> {
    const realUid = await this.getAuthUserId();
    if (realUid) {
      // Upsert
      const { data, error } = await supabase
        .from('skin_profiles')
        .upsert({ user_id: realUid, ...skinProfile })
        .select()
        .single();
      if (!error && data) return data as SkinProfile;
    }
    return MockDatabase.saveSkinProfile(userId, skinProfile);
  }

  // 5. PRODUTOS DO USUÁRIO (Cabinet)
  static async getUserProducts(userId: string): Promise<UserProduct[]> {
    const realUid = await this.getAuthUserId();
    if (realUid) {
      const { data, error } = await supabase
        .from('user_products')
        .select('*')
        .eq('user_id', realUid);
      if (!error && data) return data as UserProduct[];
    }
    return MockDatabase.getUserProducts(userId);
  }

  // 6. ADICIONAR PRODUTO AO USUÁRIO
  static async addUserProduct(userId: string, product: Omit<UserProduct, 'id' | 'user_id'>): Promise<UserProduct> {
    const realUid = await this.getAuthUserId();
    if (realUid) {
      const { data, error } = await supabase
        .from('user_products')
        .insert({ user_id: realUid, ...product })
        .select()
        .single();
      if (!error && data) return data as UserProduct;
    }
    return MockDatabase.addUserProduct(userId, product);
  }

  // 7. EXCLUIR PRODUTO DO USUÁRIO
  static async deleteUserProduct(userId: string, productId: string): Promise<void> {
    const realUid = await this.getAuthUserId();
    if (realUid) {
      const { error } = await supabase
        .from('user_products')
        .delete()
        .eq('id', productId)
        .eq('user_id', realUid);
      
      if (error) {
        console.error('Error deleting product from Supabase:', error);
        throw new Error(error.message);
      }
      return;
    }
    await MockDatabase.deleteUserProduct(userId, productId);
  }


  // 8. OBTÊR ROTINAS (AM / PM)
  static async getRoutines(userId: string): Promise<Routine[]> {
    const realUid = await this.getAuthUserId();
    if (realUid) {
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .eq('user_id', realUid);
      if (!error && data && data.length > 0) return data as Routine[];
      
      // Se não houver rotina, criar as rotinas AM/PM padrão no Supabase
      if (!error && data && data.length === 0) {
        const { data: newRoutines, error: createError } = await supabase
          .from('routines')
          .insert([
            { user_id: realUid, type: 'AM', is_active: true },
            { user_id: realUid, type: 'PM', is_active: true }
          ])
          .select();
        if (!createError && newRoutines) return newRoutines as Routine[];
      }
    }
    return MockDatabase.getRoutines(userId);
  }

  // 9. PASSOS DA ROTINA
  static async getRoutineSteps(routineId: string): Promise<RoutineStep[]> {
    const realUid = await this.getAuthUserId();
    if (realUid) {
      const { data, error } = await supabase
        .from('routine_steps')
        .select('*')
        .eq('routine_id', routineId)
        .order('position', { ascending: true });
      if (!error && data) return data as RoutineStep[];
    }
    return MockDatabase.getRoutineSteps(routineId);
  }

  // 10. SALVAR/REORDENAR PASSOS DA ROTINA
  static async saveRoutineSteps(routineId: string, steps: RoutineStep[]): Promise<void> {
    const realUid = await this.getAuthUserId();
    if (realUid) {
      // Deletar os antigos passos e inserir a nova ordenação
      await supabase
        .from('routine_steps')
        .delete()
        .eq('routine_id', routineId);
      
      if (steps.length > 0) {
        const insertPayload = steps.map(s => ({
          routine_id: s.routine_id,
          user_product_id: s.user_product_id,
          position: s.position,
          notes: s.notes,
          is_completed: s.is_completed
        }));
        await supabase
          .from('routine_steps')
          .insert(insertPayload);
      }
      return;
    }
    await MockDatabase.saveRoutineSteps(routineId, steps);
  }

  // 11. INGREDIENTES GLOBAIS
  static async getIngredients(): Promise<Ingredient[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .order('name', { ascending: true });
      if (!error && data) return data as Ingredient[];
    }
    return MOCK_INGREDIENTS;
  }

  // 12. PRODUTOS GLOBAIS (CATÁLOGO)
  static async getGlobalProducts(): Promise<Product[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });
      if (!error && data) return data as Product[];
    }
    return MOCK_PRODUCTS;
  }

  // 13. REGRAS DE COMPATIBILIDADE GLOBAIS
  static async getCompatibilityRules(): Promise<CompatibilityRule[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('compatibility_rules')
        .select('*');
      if (!error && data) return data as CompatibilityRule[];
    }
    return MOCK_COMPATIBILITY_RULES;
  }

  // 14. REMINDERS (PROMEMORIA)
  static async getReminders(userId: string): Promise<Reminder[]> {
    const realUid = await this.getAuthUserId();
    if (realUid) {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', realUid);
      if (!error && data && data.length > 0) return data as Reminder[];
      
      if (!error && data && data.length === 0) {
        const { data: newReminders, error: createError } = await supabase
          .from('reminders')
          .insert([
            { user_id: realUid, type: 'AM', time: '07:00:00', is_enabled: true },
            { user_id: realUid, type: 'SPF', time: '12:00:00', is_enabled: true },
            { user_id: realUid, type: 'PM', time: '22:00:00', is_enabled: true }
          ])
          .select();
        if (!createError && newReminders) return newReminders as Reminder[];
      }
    }
    return MockDatabase.getReminders(userId);
  }

  // 15. ATUALIZAR REMINDER
  static async updateReminder(userId: string, type: 'AM' | 'SPF' | 'PM', updates: Partial<Reminder>): Promise<Reminder[]> {
    const realUid = await this.getAuthUserId();
    if (realUid) {
      await supabase
        .from('reminders')
        .update(updates)
        .eq('user_id', realUid)
        .eq('type', type);
      return this.getReminders(userId);
    }
    return MockDatabase.updateReminder(userId, type, updates);
  }

  // 16. MOTOR DE REGRAS DE COMPATIBILIDADE
  static async checkCompatibility(activeIngredients: string[]): Promise<{
    status: 'green' | 'yellow' | 'red';
    conflicts: CompatibilityRule[];
  }> {
    // Buscar regras de compatibilidade
    const rules = await this.getCompatibilityRules();
    const conflicts: CompatibilityRule[] = [];
    
    // Comparar pares de ingredientes informados
    for (let i = 0; i < activeIngredients.length; i++) {
      for (let j = i + 1; j < activeIngredients.length; j++) {
        const ingA = activeIngredients[i].toLowerCase();
        const ingB = activeIngredients[j].toLowerCase();
        
        const matchingRule = rules.find(r => {
          const ruleA = r.ingredient_a.toLowerCase();
          const ruleB = r.ingredient_b.toLowerCase();
          return (ruleA === ingA && ruleB === ingB) || (ruleA === ingB && ruleB === ingA);
        });
        
        if (matchingRule) {
          conflicts.push(matchingRule);
        }
      }
    }
    
    // Determinar a severidade geral com base nos conflitos encontrados
    let status: 'green' | 'yellow' | 'red' = 'green';
    if (conflicts.some(c => c.severity === 'red')) {
      status = 'red';
    } else if (conflicts.some(c => c.severity === 'yellow')) {
      status = 'yellow';
    }
    
    return { status, conflicts };
  }

  // 17. IA DE GERAÇÃO DE ROTINA (generate-routine)
  static async generateRoutine(
    userId: string, 
    type: 'AM' | 'PM'
  ): Promise<{ success: boolean; routineSteps: Omit<RoutineStep, 'id' | 'routine_id'>[]; error?: string }> {
    const skinProfile = await this.getSkinProfile(userId);
    const userProducts = await this.getUserProducts(userId);
    
    if (!skinProfile) {
      return { success: false, routineSteps: [], error: 'routine.error_quiz_not_completed' };
    }
    if (userProducts.length === 0) {
      return { success: false, routineSteps: [], error: 'routine.empty_cabinet_warning' };
    }

    const realUid = await this.getAuthUserId();
    
    // Se Supabase estiver ativo, podemos tentar chamar a Edge Function
    if (realUid && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.functions.invoke('generate-routine', {
          body: { userId: realUid, type, skinProfile, userProducts }
        });
        if (!error && data && data.routineSteps) {
          return { success: true, routineSteps: data.routineSteps };
        }
      } catch (e) {
        console.warn('Erro ao chamar Edge Function, caindo de volta no mock', e);
      }
    }

    let language = 'pt';
    try {
      const profile = await this.getProfile(userId);
      language = profile?.language || 'pt';
    } catch {
      // Ignora erro
    }

    // SIMULAÇÃO DE IA OFFLINE/MOCK (Inteligente e em conformidade com as regras de ordem dermatológica)
    // Ordem padrão: cleanser -> toner -> treatment -> moisturizer -> SPF (apenas AM)
    const orderMap = {
      cleanser: 1,
      toner: 2,
      treatment: 3,
      moisturizer: 4,
      spf: 5
    };

    const validProducts = [...userProducts];

    // Ordenar os produtos usando a ordem dermatológica regulamentada
    const sortedProducts = [...validProducts].sort((a, b) => {
      const orderA = orderMap[a.custom_category] || 99;
      const orderB = orderMap[b.custom_category] || 99;
      return orderA - orderB;
    });

    // Mapear para passos de rotina
    const recommendedSteps = sortedProducts.map((p, index) => {
      let note = '';
      const cat = p.custom_category.toLowerCase();
      const hasPhotosensitive = p.custom_active_ingredients?.some(i => {
        const name = i.toLowerCase();
        return name.includes('retinol') || name.includes('retinolo') || name.includes('aha') || name.includes('bha') || name.includes('glicol') || name.includes('salicil');
      });

      if (cat === 'cleanser') {
        if (type === 'AM') {
          note = language === 'pt' ? 'Limpe suavemente o rosto para começar o dia.' : language === 'it' ? 'Pulisci delicatamente il viso per iniziare la giornata.' : 'Gently cleanse your face to start the day.';
        } else {
          note = language === 'pt' ? 'Remova as impurezas e a maquiagem acumuladas.' : language === 'it' ? 'Rimuovi le impurità e il trucco accumulati.' : 'Remove accumulated impurities and makeup.';
        }
      } else if (cat === 'toner') {
        if (type === 'AM' && hasPhotosensitive) {
          note = language === 'pt' ? '⚠️ Contém ativos fotossensíveis. Use protetor solar.' : language === 'it' ? '⚠️ Contiene attivi fotosensibili. Usa la protezione solare.' : '⚠️ Contains photosensitive actives. Use sunscreen.';
        } else {
          note = language === 'pt' ? 'Aplique dando batidinhas para restaurar o pH.' : language === 'it' ? 'Applica picchiettando per ripristinare il pH.' : 'Pat gently to restore pH balance.';
        }
      } else if (cat === 'treatment') {
        if (hasPhotosensitive) {
          if (type === 'AM') {
            note = language === 'pt' ? '⚠️ Contém ativos fotossensíveis. Uso obrigatório de protetor solar.' : language === 'it' ? '⚠️ Contiene attivi fotosensibili. Uso obbligatorio della protezione solare.' : '⚠️ Contains photosensitive actives. Mandatory use of sunscreen.';
          } else {
            note = language === 'pt' ? 'Recomendado para uso na rotina da noite. Use protetor solar pela manhã.' : language === 'it' ? 'Consigliato per l\'uso nella routine serale. Usa la protezione solare al mattino.' : 'Recommended for night routine use. Use sunscreen in the morning.';
          }
        } else {
          note = language === 'pt' ? 'Use uma pequena quantidade e massageie com cuidado.' : language === 'it' ? 'Usa una piccola quantità e massaggia con cura.' : 'Use a small amount and massage gently.';
        }
      } else if (cat === 'moisturizer') {
        note = language === 'pt' ? 'Massageie para selar a hidratação.' : language === 'it' ? 'Massaggia per sigillare l\'idratazione.' : 'Massage to lock in hydration.';
      } else if (cat === 'spf') {
        if (type === 'PM') {
          note = language === 'pt' ? '⚠️ Filtro solar (geralmente não é necessário na rotina da noite).' : language === 'it' ? '⚠️ Protezione solare (di solito non necessaria nella routine serale).' : '⚠️ Sunscreen (usually not necessary for the night routine).';
        } else {
          note = language === 'pt' ? 'Proteção solar obrigatória pela manhã. Reaplique durante o dia.' : language === 'it' ? 'Protezione solare obbligatoria al mattino. Riapplica durante il giorno.' : 'Mandatory morning sun protection. Reapply throughout the day.';
        }
      }

      return {
        user_product_id: p.id,
        position: index,
        notes: note,
        is_completed: false
      };
    });

    return { success: true, routineSteps: recommendedSteps };
  }

  // EXCLUIR CONTA COMPLETA (LGPD / GDPR CASCADE DELETE)
  static async deleteAccount(userId: string): Promise<boolean> {
    const realUid = await this.getAuthUserId();
    if (realUid) {
      // Chamar Supabase Auth para deletar usuário (se configurado um endpoint de edge function,
      // ou se fizermos delete em cascades de profiles que por chave estrangeira ON DELETE CASCADE remove os dados).
      // Mas o próprio Postgres fará a exclusão em cascata das outras tabelas
      const { error } = await supabase.from('profiles').delete().eq('id', realUid);
      if (error) {
        console.error('Erro ao deletar perfil do Supabase', error);
        return false;
      }
      await supabase.auth.signOut();
      return true;
    }
    // Caso contrário, limpa os mocks locais
    await MockDatabase.clearAll();
    return true;
  }

  // 18. APPOINTMENTS (AGENDA)
  static async getAppointments(userId: string): Promise<Appointment[]> {
    const realUid = await this.getAuthUserId();
    if (realUid) {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', realUid);
      if (!error && data) return data as Appointment[];
    }
    return MockDatabase.getAppointments(userId);
  }

  static async addAppointment(userId: string, appointment: Omit<Appointment, 'id' | 'user_id'>): Promise<Appointment> {
    const realUid = await this.getAuthUserId();
    if (realUid) {
      const { data, error } = await supabase
        .from('appointments')
        .insert({ user_id: realUid, ...appointment })
        .select()
        .single();
      if (!error && data) return data as Appointment;
    }
    return MockDatabase.addAppointment(userId, appointment);
  }

  static async deleteAppointment(userId: string, appointmentId: string): Promise<void> {
    const realUid = await this.getAuthUserId();
    if (realUid) {
      await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId)
        .eq('user_id', realUid);
      return;
    }
    await MockDatabase.deleteAppointment(userId, appointmentId);
  }

  static async updateAppointment(userId: string, appointmentId: string, updates: Partial<Appointment>): Promise<Appointment[]> {
    const realUid = await this.getAuthUserId();
    if (realUid) {
      await supabase
        .from('appointments')
        .update(updates)
        .eq('id', appointmentId)
        .eq('user_id', realUid);
      return this.getAppointments(userId);
    }
    return MockDatabase.updateAppointment(userId, appointmentId, updates);
  }

  // 19. ATUALIZAR PRODUTO DO USUÁRIO (ex: favorito)
  static async updateUserProduct(userId: string, productId: string, updates: Partial<UserProduct>): Promise<UserProduct[]> {
    const realUid = await this.getAuthUserId();
    if (realUid) {
      const { error } = await supabase
        .from('user_products')
        .update(updates)
        .eq('id', productId)
        .eq('user_id', realUid);
      if (!error) {
        return this.getUserProducts(userId);
      }
    }
    return MockDatabase.updateUserProduct(userId, productId, updates);
  }

  // 20. LEITURA FACIAL (FACIAL SCANS)
  static async getFacialScans(userId: string): Promise<any[]> {
    const realUid = await this.getAuthUserId();
    if (realUid) {
      const { data, error } = await supabase
        .from('facial_scans')
        .select('*')
        .eq('user_id', realUid)
        .order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    return MockDatabase.getFacialScans(userId);
  }

  static async addFacialScan(userId: string, scanResult: any): Promise<void> {
    const realUid = await this.getAuthUserId();
    if (realUid) {
      const { error } = await supabase
        .from('facial_scans')
        .insert({ user_id: realUid, ...scanResult });
      if (!error) return;
    }
    await MockDatabase.addFacialScan(userId, scanResult);
  }

  static async deleteFacialScans(userId: string): Promise<void> {
    const realUid = await this.getAuthUserId();
    if (realUid) {
      const { error } = await supabase
        .from('facial_scans')
        .delete()
        .eq('user_id', realUid);
      if (!error) return;
    }
    await MockDatabase.deleteFacialScans(userId);
  }

  static async incrementScanCount(userId: string): Promise<boolean> {
    const now = new Date();
    await this.updateProfile(userId, { last_scan_date: now.toISOString() });
    return true;
  }

  // Adiciona créditos avulso após compra do pacote topup
  static async addTopupCredits(userId: string, scans: number, searches: number): Promise<void> {
    const profile = await this.getProfile(userId);
    await this.updateProfile(userId, {
      topup_scans:    (profile.topup_scans    ?? 0) + scans,
      topup_searches: (profile.topup_searches ?? 0) + searches,
    });
  }
}
