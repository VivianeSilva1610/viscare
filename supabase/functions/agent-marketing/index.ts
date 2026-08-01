// Supabase Edge Function: agent-marketing
// ─────────────────────────────────────────────────────────────────────────────
// Agente de Marketing (IA)
// Analisa o comportamento do usuário e gera ofertas personalizadas,
// mensagens de campanha e banners relevantes para exibir no app.
// 
// Para publicar: supabase functions deploy agent-marketing --no-verify-jwt

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

    // userBehavior: { topConcerns, recentlyViewedProducts, subscriptionPlan, daysSinceLastScan, streakDays }
    // availablePromotions: lista de promoções e categorias de produtos disponíveis
    const { userBehavior, availablePromotions = [], language = 'pt' } = await req.json();

    if (!userBehavior) {
      return new Response(
        JSON.stringify({ error: 'userBehavior é obrigatório.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let languageInstructions = '';
    if (language === 'pt') languageInstructions = 'Escreva em Português. Tom persuasivo mas amigável.';
    else if (language === 'en') languageInstructions = 'Write in English. Persuasive but friendly tone.';
    else if (language === 'it') languageInstructions = 'Scrivi in Italiano. Tono persuasivo ma amichevole.';

    const promptText = `
Você é um Especialista em Marketing de Skincare para o aplicativo Viscare.
Analise o comportamento do usuário e as promoções disponíveis, e crie uma campanha personalizada.

=== COMPORTAMENTO DO USUÁRIO ===
${JSON.stringify(userBehavior, null, 2)}

=== PROMOÇÕES DISPONÍVEIS ===
${JSON.stringify(availablePromotions, null, 2)}

=== TAREFA ===
Crie uma oferta ou mensagem de marketing personalizada baseada nas necessidades reais da pele deste usuário.
A mensagem deve ser relevante para os problemas que ele demonstra (acne, manchas, etc.) e criar urgência genuína.

${languageInstructions}

Retorne ESTRITAMENTE um JSON válido (sem crases de markdown):
{
  "banner_title": "Título curto e chamativo para o banner (max 6 palavras)",
  "banner_subtitle": "Subtítulo complementar (max 12 palavras)",
  "cta_text": "Texto do botão de ação (max 4 palavras)",
  "discount_highlight": "Se houver desconto, escreva o destaque. Ex: '15% OFF' ou '' se não houver",
  "target_category": "Categoria do produto a ser promovido. Ex: 'anti-acne', 'hidratante', 'spf'",
  "reasoning": "1 frase interna explicando por que essa oferta é relevante para este usuário"
}
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              banner_title: { type: 'STRING' },
              banner_subtitle: { type: 'STRING' },
              cta_text: { type: 'STRING' },
              discount_highlight: { type: 'STRING' },
              target_category: { type: 'STRING' },
              reasoning: { type: 'STRING' }
            },
            required: ['banner_title', 'banner_subtitle', 'cta_text', 'discount_highlight', 'target_category', 'reasoning']
          }
        }
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Erro API Gemini: ${errorText}`);
    }

    const responseData = await geminiResponse.json();
    const generatedText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) throw new Error('Nenhuma resposta do Gemini.');

    let cleanedText = generatedText.trim();
    if (cleanedText.startsWith('```')) {
      const match = cleanedText.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
      if (match) cleanedText = match[1];
    }

    const parsedResult = JSON.parse(cleanedText);
    return new Response(JSON.stringify(parsedResult), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro interno';
    console.error('[agent-marketing] Erro:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
