import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator, Modal, TextInput, Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTranslation, Language } from '../../context/LocalizationContext';
import { DataService } from '../../services/dataService';
import { NotificationService } from '../../services/notifications';
import { Reminder } from '../../services/mockDb';
import { Globe, Bell, Star, Trash2, LogOut, ChevronRight, ShieldAlert, Sparkles, Lock, X, CheckCircle2, Download, BarChart2 } from 'lucide-react-native';
import { supabase } from '../../services/supabase';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

export default function SettingsScreen() {
  const { user, isPremium, signOut, refreshProfile, updatePassword } = useAuth();
  const { t, language, setLanguage } = useTranslation();
  const router = useRouter();

  // Termos/Privacidade agora vivem no site de vendas (viscare.app.br), não no app —
  // sempre abre externamente, em qualquer plataforma.
  const handleOpenPrivacy = async () => {
    if (Platform.OS === 'web') {
      window.open('https://viscare.app.br/privacy', '_blank');
    } else {
      await WebBrowser.openBrowserAsync('https://viscare.app.br/privacy');
    }
  };

  const handleOpenTerms = async () => {
    if (Platform.OS === 'web') {
      window.open('https://viscare.app.br/terms', '_blank');
    } else {
      await WebBrowser.openBrowserAsync('https://viscare.app.br/terms');
    }
  };

  const [loading, setLoading] = useState<boolean>(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Admin Dashboard
  const [adminReport, setAdminReport] = useState<any>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const isAdmin = user?.email?.toLowerCase() === 'viroedu@gmail.com';

  const loadAdminReport = async () => {
    if (!isAdmin) return;
    setLoadingAdmin(true);
    try {
      const { data, error } = await supabase.functions.invoke('agent-admin');
      if (!error && data) setAdminReport(data);
    } catch (e) {
      console.warn('Erro admin:', e);
    } finally {
      setLoadingAdmin(false);
    }
  };

  const loadReminders = async () => {
    if (!user) return;
    try {
      const data = await DataService.getReminders(user.id);
      setReminders(data);
    } catch (e) {
      console.warn('Erro ao carregar lembretes', e);
    }
  };

  useEffect(() => {
    loadReminders();
    refreshProfile();
  }, [user?.id]);

  // Alternar lembretes
  const toggleReminder = async (type: 'AM' | 'SPF' | 'PM', currentVal: boolean) => {
    if (!user) return;
    try {
      const updated = await DataService.updateReminder(user.id, type, { is_enabled: !currentVal });
      setReminders(updated);

      // Reconfigurar as notificações nativas de acordo
      const am = updated.find(r => r.type === 'AM')?.is_enabled;
      const spf = updated.find(r => r.type === 'SPF')?.is_enabled;
      const pm = updated.find(r => r.type === 'PM')?.is_enabled;

      if (!am && !spf && !pm) {
        await NotificationService.cancelAllReminders();
      } else {
        // Simplesmente reagenda. O app gerencia no disparador as que estiverem desabilitadas se necessário, 
        // ou desabilitamos o schedule total se o usuário desligou tudo.
        await NotificationService.scheduleDailyReminders(language);
        
        // Re-agendar os lembretes de tratamentos ativos do usuário
        try {
          const appointments = await DataService.getAppointments(user.id);
          const upcoming = appointments.filter(a => a.status === 'upcoming');
          for (const app of upcoming) {
            await NotificationService.scheduleAppointmentReminder(
              app.id,
              app.title,
              app.dateStr,
              app.time,
              app.location,
              language
            );
          }
        } catch (err) {
          console.warn('Erro ao re-agendar tratamentos após ativar notificações:', err);
        }
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // Apagar histórico de análises faciais (revoga consentimento biométrico)
  const handleDeleteScanHistory = () => {
    Alert.alert(
      t('settings.delete_scan_history'),
      t('settings.delete_scan_history_warning'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.delete_scan_history_confirm'),
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            setLoading(true);
            try {
              await DataService.deleteFacialScans(user.id);
              await DataService.updateProfile(user.id, { biometric_consent_at: null });
              Alert.alert(t('common.info'), t('settings.delete_scan_history_success'));
            } catch (e) {
              console.warn('Erro ao apagar histórico de análises:', e);
              Alert.alert(t('common.error'), t('common.connection_error'));
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Exportar meus dados (LGPD/GDPR — direito de portabilidade)
  const handleExportData = async () => {
    setLoading(true);
    try {
      const result = await DataService.exportUserData();
      if (result.success) {
        Alert.alert(t('common.info'), t('settings.export_data_success'));
      } else {
        Alert.alert(t('common.error'), t('settings.export_data_error'));
      }
    } catch (e) {
      console.warn('Erro ao exportar dados:', e);
      Alert.alert(t('common.error'), t('settings.export_data_error'));
    } finally {
      setLoading(false);
    }
  };

  // Tratar exclusão de conta (LGPD)
  const handleDeleteAccount = () => {
    Alert.alert(
      t('settings.delete_account'),
      t('settings.delete_warning'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.delete_confirm'),
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const success = await DataService.deleteAccount(user?.id || 'guest-user-id');
              if (success) {
                await signOut();
                router.replace('/onboarding');
              } else {
                Alert.alert(t('common.error'), t('alert.cannot_delete_account'));
              }
            } catch (e) {
              console.warn(e);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const changeLanguage = async (lang: Language) => {
    await setLanguage(lang);
    // Reconfigurar notificações com o novo idioma
    await NotificationService.scheduleDailyReminders(lang);

    // Re-agendar lembretes no novo idioma
    if (user) {
      try {
        const appointments = await DataService.getAppointments(user.id);
        const upcoming = appointments.filter(a => a.status === 'upcoming');
        for (const app of upcoming) {
          await NotificationService.scheduleAppointmentReminder(
            app.id,
            app.title,
            app.dateStr,
            app.time,
            app.location,
            lang
          );
        }
      } catch (err) {
        console.warn('Erro ao re-agendar lembretes no novo idioma:', err);
      }
    }
  };

  const handleManageSubscription = async () => {
    setLoading(true);
    const { url } = await DataService.createPortalSession();
    setLoading(false);
    if (url) {
      if (Platform.OS === 'web') {
        window.location.href = url;
      } else {
        const Linking = await import('react-native').then(m => m.Linking).catch(() => null);
        if (Linking) await Linking.openURL(url);
      }
      return;
    }
    // Sem stripe_customer_id (nunca assinou pelo web/Stripe: guest, mobile/RevenueCat, etc.)
    Alert.alert(
      t('common.info') || 'Info',
      language === 'pt'
        ? 'Para gerenciar ou cancelar sua assinatura, você pode utilizar o link "Gerenciar Assinatura" no e-mail de confirmação enviado pelo Stripe, ou entrar em contato com o suporte em suporte@viscare.app.'
        : language === 'it'
        ? 'Per gestire o annullare l\'abbonamento, puoi utilizzare il link "Gestisci abbonamento" nell\'e-mail di conferma inviata da Stripe, o contattare il supporto a supporto@viscare.app.'
        : 'To manage or cancel your subscription, please use the "Manage Subscription" link in the confirmation email sent by Stripe, or contact support at support@viscare.app.'
    );
  };

  const handleLogout = async () => {
    setLoading(true);
    await signOut();
    router.replace('/onboarding');
    setLoading(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert(t('common.error'), t('auth.error_fill'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.passwords_must_match'));
      return;
    }
    setSavingPassword(true);
    const res = await updatePassword(user?.email || '', newPassword);
    setSavingPassword(false);

    if (res.success) {
      Alert.alert(t('settings.change_password'), t('auth.reset_success_done'));
      setIsPasswordModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } else {
      Alert.alert(t('common.error'), res.error || 'Erro');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-ivory">
        <ActivityIndicator size="large" color="#B97C63" />
      </View>
    );
  }

  // Pegar estados individuais de lembretes
  const amReminder = reminders.find(r => r.type === 'AM');
  const spfReminder = reminders.find(r => r.type === 'SPF');
  const pmReminder = reminders.find(r => r.type === 'PM');

  return (
    <ScrollView className="flex-1 bg-brand-ivory px-6 pt-12">
      {/* Header */}
      <View className="py-4 mb-6 border-b border-brand-beige">
        <Text className="text-2xl font-serif text-brand-bronze font-bold">
          {t('settings.title')}
        </Text>
      </View>

      {/* Seção Premium */}
      <View className="bg-white p-5 rounded-[32px] border border-brand-beige shadow-sm mb-6">
        <View className="flex-row items-center space-x-3 mb-4">
          <Star size={24} color={isPremium ? '#B97C63' : '#D7A58D'} fill={isPremium ? '#B97C63' : 'transparent'} />
          <View>
            <Text className="font-serif text-base font-bold text-brand-charcoal">
              {t('settings.premium_status')}
            </Text>
            <Text className={`font-sans text-sm font-semibold ${isPremium ? 'text-brand-rose-metallic' : 'text-brand-charcoal/60'}`}>
              {isPremium ? t('settings.premium') : t('settings.free')}
            </Text>
          </View>
        </View>

        {!isPremium ? (
          <>
            <View className="mb-5 space-y-2 pt-2 border-t border-brand-beige">
              <View className="flex-row items-center space-x-2">
                <CheckCircle2 size={14} color="#B97C63" />
                <Text className="font-sans text-xs text-brand-charcoal">{language === 'pt' ? 'Análise Facial Ilimitada com IA' : language === 'it' ? 'Analisi Facciale Illimitata con IA' : 'Unlimited AI Facial Analysis'}</Text>
              </View>
              <View className="flex-row items-center space-x-2">
                <CheckCircle2 size={14} color="#B97C63" />
                <Text className="font-sans text-xs text-brand-charcoal">{language === 'pt' ? 'Busca inteligente de produtos' : language === 'it' ? 'Ricerca intelligente dei prodotti' : 'Smart product search'}</Text>
              </View>
              <View className="flex-row items-center space-x-2">
                <CheckCircle2 size={14} color="#B97C63" />
                <Text className="font-sans text-xs text-brand-charcoal">{language === 'pt' ? 'Geração de rotina avançada e personalizada' : language === 'it' ? 'Generazione routine avanzata e personalizzata' : 'Advanced and personalized routine generation'}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/paywall')}
              activeOpacity={0.9}
              className="w-full bg-brand-rose-metallic py-3 rounded-full flex-row items-center justify-center space-x-1 shadow-sm"
            >
              <Sparkles size={16} color="white" />
              <Text className="text-white font-sans text-sm font-bold">
                {t('settings.upgrade')}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={handleManageSubscription}
            activeOpacity={0.9}
            className="w-full bg-[#FAF9F6] border border-brand-rose-metallic/35 py-3 rounded-full flex-row items-center justify-center space-x-1"
          >
            <Lock size={16} color="#B97C63" />
            <Text className="text-brand-rose-metallic font-sans text-sm font-bold">
              {language === 'pt' ? 'Gerenciar Assinatura' : language === 'it' ? 'Gestisci Abbonamento' : 'Manage Subscription'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Seção Idiomas */}
      <View className="bg-white p-5 rounded-[32px] border border-brand-beige shadow-sm mb-6">
        <View className="flex-row items-center space-x-2 mb-3">
          <Globe size={18} color="#B97C63" />
          <Text className="font-serif text-sm font-bold text-brand-charcoal">{t('settings.language')}</Text>
        </View>

        <View className="mt-2 space-y-1">
          {(['it', 'en', 'pt'] as const).map(lang => (
            <TouchableOpacity
              key={lang}
              onPress={() => changeLanguage(lang)}
              className={`w-full py-3 px-4 flex-row justify-between items-center rounded-2xl ${language === lang ? 'bg-brand-rose-light/10 border border-brand-rose-metallic/20' : 'bg-transparent border border-transparent'}`}
            >
              <Text className={`font-sans text-sm font-bold ${language === lang ? 'text-brand-rose-metallic' : 'text-brand-charcoal/60'}`}>
                {lang === 'it' ? 'Italiano' : lang === 'pt' ? 'Português' : 'English'}
              </Text>
              {language === lang && <Sparkles size={16} color="#B97C63" />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Seção Lembretes Notificações */}
      <View className="bg-white p-5 rounded-[32px] border border-brand-beige shadow-sm mb-6">
        <View className="flex-row items-center space-x-2 mb-4">
          <Bell size={18} color="#B97C63" />
          <Text className="font-serif text-sm font-bold text-brand-charcoal">{t('settings.daily_reminders')}</Text>
        </View>

        <View className="space-y-3">
          {/* Lembrete AM */}
          <View className="flex-row justify-between items-center py-2 border-b border-brand-beige">
            <View>
              <Text className="font-sans text-xs font-bold text-brand-charcoal">{t('home.routine_am')}</Text>
              <Text className="font-sans text-[10px] text-brand-charcoal/60">07:00 AM</Text>
            </View>
            <Switch
              trackColor={{ false: '#E5E5EA', true: '#B97C63' }}
              thumbColor="white"
              onValueChange={() => toggleReminder('AM', !!amReminder?.is_enabled)}
              value={!!amReminder?.is_enabled}
            />
          </View>

          {/* Lembrete SPF */}
          <View className="flex-row justify-between items-center py-2 border-b border-brand-beige">
            <View>
              <Text className="font-sans text-xs font-bold text-brand-charcoal">{t('settings.spf_reapply')}</Text>
              <Text className="font-sans text-[10px] text-brand-charcoal/60">12:00 PM</Text>
            </View>
            <Switch
              trackColor={{ false: '#E5E5EA', true: '#B97C63' }}
              thumbColor="white"
              onValueChange={() => toggleReminder('SPF', !!spfReminder?.is_enabled)}
              value={!!spfReminder?.is_enabled}
            />
          </View>

          {/* Lembrete PM */}
          <View className="flex-row justify-between items-center py-2">
            <View>
              <Text className="font-sans text-xs font-bold text-brand-charcoal">{t('home.routine_pm')}</Text>
              <Text className="font-sans text-[10px] text-brand-charcoal/60">10:00 PM</Text>
            </View>
            <Switch
              trackColor={{ false: '#E5E5EA', true: '#B97C63' }}
              thumbColor="white"
              onValueChange={() => toggleReminder('PM', !!pmReminder?.is_enabled)}
              value={!!pmReminder?.is_enabled}
            />
          </View>
        </View>
      </View>

      {/* Seção Conta e LGPD */}
      <View className="bg-white p-5 rounded-[32px] border border-brand-beige shadow-sm mb-12 space-y-4">
        
        {/* Termos mockados */}
        <TouchableOpacity
          onPress={handleOpenPrivacy}
          className="flex-row justify-between items-center py-1"
        >
          <Text className="font-sans text-xs text-brand-charcoal font-medium">{t('settings.privacy')}</Text>
          <ChevronRight size={14} color="#C6C6C8" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleOpenTerms}
          className="flex-row justify-between items-center py-1 border-t border-brand-beige pt-3"
        >
          <Text className="font-sans text-xs text-brand-charcoal font-medium">{t('settings.terms')}</Text>
          <ChevronRight size={14} color="#C6C6C8" />
        </TouchableOpacity>

        {/* Refazer Quiz de Pele */}
        <TouchableOpacity
          onPress={() => router.push('/onboarding?retake=true')}
          className="flex-row items-center space-x-2 py-1 border-t border-brand-beige pt-3"
        >
          <Sparkles size={16} color="#B97C63" />
          <Text className="font-sans text-xs font-bold text-brand-charcoal">
            {language === 'pt' ? 'Refazer Questionário de Pele' : language === 'it' ? 'Rifare il Questionario Pelle' : 'Retake Skin Quiz'}
          </Text>
        </TouchableOpacity>

        {/* Trocar Senha */}
        <TouchableOpacity
          onPress={() => setIsPasswordModalOpen(true)}
          className="flex-row items-center space-x-2 py-1 border-t border-brand-beige pt-3"
        >
          <Lock size={16} color="#B97C63" />
          <Text className="font-sans text-xs font-bold text-brand-charcoal">
            {t('settings.change_password')}
          </Text>
        </TouchableOpacity>

        {/* Exportar meus dados (LGPD/GDPR) */}
        <TouchableOpacity
          onPress={handleExportData}
          className="flex-row items-center space-x-2 py-1 border-t border-brand-beige pt-3"
        >
          <Download size={16} color="#B97C63" />
          <Text className="font-sans text-xs font-bold text-brand-charcoal">
            {t('settings.export_data')}
          </Text>
        </TouchableOpacity>

        {/* Apagar histórico de análises (consentimento biométrico) */}
        <TouchableOpacity
          onPress={handleDeleteScanHistory}
          className="flex-row items-center space-x-2 py-1 border-t border-brand-beige pt-3"
        >
          <Trash2 size={16} color="#B97C63" />
          <Text className="font-sans text-xs font-bold text-brand-charcoal">
            {t('settings.delete_scan_history')}
          </Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          className="flex-row items-center space-x-2 py-1 border-t border-brand-beige pt-3"
        >
          <LogOut size={16} color="#EF4444" />
          <Text className="font-sans text-xs font-bold text-red-500">
            {t('settings.logout')}
          </Text>
        </TouchableOpacity>

        {/* Deletar conta LGPD */}
        <TouchableOpacity
          onPress={handleDeleteAccount}
          className="flex-row items-center space-x-2 py-1 border-t border-brand-beige pt-3"
        >
          <ShieldAlert size={16} color="#EF4444" />
          <Text className="font-sans text-xs font-bold text-red-500">
            {t('settings.delete_account')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Painel Admin — visível SOMENTE para viroedu@gmail.com */}
      {isAdmin && (
        <View className="bg-white rounded-3xl p-5 mb-6 border border-brand-warm-gray shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <BarChart2 size={18} color="#B97C63" style={{ marginRight: 8 }} />
              <Text className="font-serif text-lg font-bold text-brand-charcoal">Painel Admin 🔒</Text>
            </View>
            <TouchableOpacity
              onPress={loadAdminReport}
              disabled={loadingAdmin}
              className="bg-brand-rose-metallic px-3 py-1.5 rounded-full"
            >
              {loadingAdmin ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text className="text-white text-xs font-bold font-sans">{adminReport ? 'Atualizar' : 'Carregar'}</Text>
              )}
            </TouchableOpacity>
          </View>

          {adminReport ? (
            <View className="space-y-3">
              {/* Usuários */}
              <View className="bg-brand-ivory rounded-2xl p-4">
                <Text className="font-sans text-xs font-bold text-brand-sage-dark uppercase mb-2">👥 Usuários</Text>
                <View className="flex-row flex-wrap gap-2">
                  <View className="bg-white rounded-xl px-3 py-2 border border-brand-beige">
                    <Text className="font-sans text-xs text-brand-sage-dark">Total</Text>
                    <Text className="font-serif text-xl font-bold text-brand-charcoal">{adminReport.users?.total ?? '–'}</Text>
                  </View>
                  <View className="bg-white rounded-xl px-3 py-2 border border-brand-beige">
                    <Text className="font-sans text-xs text-brand-sage-dark">Premium Ativos</Text>
                    <Text className="font-serif text-xl font-bold text-brand-rose-metallic">{adminReport.users?.premium_active ?? '–'}</Text>
                  </View>
                  <View className="bg-white rounded-xl px-3 py-2 border border-brand-beige">
                    <Text className="font-sans text-xs text-brand-sage-dark">Novos/Mês</Text>
                    <Text className="font-serif text-xl font-bold text-green-600">{adminReport.users?.new_this_month ?? '–'}</Text>
                  </View>
                  <View className="bg-white rounded-xl px-3 py-2 border border-brand-beige">
                    <Text className="font-sans text-xs text-brand-sage-dark">Conversão</Text>
                    <Text className="font-serif text-xl font-bold text-brand-charcoal">{adminReport.users?.conversion_rate_percent ?? '–'}%</Text>
                  </View>
                </View>
              </View>

              {/* Scans */}
              <View className="bg-brand-ivory rounded-2xl p-4">
                <Text className="font-sans text-xs font-bold text-brand-sage-dark uppercase mb-2">📸 Análises</Text>
                <View className="flex-row gap-2">
                  <View className="bg-white rounded-xl px-3 py-2 border border-brand-beige flex-1">
                    <Text className="font-sans text-xs text-brand-sage-dark">Total</Text>
                    <Text className="font-serif text-xl font-bold text-brand-charcoal">{adminReport.scans?.total ?? '–'}</Text>
                  </View>
                  <View className="bg-white rounded-xl px-3 py-2 border border-brand-beige flex-1">
                    <Text className="font-sans text-xs text-brand-sage-dark">Este Mês</Text>
                    <Text className="font-serif text-xl font-bold text-brand-bronze">{adminReport.scans?.this_month ?? '–'}</Text>
                  </View>
                </View>
              </View>

              {/* Top Produtos */}
              {adminReport.top_products?.length > 0 && (
                <View className="bg-brand-ivory rounded-2xl p-4">
                  <Text className="font-sans text-xs font-bold text-brand-sage-dark uppercase mb-2">🏆 Top Produtos</Text>
                  {adminReport.top_products.map((p: any, i: number) => (
                    <View key={p.name} className="flex-row justify-between items-center py-1.5 border-b border-brand-beige">
                      <Text className="font-sans text-xs text-brand-charcoal flex-1 pr-2" numberOfLines={1}>{i + 1}. {p.name}</Text>
                      <Text className="font-sans text-xs font-bold text-brand-rose-metallic">{p.count}x</Text>
                    </View>
                  ))}
                </View>
              )}

              <Text className="font-sans text-[10px] text-brand-sage-dark text-center">
                Gerado em: {adminReport.generated_at ? new Date(adminReport.generated_at).toLocaleString() : '–'}
              </Text>
            </View>
          ) : (
            <Text className="font-sans text-xs text-brand-sage-dark text-center py-4">
              Toque em "Carregar" para ver as métricas do negócio.
            </Text>
          )}
        </View>
      )}

      {/* Modal Mudar Senha */}
      <Modal
        visible={isPasswordModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPasswordModalOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-[32px] p-6 pb-12">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-serif text-brand-bronze font-bold">
                {t('settings.change_password')}
              </Text>
              <TouchableOpacity
                onPress={() => setIsPasswordModalOpen(false)}
                className="p-2 bg-brand-beige rounded-full"
              >
                <X size={16} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <View className="space-y-4">
              <View>
                <Text className="text-xs font-sans font-semibold text-brand-sage-dark mb-1">
                  {t('auth.new_password')}
                </Text>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  className="bg-brand-ivory px-4 py-3 border border-brand-beige rounded-xl font-sans text-sm"
                />
              </View>

              <View>
                <Text className="text-xs font-sans font-semibold text-brand-sage-dark mb-1">
                  {t('auth.confirm_new_password')}
                </Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  className="bg-brand-ivory px-4 py-3 border border-brand-beige rounded-xl font-sans text-sm"
                />
              </View>

              <TouchableOpacity
                onPress={handleChangePassword}
                disabled={savingPassword}
                className={`w-full py-4 rounded-full items-center mt-2 ${savingPassword ? 'bg-brand-rose-metallic/60' : 'bg-brand-rose-metallic'}`}
              >
                {savingPassword ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-sans text-base font-bold">
                    {t('settings.change_password')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
