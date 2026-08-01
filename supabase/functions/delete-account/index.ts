// Supabase Edge Function: delete-account
// ─────────────────────────────────────────────────────────────────────────────
// Direito de eliminação (LGPD Art. 18 VI / GDPR Art. 17). Corrige uma lacuna
// existente: apagar só a linha em public.profiles NÃO remove a identidade do
// Supabase Auth (e-mail/senha continuavam existindo para sempre). Esta função
// apaga o perfil (o cascade cuida do resto: skin_profiles, user_products,
// routines, routine_steps, reminders, appointments, facial_scans) e depois
// remove o usuário de auth.users via Admin API.
//
// Assim como export-user-data, NÃO usa --no-verify-jwt: a identidade vem
// sempre do JWT do chamador, nunca de um body enviado pelo cliente.
//
// Para publicar:
//   supabase functions deploy delete-account
//
// Variáveis de ambiente necessárias (Settings → Edge Functions):
//   RESEND_KEY = re_xxxxxxxx

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autenticado.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Sessão inválida.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const uid = userData.user.id;
    const email = userData.user.email;

    const adminClient = createClient(supabaseUrl, serviceKey);

    await adminClient.from('privacy_audit_log').insert({
      user_id: uid,
      event_type: 'account_deletion_requested',
      metadata: {},
    });

    // Apaga o perfil — cascade já remove skin_profiles, user_products, routines,
    // routine_steps, reminders, appointments e facial_scans (FKs ON DELETE CASCADE).
    const { error: profileDeleteError } = await adminClient.from('profiles').delete().eq('id', uid);
    if (profileDeleteError) {
      throw new Error(`Falha ao apagar perfil: ${profileDeleteError.message}`);
    }

    // Remove a identidade de verdade do Supabase Auth (o passo que faltava).
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(uid);
    if (authDeleteError) {
      throw new Error(`Falha ao apagar usuário do Auth: ${authDeleteError.message}`);
    }

    // Não guarda user_id nem e-mail aqui — a conta já não existe mais.
    await adminClient.from('privacy_audit_log').insert({
      user_id: null,
      event_type: 'account_deleted',
      metadata: {},
    });

    const resendApiKey = Deno.env.get('RESEND_KEY');
    if (resendApiKey && email) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Viscare <suporte@viscare.app.br>',
            to: [email],
            subject: 'Sua conta Viscare foi excluída',
            html:
              '<p>Confirmamos que sua conta e todos os seus dados foram excluídos permanentemente do Viscare, conforme sua solicitação (LGPD/GDPR).</p>' +
              '<p>Se você não solicitou esta exclusão, entre em contato com suporte@viscare.app.br imediatamente.</p>',
          }),
        });
      } catch (emailError) {
        // Não falha a exclusão por causa do e-mail de confirmação.
        console.warn('[delete-account] Falha ao enviar e-mail de confirmação:', emailError);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro interno do servidor';
    console.error('[delete-account] Erro:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
