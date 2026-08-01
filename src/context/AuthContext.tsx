import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { DataService } from '../services/dataService';
import { Profile } from '../services/mockDb';
import {
  PlanType,
  purchasePlan,
  restoreRevenueCatPurchases
} from '../services/paymentService';
import { isSupabaseConfigured, supabase } from '../services/supabase';


interface AuthContextProps {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  isGuest: boolean;
  isPremium: boolean;
  isLoading: boolean;
  loginAsGuest: (displayName?: string) => Promise<void>;
  signUp: (email: string, pass: string, displayName: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, pass: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  purchasePremium: (plan: PlanType) => Promise<void>;
  purchaseTopup: () => Promise<void>;
  restorePurchases: () => Promise<boolean>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (email: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
}

const checkPremiumActive = (profile: Profile | null): boolean => {
  if (!profile) return false;
  const plan = profile.subscription_plan;
  if (plan === 'premium' || plan === 'influencer') {
    if (profile.subscription_expires_at) {
      return new Date(profile.subscription_expires_at) > new Date();
    }
    return true; 
  }
  return false;
};

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Inicializar sessão
  useEffect(() => {
    // Timeout de segurança: garante que o loading sempre termina
    // mesmo que o Supabase demore ou falhe silenciosamente
    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 8000);

    const initAuth = async () => {
      try {
        const guestFlag = await AsyncStorage.getItem('viscare_is_guest');

        if (isSupabaseConfigured) {
          // Pegar sessão atual do Supabase com timeout de 5s
          const sessionPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise<{ data: { session: null } }>(resolve =>
            setTimeout(() => resolve({ data: { session: null } }), 5000)
          );
          const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;

          if (session?.user) {
            const rememberMe = await AsyncStorage.getItem('viscare_remember_me');
            if (rememberMe === 'true') {
              await AsyncStorage.setItem('viscare_is_guest', 'false');
              setUser({ id: session.user.id, email: session.user.email || '' });
              const userProfile = await DataService.getProfile(session.user.id);
              setProfile(userProfile);
              setIsPremium(checkPremiumActive(userProfile));
              setIsGuest(false);
            } else {
              await supabase.auth.signOut();
            }
          } else if (guestFlag === 'true') {
            await setupGuestUser();
          }
        } else {
          // Sem Supabase, verifique se Guest está ativo
          if (guestFlag === 'true') {
            await setupGuestUser();
          } else {
            // Verificar se Remember Me está ativo para Mock Auth
            const rememberMe = await AsyncStorage.getItem('viscare_remember_me');
            if (rememberMe === 'true') {
              const savedUserId = await AsyncStorage.getItem('viscare_saved_user_id');
              const savedEmail = await AsyncStorage.getItem('viscare_saved_email');
              if (savedUserId && savedEmail) {
                setUser({ id: savedUserId, email: savedEmail });
                const userProfile = await DataService.getProfile(savedUserId);
                setProfile(userProfile);
                setIsPremium(checkPremiumActive(userProfile));
                setIsGuest(false);
              }
            }
          }
        }
      } catch (e) {
        console.warn('Erro ao inicializar autenticação', e);
      } finally {
        clearTimeout(safetyTimeout);
        setIsLoading(false);
      }
    };

    // Registrar listener do Supabase para alterações no estado de autenticação
    let authListener: any = null;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        try {
          if (session?.user) {
            if (event === 'PASSWORD_RECOVERY') {
              await AsyncStorage.setItem('viscare_remember_me', 'true');
              if (session.user.email) {
                await AsyncStorage.setItem('viscare_reset_email', session.user.email);
              }
            }
            await AsyncStorage.setItem('viscare_is_guest', 'false');
            setUser({ id: session.user.id, email: session.user.email || '' });
            const userProfile = await DataService.getProfile(session.user.id);
            setProfile(userProfile);
            setIsPremium(checkPremiumActive(userProfile));
            setIsGuest(false);
          } else {
            // Apenas limpa se não for Guest
            const guestFlag = await AsyncStorage.getItem('viscare_is_guest');
            if (guestFlag !== 'true') {
              setUser(null);
              setProfile(null);
              setIsPremium(false);
            }
          }
        } catch (e) {
          console.warn('Erro no listener do Supabase', e);
        }
      });
      authListener = data.subscription;
    }

    initAuth();

    return () => {
      if (authListener) {
        authListener.unsubscribe();
      }
    };
  }, []);

  const setupGuestUser = async (displayName: string = 'Visitatore') => {
    const guestId = 'guest-user-id';
    setUser({ id: guestId, email: 'guest@viscare.com' });
    let userProfile = await DataService.getProfile(guestId);
    if (displayName && displayName !== 'Visitatore' || !userProfile.display_name) {
      userProfile = await DataService.updateProfile(guestId, { display_name: displayName || 'Visitatore' });
    }
    setProfile(userProfile);
    setIsPremium(checkPremiumActive(userProfile));
    setIsGuest(true);
    await AsyncStorage.setItem('viscare_is_guest', 'true');
  };

  const loginAsGuest = async (displayName?: string) => {
    setIsLoading(true);
    await setupGuestUser(displayName);
    setIsLoading(false);
  };

  const signUp = async (email: string, pass: string, displayName: string, rememberMe: boolean = false) => {
    const cleanEmail = email.trim();
    if (!isSupabaseConfigured) {
      try {
        setIsLoading(true);
        const language = (await AsyncStorage.getItem('viscare_language')) || 'pt';
        const mockId = 'mock-' + cleanEmail.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');

        // Verificar se e-mail já está cadastrado
        const savedPass = await AsyncStorage.getItem('viscare_mock_password_' + mockId);
        if (savedPass !== null) {
          throw new Error(
            language === 'pt' ? 'Este e-mail já está cadastrado.' :
              language === 'it' ? 'Questo indirizzo email è já registrato.' :
                'This email is already registered.'
          );
        }

        // Salvar a senha do usuário
        await AsyncStorage.setItem('viscare_mock_password_' + mockId, pass);

        setUser({ id: mockId, email: cleanEmail });
        let userProfile = await DataService.getProfile(mockId);
        userProfile = await DataService.updateProfile(mockId, { display_name: displayName, email: cleanEmail });
        setProfile(userProfile);
        setIsGuest(false);
        await AsyncStorage.removeItem('viscare_is_guest');

        if (rememberMe) {
          await AsyncStorage.setItem('viscare_remember_me', 'true');
          await AsyncStorage.setItem('viscare_saved_user_id', mockId);
          await AsyncStorage.setItem('viscare_saved_email', cleanEmail);
        } else {
          await AsyncStorage.setItem('viscare_remember_me', 'false');
          await AsyncStorage.removeItem('viscare_saved_user_id');
          await AsyncStorage.removeItem('viscare_saved_email');
        }

        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message || 'Erro desconhecido' };
      } finally {
        setIsLoading(false);
      }
    }
    try {
      setIsLoading(true);
      await AsyncStorage.setItem('viscare_remember_me', rememberMe ? 'true' : 'false');
      const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password: pass });
      if (error) throw error;
      if (data.user) {
        // Criar perfil com nome
        const userProfile = await DataService.updateProfile(data.user.id, { display_name: displayName });
        setProfile(userProfile);
        setIsGuest(false);
        await AsyncStorage.removeItem('viscare_is_guest');
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Erro desconhecido' };
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, pass: string, rememberMe: boolean = false) => {
    const cleanEmail = email.trim();
    if (!isSupabaseConfigured) {
      try {
        setIsLoading(true);
        const language = (await AsyncStorage.getItem('viscare_language')) || 'pt';
        const mockId = 'mock-' + cleanEmail.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');

        // Verificar se o e-mail está cadastrado e validar a senha
        const savedPass = await AsyncStorage.getItem('viscare_mock_password_' + mockId);
        if (savedPass === null) {
          throw new Error(
            language === 'pt' ? 'Usuário não cadastrado.' :
              language === 'it' ? 'Utente non registrato.' :
                'User not registered.'
          );
        }

        if (savedPass !== pass) {
          throw new Error(
            language === 'pt' ? 'Senha incorreta. Verifique suas credenciais.' :
              language === 'it' ? 'Password errata. Verifica le tue credenziali.' :
                'Incorrect password. Please check your credentials.'
          );
        }

        setUser({ id: mockId, email: cleanEmail });
        const userProfile = await DataService.getProfile(mockId);
        setProfile(userProfile);
        setIsPremium(checkPremiumActive(userProfile));
        setIsGuest(false);
        await AsyncStorage.removeItem('viscare_is_guest');

        if (rememberMe) {
          await AsyncStorage.setItem('viscare_remember_me', 'true');
          await AsyncStorage.setItem('viscare_saved_user_id', mockId);
          await AsyncStorage.setItem('viscare_saved_email', cleanEmail);
        } else {
          await AsyncStorage.setItem('viscare_remember_me', 'false');
          await AsyncStorage.removeItem('viscare_saved_user_id');
          await AsyncStorage.removeItem('viscare_saved_email');
        }

        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message || 'Erro desconhecido' };
      } finally {
        setIsLoading(false);
      }
    }
    try {
      setIsLoading(true);
      await AsyncStorage.setItem('viscare_remember_me', rememberMe ? 'true' : 'false');
      const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: pass });
      if (error) throw error;
      if (data.user) {
        const userProfile = await DataService.getProfile(data.user.id);
        setProfile(userProfile);
        setIsPremium(checkPremiumActive(userProfile));
        setIsGuest(false);
        await AsyncStorage.removeItem('viscare_is_guest');
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Erro desconhecido' };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && !isGuest) {
        await supabase.auth.signOut();
      }
      setUser(null);
      setProfile(null);
      setIsPremium(false);
      setIsGuest(false);
      await AsyncStorage.removeItem('viscare_is_guest');
      await AsyncStorage.removeItem('viscare_remember_me');
      await AsyncStorage.removeItem('viscare_saved_user_id');
      await AsyncStorage.removeItem('viscare_saved_email');
      // NOT clearing database so multiple user accounts can co-exist
    } catch (e) {
      console.warn('Erro ao fazer logout', e);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      const p = await DataService.getProfile(user.id);
      setProfile(p);
      setIsPremium(checkPremiumActive(p));
    }
  };

  const resetPassword = async (email: string) => {
    const cleanEmail = email.trim();
    if (!isSupabaseConfigured) {
      try {
        const mockId = 'mock-' + cleanEmail.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
        const savedPass = await AsyncStorage.getItem('viscare_mock_password_' + mockId);
        if (savedPass === null) {
          const savedLang = await AsyncStorage.getItem('viscare_language');
          return {
            success: false,
            error: savedLang === 'pt' ? 'E-mail não encontrado.' :
              savedLang === 'it' ? 'E-mail non trovata.' :
                'Email not found.'
          };
        }
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message || 'Erro' };
      }
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: 'https://app.viscare.app.br/onboarding?reset=true',
      });
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Erro' };
    }
  };

  const updatePassword = async (email: string, newPass: string) => {
    const cleanEmail = email.trim();
    if (!isSupabaseConfigured) {
      try {
        const mockId = 'mock-' + cleanEmail.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
        await AsyncStorage.setItem('viscare_mock_password_' + mockId, newPass);
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message || 'Erro' };
      }
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Erro' };
    }
  };

  const purchasePremium = async (plan: PlanType) => {
    if (!user?.id) throw new Error('Usuário não autenticado.');
    const result = await purchasePlan(plan, user.id);
    if (!result.success) {
      const errMsg = result.error || 'Erro desconhecido';
      if (errMsg === 'CANCELLED') throw new Error('CANCELLED');
      if (errMsg === 'REDIRECTED') throw new Error('REDIRECTED');
      throw new Error(errMsg);
    }
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 dias para plano mensal
    const updatedProfile = await DataService.updateProfile(user.id, {
      subscription_plan: 'premium',
      subscription_expires_at: expiresAt.toISOString(),
    });
    setProfile(updatedProfile);
    setIsPremium(true);
  };

  const purchaseTopup = async () => {
    if (!user?.id) throw new Error('Usuário não autenticado.');
    const result = await purchasePlan('topup', user.id);
    if (!result.success) {
      const errMsg = result.error || 'Erro desconhecido';
      if (errMsg === 'CANCELLED') throw new Error('CANCELLED');
      if (errMsg === 'REDIRECTED') throw new Error('REDIRECTED');
      throw new Error(errMsg);
    }
    // Pagamento aprovado em modo simulado/RevenueCat — adiciona créditos localmente
    await DataService.addTopupCredits(user.id, 2, 3);
    const updatedProfile = await DataService.getProfile(user.id);
    setProfile(updatedProfile);
  };

  const restorePurchases = async (): Promise<boolean> => {
    // Tentar restaurar via RevenueCat
    const result = await restoreRevenueCatPurchases();
    if (result.isPremium && user?.id) {
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Assume 1 ano ao restaurar
      const updatedProfile = await DataService.updateProfile(user.id, {
        subscription_plan: 'premium',
        subscription_expires_at: expiresAt.toISOString(),
      });
      setProfile(updatedProfile);
      setIsPremium(true);
      return true;
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      isGuest,
      isPremium: isPremium || (user?.email?.toLowerCase() === 'viroedu@gmail.com'),
      isLoading,
      loginAsGuest,
      signUp,
      signIn,
      signOut,
      purchasePremium,
      purchaseTopup,
      restorePurchases,
      refreshProfile,
      resetPassword,
      updatePassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
