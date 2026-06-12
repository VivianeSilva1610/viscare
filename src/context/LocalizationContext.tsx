import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import { DataService } from '../services/dataService';

export type Language = 'it' | 'en' | 'pt';



interface LocalizationContextProps {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
}

const translations = {
  it: {
    // Onboarding - Welcome
    'welcome.title': 'Viscare',
    'welcome.subtitle': 'La tua spa-tech tascabile',
    'welcome.value_prop1': 'Crea routine personalizzate basate sulle tue esigenze reali.',
    'welcome.value_prop2': 'Controlla la compatibilità dei principi attivi ed evita irritazioni.',
    'welcome.value_prop3': 'Genera la tua routine ottimale grazie all\'Intelligenza Artificiale.',
    'welcome.disclaimer_title': 'Dichiarazione di Non Responsabilità Medica',
    'welcome.disclaimer_text': 'Viscare non fornisce consigli medici o diagnosi. Le informazioni fornite dall\'app, inclusi i suggerimenti dell\'IA e i controlli di compatibilità, sono puramente a scopo informativo e di cura personale. Consulta sempre un dermatologo professionista per qualsiasi dubbio o problema persistente della pelle.',
    'welcome.accept_disclaimer': 'Accetta ed Continua',
    'welcome.next': 'Continua',

    // Onboarding - Quiz
    'quiz.title': 'Quiz sulla Pelle',
    'quiz.subtitle': 'Aiutaci a conoscerti meglio',
    'quiz.age_question': 'Quanti anni hai?',
    'quiz.type_question': 'Qual è il tuo tipo di pelle?',
    'quiz.type_oily': 'Grassa',
    'quiz.type_dry': 'Secca',
    'quiz.type_combination': 'Mista',
    'quiz.type_normal': 'Normale',
    'quiz.sensitivity_question': 'La tua pelle è sensibile o si arrossa facilmente?',
    'quiz.sens_yes': 'Sì, molto sensibile',
    'quiz.sens_no': 'No, pelle resistente',
    'quiz.goals_question': 'Quali sono i tuoi obiettivi principali?',
    'quiz.goal_hydration': 'Idratazione',
    'quiz.goal_anti_aging': 'Antietà e Rughe',
    'quiz.goal_acne': 'Combattere l\'Acne',
    'quiz.goal_brightening': 'Illuminare / Macchie',
    'quiz.goal_barrier': 'Rafforzare la Barriera',
    'quiz.concerns_question': 'Quali sono le tue principali preoccupazioni?',
    'quiz.concern_redness': 'Arrossamento',
    'quiz.concern_dark_spots': 'Macchie scure',
    'quiz.concern_acne_scars': 'Cicatrici da acne',
    'quiz.concern_fine_lines': 'Linee sottili / Rughe',
    'quiz.concern_pores': 'Pori dilatati',
    'quiz.concern_dryness': 'Secchezza',
    'quiz.finish': 'Completa Quiz',

    // Onboarding - Notifications & Auth
    'notif.title': 'Resta Costante',
    'notif.text': 'Abilita le notifiche per ricordarti la routine AM (7:00), riapplicare l\'SPF (12:00) e la routine PM (22:00). La costanza è il segreto per una pelle radiosa.',
    'notif.enable': 'Abilita Notifiche',
    'notif.skip': 'Salta per Ora',
    'auth.title': 'Crea il tuo Account',
    'auth.subtitle': 'Salva i tuoi dati e sincronizzali su tutti i dispositivi',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.signin': 'Accedi',
    'auth.signup': 'Registrati',
    'auth.or': 'oppure continua con',
    'auth.google': 'Google',
    'auth.apple': 'Apple',
    'auth.guest': 'Continua come Ospite',

    // Home / Today
    'home.greeting_morning': 'Buongiorno, splendore',
    'home.greeting_afternoon': 'Buon pomeriggio',
    'home.greeting_evening': 'Buonasera',
    'home.streak': 'giorni consecutivi',
    'home.routine_am': 'Routine Mattutina',
    'home.routine_pm': 'Routine Serale',
    'home.checklist_empty': 'Nessun prodotto in questa routine. Vai alla scheda "Routine" per configurarla.',
    'home.complete_task': 'Completato!',
    'home.incomplete_task': 'Segna come fatto',

    // Routine
    'routine.tab_title': 'Le Mie Routine',
    'routine.generate_ai': 'Genera con l\'IA',
    'routine.generating': 'Generando...',
    'routine.empty_cabinet_warning': 'Aggiungi prima dei prodotti nel tuo Armadietto per generare una routine!',
    'routine.order_hint': 'Trascina o usa le frecce per riordinare i passaggi. L\'IA ordina automaticamente in base alle regole dermatologiche.',
    'routine.am_label': 'Mattina (AM)',
    'routine.pm_label': 'Sera (PM)',
    'routine.delete_step': 'Rimuovi',
    'routine.add_step': 'Aggiungi Prodotto',

    // Products
    'products.title': 'Il Mio Armadietto',
    'products.subtitle': 'I tuoi prodotti personali',
    'products.search_placeholder': 'Cerca nel catalogo...',
    'products.manual_title': 'Aggiungi Prodotto Manualmente',
    'products.name': 'Nome del Prodotto',
    'products.brand': 'Marchio',
    'products.category': 'Categoria',
    'products.active_ingredients': 'Principi Attivi principali (separati da virgola)',
    'products.add_button': 'Aggiungi all\'Armadietto',
    'products.delete': 'Elimina',
    'products.expiration': 'Scadenza (mesi dall\'apertura)',
    'products.opened': 'Aperto il',
    'products.limit_warning': 'Versione Gratuita: Limite di 5 prodotti raggiunto. Passa a Premium per sbloccare prigioni illimitate!',

    // Compatibility
    'compat.title': 'Verificatore di Compatibilità',
    'compat.safe': 'Compatibile',
    'compat.safe_desc': 'Tutti gli ingredienti attivi della tua routine lavorano in sinergia in modo sicuro!',
    'compat.caution': 'Attenzione',
    'compat.danger': 'Conflitto Rilevato',
    'compat.rules_title': 'Spiegazioni sulla Compatibilità',

    // Discover
    'discover.title': 'Esplora Ingredienti',
    'discover.subtitle': 'La scienza dietro la tua pelle',
    'discover.evidence': 'Livello di evidenza:',
    'discover.benefits': 'Benefici principali:',
    'discover.conflicts': 'Evitare con:',

    // Settings / Profile
    'settings.title': 'Profilo & Impostazioni',
    'settings.language': 'Lingua',
    'settings.premium_status': 'Piano Attuale:',
    'settings.free': 'Gratuito',
    'settings.premium': 'Premium',
    'settings.upgrade': 'Passa a Premium',
    'settings.delete_account': 'Elimina Account',
    'settings.delete_warning': 'Attenzione: Questa azione è permanente e conforme alla normativa LGPD/GDPR. Eliminerà per sempre tutti i tuoi dati, rotine e account.',
    'settings.delete_confirm': 'Sì, Elimina Tutto',
    'settings.logout': 'Disconnetti',
    'settings.privacy': 'Informativa sulla Privacy',
    'settings.terms': 'Termini di Servizio',

    // Paywall
    'paywall.title': 'Passa a Viscare Premium',
    'paywall.subtitle': 'Sblocca tutto il potenziale per la cura della tua pelle',
    'paywall.feat_unlimited': 'Routine e Prodotti illimitati (Free limit: 1 routine, 5 prodotti)',
    'paywall.feat_ai': 'Intelligenza Artificiale avanzata per routine personalizzate',
    'paywall.feat_journal': 'Diario della pelle e monitoraggio del progresso fotografico',
    'paywall.monthly': 'R$ 19,90 / Mese',
    'paywall.yearly': 'R$ 149,00 / Anno (Risparmi 37%)',
    'paywall.trial': 'Inizia Prova Gratuita di 7 Giorni',
    'paywall.restore': 'Ripristina Acquisti',
    'paywall.close': 'Chiudi'
  },
  en: {
    // Onboarding - Welcome
    'welcome.title': 'Viscare',
    'welcome.subtitle': 'Your pocket spa-tech companion',
    'welcome.value_prop1': 'Create personalized skincare routines based on your real needs.',
    'welcome.value_prop2': 'Check active ingredients compatibility and avoid irritation.',
    'welcome.value_prop3': 'Generate your optimal routine powered by Artificial Intelligence.',
    'welcome.disclaimer_title': 'Medical Disclaimer',
    'welcome.disclaimer_text': 'Viscare does not provide medical advice or diagnosis. The information provided by the app, including AI suggestions and compatibility checks, is purely for informational and self-care purposes. Always consult a professional dermatologist for any concerns or persistent skin issues.',
    'welcome.accept_disclaimer': 'Accept & Continue',
    'welcome.next': 'Continue',

    // Onboarding - Quiz
    'quiz.title': 'Skin Quiz',
    'quiz.subtitle': 'Help us know you better',
    'quiz.age_question': 'How old are you?',
    'quiz.type_question': 'What is your skin type?',
    'quiz.type_oily': 'Oily',
    'quiz.type_dry': 'Dry',
    'quiz.type_combination': 'Combination',
    'quiz.type_normal': 'Normal',
    'quiz.sensitivity_question': 'Is your skin sensitive or does it flush easily?',
    'quiz.sens_yes': 'Yes, very sensitive',
    'quiz.sens_no': 'No, resilient skin',
    'quiz.goals_question': 'What are your main goals?',
    'quiz.goal_hydration': 'Hydration',
    'quiz.goal_anti_aging': 'Anti-aging & Wrinkles',
    'quiz.goal_acne': 'Clear Acne',
    'quiz.goal_brightening': 'Brightening / Dark Spots',
    'quiz.goal_barrier': 'Strengthen Barrier',
    'quiz.concerns_question': 'What are your main concerns?',
    'quiz.concern_redness': 'Redness',
    'quiz.concern_dark_spots': 'Dark spots',
    'quiz.concern_acne_scars': 'Acne scars',
    'quiz.concern_fine_lines': 'Fine lines / Wrinkles',
    'quiz.concern_pores': 'Enlarged pores',
    'quiz.concern_dryness': 'Dryness',
    'quiz.finish': 'Finish Quiz',

    // Onboarding - Notifications & Auth
    'notif.title': 'Stay Consistent',
    'notif.text': 'Enable notifications to remind you of your AM routine (7:00), SPF reapplication (12:00), and PM routine (22:00). Consistency is key to glowing skin.',
    'notif.enable': 'Enable Notifications',
    'notif.skip': 'Skip for Now',
    'auth.title': 'Create your Account',
    'auth.subtitle': 'Save your data and sync across devices',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.signin': 'Sign In',
    'auth.signup': 'Sign Up',
    'auth.or': 'or continue with',
    'auth.google': 'Google',
    'auth.apple': 'Apple',
    'auth.guest': 'Continue as Guest',

    // Home / Today
    'home.greeting_morning': 'Good morning, sunshine',
    'home.greeting_afternoon': 'Good afternoon',
    'home.greeting_evening': 'Good evening',
    'home.streak': 'day streak',
    'home.routine_am': 'Morning Routine',
    'home.routine_pm': 'Evening Routine',
    'home.checklist_empty': 'No products in this routine. Go to "Routine" tab to set it up.',
    'home.complete_task': 'Completed!',
    'home.incomplete_task': 'Mark as done',

    // Routine
    'routine.tab_title': 'My Routines',
    'routine.generate_ai': 'Generate with AI',
    'routine.generating': 'Generating...',
    'routine.empty_cabinet_warning': 'Add some products to your Cabinet first to generate a routine!',
    'routine.order_hint': 'Drag or use arrows to reorder steps. AI orders automatically based on dermatological rules.',
    'routine.am_label': 'Morning (AM)',
    'routine.pm_label': 'Night (PM)',
    'routine.delete_step': 'Remove',
    'routine.add_step': 'Add Product',

    // Products
    'products.title': 'My Cabinet',
    'products.subtitle': 'Your personal skincare products',
    'products.search_placeholder': 'Search in catalog...',
    'products.manual_title': 'Add Product Manually',
    'products.name': 'Product Name',
    'products.brand': 'Brand',
    'products.category': 'Category',
    'products.active_ingredients': 'Active Ingredients (comma separated)',
    'products.add_button': 'Add to Cabinet',
    'products.delete': 'Delete',
    'products.expiration': 'Expiration (months after opening)',
    'products.opened': 'Opened on',
    'products.limit_warning': 'Free Tier: Limit of 5 products reached. Upgrade to Premium for unlimited cabinet size!',

    // Compatibility
    'compat.title': 'Compatibility Checker',
    'compat.safe': 'Compatible',
    'compat.safe_desc': 'All active ingredients in your routine work together safely!',
    'compat.caution': 'Caution',
    'compat.danger': 'Conflict Detected',
    'compat.rules_title': 'Compatibility Explanations',

    // Discover
    'discover.title': 'Explore Ingredients',
    'discover.subtitle': 'The science behind your skin',
    'discover.evidence': 'Evidence level:',
    'discover.benefits': 'Main benefits:',
    'discover.conflicts': 'Avoid combining with:',

    // Settings / Profile
    'settings.title': 'Profile & Settings',
    'settings.language': 'Language',
    'settings.premium_status': 'Current Plan:',
    'settings.free': 'Free',
    'settings.premium': 'Premium',
    'settings.upgrade': 'Upgrade to Premium',
    'settings.delete_account': 'Delete Account',
    'settings.delete_warning': 'Warning: This action is permanent and GDPR/LGPD compliant. It will forever delete all your data, routines, and account.',
    'settings.delete_confirm': 'Yes, Delete Everything',
    'settings.logout': 'Log Out',
    'settings.privacy': 'Privacy Policy',
    'settings.terms': 'Terms of Service',

    // Paywall
    'paywall.title': 'Upgrade to Viscare Premium',
    'paywall.subtitle': 'Unlock the full potential of your skin care',
    'paywall.feat_unlimited': 'Unlimited routines & products (Free: 1 routine, 5 products)',
    'paywall.feat_ai': 'Advanced AI for personalized routine generation',
    'paywall.feat_journal': 'Skin diary and photo progress tracking',
    'paywall.monthly': 'R$ 19.90 / Month',
    'paywall.yearly': 'R$ 149.00 / Year (Save 37%)',
    'paywall.trial': 'Start 7-Day Free Trial',
    'paywall.restore': 'Restore Purchases',
    'paywall.close': 'Close'
  },
  pt: {
    // Onboarding - Welcome
    'welcome.title': 'Viscare',
    'welcome.subtitle': 'Sua spa-tech de bolso',
    'welcome.value_prop1': 'Crie rotinas de cuidados personalizadas com base em suas necessidades reais.',
    'welcome.value_prop2': 'Verifique a compatibilidade dos ingredientes ativos e evite irritações.',
    'welcome.value_prop3': 'Gere sua rotina ideal potencializada por Inteligência Artificial.',
    'welcome.disclaimer_title': 'Aviso de Isenção de Responsabilidade Médica',
    'welcome.disclaimer_text': 'O Viscare não fornece aconselhamento médico ou diagnóstico. As informações fornecidas pelo aplicativo, incluindo sugestões de IA e verificações de compatibilidade, são puramente para fins informativos e de autocuidado. Sempre consulte um dermatologista profissional para qualquer dúvida ou problema persistente na pele.',
    'welcome.accept_disclaimer': 'Aceitar e Continuar',
    'welcome.next': 'Continuar',

    // Onboarding - Quiz
    'quiz.title': 'Quiz da Pele',
    'quiz.subtitle': 'Ajude-nos a te conhecer melhor',
    'quiz.age_question': 'Qual é a sua idade?',
    'quiz.type_question': 'Qual é o seu tipo de pele?',
    'quiz.type_oily': 'Oleosa',
    'quiz.type_dry': 'Seca',
    'quiz.type_combination': 'Mista',
    'quiz.type_normal': 'Normal',
    'quiz.sensitivity_question': 'Sua pele é sensível ou fica vermelha facilmente?',
    'quiz.sens_yes': 'Sim, muito sensível',
    'quiz.sens_no': 'Não, pele resistente',
    'quiz.goals_question': 'Quais são os seus principais objetivos?',
    'quiz.goal_hydration': 'Hidratação',
    'quiz.goal_anti_aging': 'Antienvelhecimento / Rugas',
    'quiz.goal_acne': 'Combater Acne',
    'quiz.goal_brightening': 'Iluminar / Manchas',
    'quiz.goal_barrier': 'Fortalecer Barreira',
    'quiz.concerns_question': 'Quais são as suas principais preocupações?',
    'quiz.concern_redness': 'Vermelhidão',
    'quiz.concern_dark_spots': 'Manchas escuras',
    'quiz.concern_acne_scars': 'Cicatrizes de acne',
    'quiz.concern_fine_lines': 'Linhas finas / Rugas',
    'quiz.concern_pores': 'Poros dilatados',
    'quiz.concern_dryness': 'Ressecamento',
    'quiz.finish': 'Concluir Quiz',

    // Onboarding - Notifications & Auth
    'notif.title': 'Mantenha a Constância',
    'notif.text': 'Ative as notificações para lembrá-lo da rotina matinal (7:00), reaplicação do protetor solar (12:00) e rotina noturna (22:00). A constância é o segredo para uma pele radiante.',
    'notif.enable': 'Ativar Notificações',
    'notif.skip': 'Pular por Enquanto',
    'auth.title': 'Crie sua Conta',
    'auth.subtitle': 'Salve seus dados e sincronize em todos os dispositivos',
    'auth.email': 'E-mail',
    'auth.password': 'Senha',
    'auth.signin': 'Entrar',
    'auth.signup': 'Cadastrar',
    'auth.or': 'ou continue com',
    'auth.google': 'Google',
    'auth.apple': 'Apple',
    'auth.guest': 'Continuar como Convidado',

    // Home / Today
    'home.greeting_morning': 'Bom dia, brilho do dia',
    'home.greeting_afternoon': 'Boa tarde',
    'home.greeting_evening': 'Boa noite',
    'home.streak': 'dias seguidos',
    'home.routine_am': 'Rotina da Manhã',
    'home.routine_pm': 'Rotina da Noite',
    'home.checklist_empty': 'Nenhum produto nesta rotina. Vá para a aba "Rotina" para configurá-la.',
    'home.complete_task': 'Concluído!',
    'home.incomplete_task': 'Marcar como feito',

    // Routine
    'routine.tab_title': 'Minhas Rotinas',
    'routine.generate_ai': 'Gerar com IA',
    'routine.generating': 'Gerando...',
    'routine.empty_cabinet_warning': 'Adicione alguns produtos ao seu Armário primeiro para gerar uma rotina!',
    'routine.order_hint': 'Arraste ou use as setas para reordenar os passos. A IA ordena automaticamente com base em regras dermatológicas.',
    'routine.am_label': 'Manhã (AM)',
    'routine.pm_label': 'Noite (PM)',
    'routine.delete_step': 'Remover',
    'routine.add_step': 'Adicionar Produto',

    // Products
    'products.title': 'Meu Armário',
    'products.subtitle': 'Seus produtos pessoais de skincare',
    'products.search_placeholder': 'Buscar no catálogo...',
    'products.manual_title': 'Adicionar Produto Manualmente',
    'products.name': 'Nome do Produto',
    'products.brand': 'Marca',
    'products.category': 'Categoria',
    'products.active_ingredients': 'Princípios Ativos principais (separados por vírgula)',
    'products.add_button': 'Adicionar ao Armário',
    'products.delete': 'Excluir',
    'products.expiration': 'Validade (meses após aberto)',
    'products.opened': 'Aberto em',
    'products.limit_warning': 'Versão Gratuita: Limite de 5 produtos atingido. Mude para o Premium para armário ilimitado!',

    // Compatibility
    'compat.title': 'Verificador de Compatibilidade',
    'compat.safe': 'Compatível',
    'compat.safe_desc': 'Todos os ingredientes ativos em sua rotina trabalham juntos com segurança!',
    'compat.caution': 'Atenção',
    'compat.danger': 'Conflito Detectado',
    'compat.rules_title': 'Explicações sobre Compatibilidade',

    // Discover
    'discover.title': 'Explorar Ingredientes',
    'discover.subtitle': 'A ciência por trás da sua pele',
    'discover.evidence': 'Nível de evidência:',
    'discover.benefits': 'Principais benefícios:',
    'discover.conflicts': 'Evitar combinar com:',

    // Settings / Profile
    'settings.title': 'Perfil & Configurações',
    'settings.language': 'Idioma',
    'settings.premium_status': 'Plano Atual:',
    'settings.free': 'Gratuito',
    'settings.premium': 'Premium',
    'settings.upgrade': 'Mudar para Premium',
    'settings.delete_account': 'Excluir Conta',
    'settings.delete_warning': 'Aviso: Esta ação é permanente e cumpre com as regras da LGPD/GDPR. Excluirá para sempre todos os seus dados, rotinas e conta.',
    'settings.delete_confirm': 'Sim, Excluir Tudo',
    'settings.logout': 'Sair',
    'settings.privacy': 'Política de Privacidade',
    'settings.terms': 'Termos de Serviço',

    // Paywall
    'paywall.title': 'Mude para o Viscare Premium',
    'paywall.subtitle': 'Desbloqueie todo o potencial dos seus cuidados com a pele',
    'paywall.feat_unlimited': 'Rotinas e produtos ilimitados (Gratuito: 1 rotina, 5 produtos)',
    'paywall.feat_ai': 'Inteligência Artificial avançada para gerar rotinas personalizadas',
    'paywall.feat_journal': 'Diário de pele e rastreamento de progresso com fotos',
    'paywall.monthly': 'R$ 19,90 / Mês',
    'paywall.yearly': 'R$ 149,00 / Ano (Economize 37%)',
    'paywall.trial': 'Iniciar Teste Grátis de 7 Dias',
    'paywall.restore': 'Restaurar Compras',
    'paywall.close': 'Fechar'
  }
};

const LocalizationContext = createContext<LocalizationContextProps | undefined>(undefined);

export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('it');

  useEffect(() => {
    // Carregar idioma salvo ao iniciar
    const loadLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('viscare_language');
        if (savedLang === 'it' || savedLang === 'en' || savedLang === 'pt') {
          setLanguageState(savedLang);
        }
      } catch (e) {
        console.warn('Erro ao carregar idioma', e);
      }
    };
    loadLanguage();
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem('viscare_language', lang);
      // Sincronizar com perfil se logado no Supabase
      const { data } = await supabase.auth.getSession();
      if (data.session?.user?.id) {
        await DataService.updateProfile(data.session.user.id, { language: lang });
      }
    } catch (e) {
      console.warn('Erro ao salvar idioma', e);
    }
  };

  const t = (key: string): string => {
    const dict = translations[language] || translations['it'];
    return dict[key as keyof typeof dict] || key;
  };

  return (
    <LocalizationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useTranslation deve ser utilizado dentro de um LocalizationProvider');
  }
  return context;
};
