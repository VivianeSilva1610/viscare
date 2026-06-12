import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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
      },
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
      },
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
      },
      trigger: {
        hour: 22,
        minute: 0,
        repeats: true,
      } as Notifications.NotificationTriggerInput,
    });
  }

  // Cancelar todas as notificações
  static async cancelAllReminders(): Promise<void> {
    if (Platform.OS === 'web') return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}
