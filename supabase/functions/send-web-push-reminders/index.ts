// Supabase Edge Function: send-web-push-reminders
// ─────────────────────────────────────────────────────────────────────────────
// Envia de verdade os lembretes de rotina (AM 7h, SPF 12h, PM 22h) pros
// usuários que ativaram notificações no navegador (Web Push via
// public/sw.js + push_subscriptions). O expo-notifications nativo (mobile)
// continua agendado localmente no próprio app; isso aqui é só a contraparte
// web, que precisa de um envio real vindo do servidor.
//
// Disparado por hora via pg_cron (ver migração 20260802040000_push_cron.sql)
// — cada execução confere, pra cada inscrição, se a hora local dela (pelo
// fuso salvo em push_subscriptions.timezone) bate com 7, 12 ou 22h, e só
// envia nesse caso.
//
// Para publicar: supabase functions deploy send-web-push-reminders --no-verify-jwt
//
// Configurar no painel Supabase (Settings → Edge Functions → Environment variables):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.7?target=deno';

const MESSAGES: Record<string, Record<string, { title: string; body: string }>> = {
  7: {
    pt: { title: '☀️ Rotina Matinal', body: 'Hora de cuidar da sua pele! Comece sua rotina da manhã.' },
    it: { title: '☀️ Routine Mattutina', body: 'È ora di coccolare la tua pelle! Inizia con la tua routine AM.' },
    en: { title: '☀️ Morning Routine', body: 'Time to pamper your skin! Start your AM routine.' },
  },
  12: {
    pt: { title: '🧴 Reaplique o Protetor Solar', body: 'Mantenha sua pele protegida. Lembre-se de reaplicar o protetor solar!' },
    it: { title: '🧴 Riapplicazione SPF', body: 'Mantieni protetta la tua pelle. Ricordati di riapplicare lo schermo solare!' },
    en: { title: '🧴 SPF Reapplication', body: 'Keep your skin protected. Remember to reapply your sunscreen!' },
  },
  22: {
    pt: { title: '🌙 Rotina Noturna', body: 'Termine o dia relaxando e completando sua rotina da noite.' },
    it: { title: '🌙 Routine Serale', body: 'Concludi la giornata rilassandoti e completando la tua routine PM.' },
    en: { title: '🌙 Evening Routine', body: 'Unwind and finish your day by completing your PM routine.' },
  },
};

Deno.serve(async (req: Request) => {
  try {
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:suporte@viscare.app.br';
    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(JSON.stringify({ error: 'VAPID não configurado no servidor.' }), { status: 500 });
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: subscriptions, error } = await adminClient
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, timezone, language');

    if (error) throw error;

    let sent = 0;
    let cleaned = 0;

    for (const sub of subscriptions ?? []) {
      let localHour: number;
      try {
        const formatter = new Intl.DateTimeFormat('en-US', { timeZone: sub.timezone || 'UTC', hour: 'numeric', hour12: false });
        localHour = parseInt(formatter.format(new Date()), 10) % 24;
      } catch {
        continue; // timezone inválido salvo — pula essa inscrição
      }

      const slot = MESSAGES[localHour];
      if (!slot) continue;

      const lang = (sub.language as string) in slot ? sub.language : 'pt';
      const text = slot[lang];

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: text.title, body: text.body, url: '/' })
        );
        sent++;
      } catch (sendErr: any) {
        // 404/410 = inscrição expirada ou revogada pelo usuário — limpa.
        if (sendErr?.statusCode === 404 || sendErr?.statusCode === 410) {
          await adminClient.from('push_subscriptions').delete().eq('id', sub.id);
          cleaned++;
        } else {
          console.warn('[send-web-push-reminders] Falha ao enviar:', sendErr?.message || sendErr);
        }
      }
    }

    return new Response(JSON.stringify({ sent, cleaned, checked: subscriptions?.length ?? 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro interno';
    console.error('[send-web-push-reminders] Erro:', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
});
