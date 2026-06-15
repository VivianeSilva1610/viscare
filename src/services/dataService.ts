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
      return { success: false, routineSteps: [], error: 'Skin profile quiz not completed yet.' };
    }
    if (userProducts.length === 0) {
      return { success: false, routineSteps: [], error: 'No products in cabinet.' };
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

    // SIMULAÇÃO DE IA OFFLINE/MOCK (Inteligente e em conformidade com as regras de ordem dermatológica)
    // Ordem padrão: cleanser -> toner -> treatment -> moisturizer -> SPF (apenas AM)
    const orderMap = {
      cleanser: 1,
      toner: 2,
      treatment: 3,
      moisturizer: 4,
      spf: 5
    };

    // Filtrar produtos cabíveis para a rotina
    const validProducts = userProducts.filter(p => {
      const cat = p.custom_category.toLowerCase();
      // Não incluir SPF na rotina PM
      if (type === 'PM' && cat === 'spf') return false;
      return true;
    });

    if (validProducts.length === 0) {
      return { success: false, routineSteps: [], error: 'No suitable products found for this routine.' };
    }

    // Ordenar os produtos usando a ordem dermatológica regulamentada
    const sortedProducts = [...validProducts].sort((a, b) => {
      const orderA = orderMap[a.custom_category] || 99;
      const orderB = orderMap[b.custom_category] || 99;
      return orderA - orderB;
    });

    // Mapear para passos de rotina
    const recommendedSteps = sortedProducts.map((p, index) => {
      let note = '';
      if (p.custom_category === 'cleanser') {
        note = type === 'AM' ? 'Pulisci delicatamente il viso per iniziare la giornata.' : 'Rimuovi le impurità e il trucco accumulati.';
      } else if (p.custom_category === 'toner') {
        note = 'Applica picchiettando per ripristinare il pH.';
      } else if (p.custom_category === 'treatment') {
        note = 'Usa una piccola quantità e massaggia con cura.';
      } else if (p.custom_category === 'moisturizer') {
        note = 'Massaggia per sigillare l\'idratazione.';
      } else if (p.custom_category === 'spf') {
        note = 'Protezione solare obbligatoria al mattino. Riapplica durante il giorno.';
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

  static async incrementScanCount(userId: string): Promise<boolean> {
    const realUid = await this.getAuthUserId();
    if (realUid) {
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
        count = 0;
      }
      
      const isUnlimitedUser = profile.email?.toLowerCase() === 'viroedu@gmail.com';
      if (count >= 2 && !isUnlimitedUser) {
        return false;
      }
      await this.updateProfile(userId, {
        scans_count_this_month: count + 1,
        last_scan_date: now.toISOString()
      });
      return true;
    }
    return MockDatabase.incrementScanCount(userId);
  }
}
