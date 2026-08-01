// Supabase Edge Function: export-user-data
// ─────────────────────────────────────────────────────────────────────────────
// Direito de portabilidade (LGPD Art. 18 V / GDPR Art. 20): monta um pacote
// com todos os dados do usuário autenticado e envia por e-mail via Resend.
//
// Diferente de create-payment-intent/analyze-skin, esta função NÃO usa
// --no-verify-jwt: o Supabase já valida o JWT antes de invocar, e dentro da
// função resolvemos a identidade real a partir desse JWT (nunca de um body
// enviado pelo cliente), porque ela lida com dados sensíveis.
//
// Para publicar:
//   supabase functions deploy export-user-data
//
// Variáveis de ambiente necessárias (Settings → Edge Functions):
//   RESEND_KEY = re_xxxxxxxx
// (SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY já são
// injetadas automaticamente pelo runtime do Supabase.)

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

    // Client vinculado ao JWT do chamador — usado só para descobrir quem é o usuário de verdade.
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
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Usuário sem e-mail cadastrado.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Client de service role — usado só depois de já sabermos o uid real, para ler tudo sem RLS.
    const adminClient = createClient(supabaseUrl, serviceKey);

    const [
      profile,
      skinProfile,
      facialScans,
      userProducts,
      routines,
      reminders,
      appointments,
      auditLog,
    ] = await Promise.all([
      adminClient.from('profiles').select('*').eq('id', uid).maybeSingle(),
      adminClient.from('skin_profiles').select('*').eq('user_id', uid).maybeSingle(),
      adminClient.from('facial_scans').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      adminClient.from('user_products').select('*').eq('user_id', uid),
      adminClient.from('routines').select('*, routine_steps(*)').eq('user_id', uid),
      adminClient.from('reminders').select('*').eq('user_id', uid),
      adminClient.from('appointments').select('*').eq('user_id', uid),
      adminClient.from('privacy_audit_log').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
    ]);

    const exportPayload = {
      exported_at: new Date().toISOString(),
      profile: profile.data,
      skin_profile: skinProfile.data,
      facial_scans: facialScans.data ?? [],
      user_products: userProducts.data ?? [],
      routines: routines.data ?? [],
      reminders: reminders.data ?? [],
      appointments: appointments.data ?? [],
      privacy_audit_log: auditLog.data ?? [],
    };

    const jsonString = JSON.stringify(exportPayload, null, 2);

    const resendApiKey = Deno.env.get('RESEND_KEY');
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'RESEND_KEY não configurada nas variáveis de ambiente do Supabase.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const attachmentBase64 = btoa(unescape(encodeURIComponent(jsonString)));

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Viscare <suporte@viscare.app.br>',
        to: [email],
        subject: 'Seus dados Viscare (LGPD/GDPR)',
        html:
          '<p>Olá!</p>' +
          '<p>Em anexo está uma cópia de todos os seus dados armazenados no Viscare, conforme seu direito de portabilidade (LGPD Art. 18 / GDPR Art. 20).</p>' +
          '<p>Se você não solicitou esta exportação, entre em contato com suporte@viscare.app.br imediatamente.</p>',
        attachments: [
          {
            filename: 'viscare-meus-dados.json',
            content: attachmentBase64,
          },
        ],
      }),
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      throw new Error(`Falha ao enviar e-mail via Resend: ${resendResponse.status} - ${errText}`);
    }

    await adminClient.from('privacy_audit_log').insert({
      user_id: uid,
      event_type: 'data_export_sent',
      metadata: { email },
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro interno do servidor';
    console.error('[export-user-data] Erro:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
