// Supabase Edge Function: agent-influencer
// ─────────────────────────────────────────────────────────────────────────────
// Agente de Influenciadores (IA)
// Gera conteúdo estratégico para redes sociais: temas de Reels, hashtags,
// CTAs e calendário de postagens para divulgar o aplicativo Viscare.
// 
// Para publicar: supabase functions deploy agent-influencer --no-verify-jwt

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

    // topic: tema ou produto para focar. Ex: 'acne', 'protetor solar', 'Vitamina C'
    // platform: 'instagram' | 'tiktok' | 'youtube'
    // appName: nome do app. Ex: 'Viscare'
    const { topic, platform = 'instagram', appName = 'Viscare', language = 'pt' } = await req.json();

    if (!topic) {
      return new Response(
        JSON.stringify({ error: 'topic é obrigatório. Ex: "acne", "rotina de skincare".' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let languageInstructions = '';
    if (language === 'pt') languageInstructions = 'Escreva em Português. Tom dinâmico e autêntico para redes sociais brasileiras.';
    else if (language === 'en') languageInstructions = 'Write in English. Dynamic and authentic tone for social media.';
    else if (language === 'it') languageInstructions = 'Scrivi in Italiano. Tono dinamico e autentico per i social media italiani.';

    const promptText = `
Você é um Estrategista de Conteúdo para Redes Sociais especializado em Skincare & Beleza.
Crie um plano de conteúdo estratégico para divulgar o aplicativo ${appName} com foco no tema: "${topic}".
Plataforma alvo: ${platform.toUpperCase()}.

${languageInstructions}

Retorne ESTRITAMENTE um JSON válido (sem crases de markdown):
{
  "reels_ideas": [
    {
      "title": "Título cativante do Reel",
      "hook": "Primeira frase de gancho (0-3 segundos) para prender a atenção",
      "script_summary": "Resumo do roteiro em 2-3 frases"
    }
  ],
  "hashtags": [array de strings com 10 hashtags relevantes. Inclua o # no início. Ex: "#skincare"],
  "cta_suggestions": [array de 3 strings com diferentes CTAs. Ex: "Baixe o ${appName} e descubra sua análise de pele grátis!"],
  "best_posting_times": "Recomendação de melhor horário/dias para postar baseado no algoritmo da plataforma",
  "content_calendar": [
    {
      "day": "Dia da semana",
      "content_type": "Tipo de conteúdo. Ex: Reel, Story, Carrossel",
      "theme": "Tema do post"
    }
  ]
}

Gere 3 ideias de Reels, 7 dias de calendário (uma semana completa).
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
              reels_ideas: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    title: { type: 'STRING' },
                    hook: { type: 'STRING' },
                    script_summary: { type: 'STRING' }
                  },
                  required: ['title', 'hook', 'script_summary']
                }
              },
              hashtags: { type: 'ARRAY', items: { type: 'STRING' } },
              cta_suggestions: { type: 'ARRAY', items: { type: 'STRING' } },
              best_posting_times: { type: 'STRING' },
              content_calendar: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    day: { type: 'STRING' },
                    content_type: { type: 'STRING' },
                    theme: { type: 'STRING' }
                  },
                  required: ['day', 'content_type', 'theme']
                }
              }
            },
            required: ['reels_ideas', 'hashtags', 'cta_suggestions', 'best_posting_times', 'content_calendar']
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
    console.error('[agent-influencer] Erro:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
