// Supabase Edge Function: agent-support
// ─────────────────────────────────────────────────────────────────────────────
// Agente de Atendimento / Coach (IA Conversacional)
// Funciona como um assistente dermatológico particular que responde dúvidas,
// comenta sobre a rotina e encoraja o usuário. Engloba o papel do Agente Coach.
//
// Recurso Premium: cada mensagem custa uma chamada à API do Gemini, então só
// libera para quem tem assinatura ativa. A checagem é feita aqui (servidor),
// não só no client — o client só decide se mostra a tela, quem garante o
// acesso de verdade é este check contra o profile no banco.
//
// Para publicar: supabase functions deploy agent-support --no-verify-jwt

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
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY não configurada.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // history: Array de { role: 'user' | 'model', text: string }
    // userContext: dados do usuário (perfil de pele, última análise, rotina atual, etc.)
    const { userId, userMessage, history = [], userContext = {}, language = 'pt' } = await req.json();

    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: 'userMessage é obrigatório.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId é obrigatório.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: profile } = await adminClient
      .from('profiles')
      .select('email, subscription_plan, subscription_expires_at, topup_vis_questions')
      .eq('id', userId)
      .single();

    const isUnlimitedTestAccount = profile?.email?.toLowerCase() === 'viroedu@gmail.com';
    const plan = profile?.subscription_plan;
    const isPlanPremium = plan === 'premium' || plan === 'influencer';
    const isNotExpired = !profile?.subscription_expires_at || new Date(profile.subscription_expires_at) > new Date();
    const isPremiumAccess = isUnlimitedTestAccount || (isPlanPremium && isNotExpired);

    // Quem comprou o Pacote Avulso ganha 3 perguntas pra Vis, consumidas uma a
    // uma aqui — mesmo sem ser assinante Premium.
    const topupQuestionsLeft = profile?.topup_vis_questions ?? 0;
    const usingTopupCredit = !isPremiumAccess && topupQuestionsLeft > 0;
    const hasAccess = isPremiumAccess || usingTopupCredit;

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'PREMIUM_REQUIRED', reply: null }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let systemPersona = '';
    if (language === 'pt') {
      systemPersona = `Você é a Vis, a assistente de skincare do aplicativo Viscare. Você é especialista em dermatologia, empática, motivadora e fala como uma amiga próxima. Você NÃO dá diagnósticos médicos, mas pode explicar ingredientes, rotinas e tirar dúvidas sobre skincare. Responda de forma concisa (máximo 3-4 frases). Use emojis com moderação.`;
    } else if (language === 'en') {
      systemPersona = `You are Vis, the skincare assistant of the Viscare app. You are a skincare expert, empathetic, motivating, and talk like a close friend. You do NOT give medical diagnoses, but you can explain ingredients, routines, and answer skincare questions. Keep answers concise (max 3-4 sentences). Use emojis in moderation.`;
    } else if (language === 'it') {
      systemPersona = `Sei Vis, l'assistente skincare dell'app Viscare. Sei esperta di dermatologia, empatica, motivante e parli come una cara amica. NON dai diagnosi mediche, ma puoi spiegare ingredienti, routine e rispondere a domande sulla cura della pelle. Rispondi in modo conciso (max 3-4 frasi). Usa le emoji con moderazione.`;
    }

    // Contexto do usuário para a IA
    const contextInfo = Object.keys(userContext).length > 0
      ? `\n=== CONTEXTO DO USUÁRIO ===\n${JSON.stringify(userContext, null, 2)}\n`
      : '';

    // Montar o histórico de conversa no formato que o Gemini espera
    const conversationParts = history.flatMap((msg: { role: string; text: string }) => [
      { role: msg.role, parts: [{ text: msg.text }] }
    ]);

    // Adicionar a mensagem atual do usuário
    conversationParts.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPersona + contextInfo }]
        },
        contents: conversationParts,
        generationConfig: {
          maxOutputTokens: 300,
          temperature: 0.8
        }
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Erro API Gemini: ${errorText}`);
    }

    const responseData = await geminiResponse.json();
    const assistantReply = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!assistantReply) throw new Error('Nenhuma resposta do Gemini.');

    let remainingTopupQuestions: number | null = null;
    if (usingTopupCredit) {
      remainingTopupQuestions = topupQuestionsLeft - 1;
      await adminClient.from('profiles').update({ topup_vis_questions: remainingTopupQuestions }).eq('id', userId);
    }

    return new Response(
      JSON.stringify({ reply: assistantReply.trim(), remainingTopupQuestions }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro interno';
    console.error('[agent-support] Erro:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
