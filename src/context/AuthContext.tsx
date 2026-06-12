import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { DataService } from '../services/dataService';
import { Profile, MockDatabase } from '../services/mockDb';


interface AuthContextProps {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  isGuest: boolean;
  isPremium: boolean;
  isLoading: boolean;
  loginAsGuest: (displayName?: string) => Promise<void>;
  signUp: (email: string, pass: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  purchasePremium: (plan: 'monthly' | 'yearly') => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Inicializar sessão
  useEffect(() => {
    const initAuth = async () => {
      try {
        const guestFlag = await AsyncStorage.getItem('viscare_is_guest');
        
        if (isSupabaseConfigured) {
          // Pegar sessão atual do Supabase
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            setUser({ id: session.user.id, email: session.user.email || '' });
            const userProfile = await DataService.getProfile(session.user.id);
            setProfile(userProfile);
            setIsPremium(userProfile.subscription_plan === 'premium');
            setIsGuest(false);
          } else if (guestFlag === 'true') {
            await setupGuestUser();
          }
        } else {
          // Sem Supabase, verifique se Guest está ativo
          if (guestFlag === 'true') {
            await setupGuestUser();
          }
        }
      } catch (e) {
        console.warn('Erro ao inicializar autenticação', e);
      } finally {
        setIsLoading(false);
      }
    };

    // Registrar listener do Supabase para alterações no estado de autenticação
    let authListener: any = null;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email || '' });
          const userProfile = await DataService.getProfile(session.user.id);
          setProfile(userProfile);
          setIsPremium(userProfile.subscription_plan === 'premium');
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
    setIsPremium(userProfile.subscription_plan === 'premium');
    setIsGuest(true);
    await AsyncStorage.setItem('viscare_is_guest', 'true');
  };

  const loginAsGuest = async (displayName?: string) => {
    setIsLoading(true);
    await setupGuestUser(displayName);
    setIsLoading(false);
  };

  const signUp = async (email: string, pass: string, displayName: string) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase real não está configurado. Cadastre-se como visitante o defina suas chaves.' };
    }
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signUp({ email, password: pass });
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

  const signIn = async (email: string, pass: string) => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase real não está configurado. Faça login como visitante ou defina suas chaves.' };
    }
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      if (data.user) {
        const userProfile = await DataService.getProfile(data.user.id);
        setProfile(userProfile);
        setIsPremium(userProfile.subscription_plan === 'premium');
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
      await MockDatabase.clearAll(); // Opcional: limpa o storage local do mock
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
      setIsPremium(p.subscription_plan === 'premium');
    }
  };

  const purchasePremium = async (plan: 'monthly' | 'yearly') => {
    if (user?.id) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (plan === 'monthly' ? 30 : 365));
      
      const updatedProfile = await DataService.updateProfile(user.id, {
        subscription_plan: 'premium',
        subscription_expires_at: expiresAt.toISOString(),
      });
      setProfile(updatedProfile);
      setIsPremium(true);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      isGuest,
      isPremium,
      isLoading,
      loginAsGuest,
      signUp,
      signIn,
      signOut,
      purchasePremium,
      refreshProfile
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
