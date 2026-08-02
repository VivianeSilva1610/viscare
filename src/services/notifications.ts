import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY || '';

// Converte a chave pública VAPID (base64url) pro formato Uint8Array que a
// Push API do navegador espera em applicationServerKey.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

// Configurar o comportamento das notificações em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});


export class NotificationService {
  // Solicitar permissões de notificação
  static async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F71',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      return finalStatus === 'granted';
    } catch (e) {
      console.warn('Erro ao solicitar permissões de notificação', e);
      return false;
    }
  }

  // Agendar os 3 lembretes diários padrão
  static async scheduleDailyReminders(language: 'it' | 'en' | 'pt' = 'it'): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      // Primeiro, cancelar todos os agendamentos anteriores para evitar duplicidade
      await Notifications.cancelAllScheduledNotificationsAsync();

      const messages = {
        it: {
          am_title: '☀️ Routine Mattutina',
          am_body: 'È ora di coccolare la tua pelle! Inizia con la tua routine AM.',
          spf_title: '🧴 Riapplicazione SPF',
          spf_body: 'Mantieni protetta la tua pelle. Ricordati di riapplicare lo schermo solare!',
          pm_title: '🌙 Routine Serale',
          pm_body: 'Concludi la giornata rilassandoti e completando la tua routine PM.'
        },
        en: {
          am_title: '☀️ Morning Routine',
          am_body: 'Time to pamper your skin! Start your AM routine.',
          spf_title: '🧴 SPF Reapplication',
          spf_body: 'Keep your skin protected. Remember to reapply your sunscreen!',
          pm_title: '🌙 Evening Routine',
          pm_body: 'Unwind and finish your day by completing your PM routine.'
        },
        pt: {
          am_title: '☀️ Rotina Matinal',
          am_body: 'Hora de cuidar da sua pele! Comece sua rotina da manhã.',
          spf_title: '🧴 Reaplique o Protetor Solar',
          spf_body: 'Mantenha sua pele protegida. Lembre-se de reaplicar o protetor solar!',
          pm_title: '🌙 Rotina Noturna',
          pm_body: 'Termine o dia relaxando e completando sua rotina da noite.'
        }
      };

      const text = messages[language] || messages['it'];

      // Lembrete AM (07:00)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: text.am_title,
          body: text.am_body,
          sound: true,
          channelId: 'default',
        } as any,
        trigger: {
          hour: 7,
          minute: 0,
          repeats: true,
        } as Notifications.NotificationTriggerInput,
      });

      // Lembrete SPF (12:00)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: text.spf_title,
          body: text.spf_body,
          sound: true,
          channelId: 'default',
        } as any,
        trigger: {
          hour: 12,
          minute: 0,
          repeats: true,
        } as Notifications.NotificationTriggerInput,
      });

      // Lembrete PM (22:00)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: text.pm_title,
          body: text.pm_body,
          sound: true,
          channelId: 'default',
        } as any,
        trigger: {
          hour: 22,
          minute: 0,
          repeats: true,
        } as Notifications.NotificationTriggerInput,
      });
    } catch (e) {
      console.warn('Erro ao agendar lembretes diários', e);
    }
  }

  // Cancelar todas as notificações
  static async cancelAllReminders(): Promise<void> {
    if (Platform.OS === 'web') return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // ─── Web Push (navegador) ────────────────────────────────────────────────
  // expo-notifications não cobre push no browser — isso é feito via Service
  // Worker + Push API nativa do navegador, com o envio de verdade disparado
  // por um cron no servidor (supabase/functions/send-web-push-reminders).
  static isWebPushSupported(): boolean {
    return (
      Platform.OS === 'web' &&
      typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator &&
      typeof window !== 'undefined' &&
      'PushManager' in window &&
      !!VAPID_PUBLIC_KEY
    );
  }

  static async subscribeWebPush(userId: string, language: 'it' | 'en' | 'pt' = 'pt'): Promise<boolean> {
    if (!this.isWebPushSupported()) return false;

    try {
      const permission = await window.Notification.requestPermission();
      if (permission !== 'granted') return false;

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        });
      }

      const json = subscription.toJSON();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: userId,
          endpoint: json.endpoint!,
          p256dh: json.keys!.p256dh,
          auth: json.keys!.auth,
          timezone,
          language,
        },
        { onConflict: 'endpoint' }
      );

      if (error) {
        console.warn('Erro ao salvar inscrição de web push', error);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Erro ao inscrever web push', e);
      return false;
    }
  }

  // Agendar lembrete para um tratamento específico (Agenda)
  static async scheduleAppointmentReminder(
    appointmentId: string,
    title: string,
    dateStr: string,
    time: string,
    location: string,
    language: 'it' | 'en' | 'pt' = 'it'
  ): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      // Cancelar qualquer notificação anterior para este agendamento
      await Notifications.cancelScheduledNotificationAsync(appointmentId);

      const parsedDate = this.parseAppointmentDateTime(dateStr, time);
      if (!parsedDate || parsedDate.getTime() <= Date.now()) {
        console.log('[NotificationService] Data do agendamento inválida ou no passado:', dateStr, time);
        return null;
      }

      const messages = {
        it: {
          title: '📅 Lembrete de Tratamento',
          body: `Ricordati del tuo trattamento "${title}" alle ore ${time} presso ${location}.`
        },
        en: {
          title: '📅 Treatment Reminder',
          body: `Remember your "${title}" treatment at ${time} at ${location}.`
        },
        pt: {
          title: '📅 Lembrete de Tratamento',
          body: `Lembre-se do seu tratamento "${title}" às ${time} em ${location}.`
        }
      };

      const text = messages[language] || messages['pt'];

      const notificationId = await Notifications.scheduleNotificationAsync({
        identifier: appointmentId,
        content: {
          title: text.title,
          body: text.body,
          sound: true,
        },
        trigger: parsedDate as any,
      });

      console.log(`[NotificationService] Lembrete agendado com sucesso para ${parsedDate.toISOString()}. ID: ${notificationId}`);
      return notificationId;
    } catch (e) {
      console.warn('Erro ao agendar lembrete de agendamento', e);
      return null;
    }
  }

  // Cancelar lembrete de um agendamento específico
  static async cancelAppointmentReminder(appointmentId: string): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      await Notifications.cancelScheduledNotificationAsync(appointmentId);
      console.log(`[NotificationService] Lembrete cancelado para o agendamento ID: ${appointmentId}`);
    } catch (e) {
      console.warn('Erro ao cancelar lembrete de agendamento', e);
    }
  }

  // Função auxiliar de parsing de data/hora
  private static parseAppointmentDateTime(dateStr: string, timeStr: string): Date | null {
    let parsedDate: Date | null = null;
    
    // Mapear traduções de mocks para formatos parseáveis
    let cleanDateStr = dateStr;
    if (dateStr.startsWith('agenda.day_14_jun')) {
      cleanDateStr = '14 de Junho';
    } else if (dateStr.startsWith('agenda.day_27_jun')) {
      cleanDateStr = '27 de Junho';
    } else if (dateStr.startsWith('agenda.day_01_jun')) {
      cleanDateStr = '01 de Junho';
    }

    // Regex para DD/MM/AAAA ou DD/MM/AA
    const matchDMY = cleanDateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (matchDMY) {
      const day = parseInt(matchDMY[1], 10);
      const month = parseInt(matchDMY[2], 10) - 1;
      let year = parseInt(matchDMY[3], 10);
      if (year < 100) year += 2000;
      parsedDate = new Date(year, month, day);
    }

    // Regex para AAAA-MM-DD
    const matchYMD = cleanDateStr.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (matchYMD && !parsedDate) {
      const year = parseInt(matchYMD[1], 10);
      const month = parseInt(matchYMD[2], 10) - 1;
      const day = parseInt(matchYMD[3], 10);
      parsedDate = new Date(year, month, day);
    }

    if (!parsedDate) {
      const monthsPt = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      const monthsIt = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
      const monthsEn = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
      
      const dayMatch = cleanDateStr.match(/\b(\d{1,2})\b/);
      if (dayMatch) {
        const day = parseInt(dayMatch[1], 10);
        const lowerDateStr = cleanDateStr.toLowerCase();
        let month = new Date().getMonth();
        
        for (let m = 0; m < 12; m++) {
          if (lowerDateStr.includes(monthsPt[m]) || lowerDateStr.includes(monthsIt[m]) || lowerDateStr.includes(monthsEn[m])) {
            month = m;
            break;
          }
        }
        
        let year = new Date().getFullYear();
        let testDate = new Date(year, month, day);
        if (testDate.getTime() <= Date.now()) {
          year += 1;
        }
        parsedDate = new Date(year, month, day);
      }
    }

    if (!parsedDate || isNaN(parsedDate.getTime())) {
      return null;
    }

    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      parsedDate.setHours(hours, minutes, 0, 0);
    } else {
      parsedDate.setHours(9, 0, 0, 0);
    }

    return parsedDate;
  }
}
