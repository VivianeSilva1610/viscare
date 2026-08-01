// Supabase Edge Function: agent-routine
// ─────────────────────────────────────────────────────────────────────────────
// Agente de Rotina (IA)
// Recebe as recomendações do Agente Dermatológico e o perfil do usuário
// para montar uma rotina personalizada passo a passo (Manhã e Noite).
// 
// Para publicar: supabase functions deploy agent-routine --no-verify-jwt

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

    const { recommendedIngredients, avoidIngredients, userProfile, language = 'pt' } = await req.json();

    if (!recommendedIngredients || !userProfile) {
      return new Response(
        JSON.stringify({ error: 'recommendedIngredients e userProfile são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let languageInstructions = '';
    if (language === 'pt') {
      languageInstructions = "Os passos devem ser escritos em Português.";
    } else if (language === 'en') {
      languageInstructions = "The steps must be written in English.";
    } else if (language === 'it') {
      languageInstructions = "I passi devono essere scritti in Italiano.";
    } else {
      languageInstructions = "Os passos devem ser escritos em Português.";
    }

    const promptText = `
Você é um Agente Especialista em Rotinas de Skincare.
Sua função é pegar os ingredientes ativos recomendados e montar uma rotina diária perfeita para o usuário, separada em Manhã (AM) e Noite (PM).

=== DADOS DO USUÁRIO ===
- Idade: ${userProfile.age || 'Não informada'}
- Pele Sensível: ${userProfile.is_sensitive ? 'Sim' : 'Não'}
- Tipo de Pele: ${userProfile.skin_type || 'Não informado'}

=== INGREDIENTES A INCORPORAR ===
Recomendados (Obrigatórios na rotina): ${recommendedIngredients.join(', ')}
A evitar: ${avoidIngredients?.join(', ') || 'Nenhum'}

=== REGRAS DA ROTINA ===
1. A rotina deve ser realista e ter as etapas essenciais (Limpeza, Tratamento, Hidratação, Proteção).
2. Se houver ingredientes fotossensíveis (ex: Retinol, AHA/BHA, Ácido Glicólico), coloque-os APENAS na rotina da Noite (PM).
3. A rotina da Manhã (AM) deve OBRIGATORIAMENTE terminar com "Protetor Solar" (Sunscreen/Protezione Solare).
4. Evite conflitos (ex: não misture Vitamina C e Retinol no mesmo turno).

${languageInstructions}

Retorne ESTRITAMENTE um JSON com este formato (sem crases de markdown):
{
  "am": [
    { "step": 1, "name": "Nome do Passo", "description": "Por que usar isso de manhã" }
  ],
  "pm": [
    { "step": 1, "name": "Nome do Passo", "description": "Por que usar isso à noite" }
  ]
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
              am: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    step: { type: 'INTEGER' },
                    name: { type: 'STRING' },
                    description: { type: 'STRING' }
                  },
                  required: ['step', 'name', 'description']
                }
              },
              pm: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    step: { type: 'INTEGER' },
                    name: { type: 'STRING' },
                    description: { type: 'STRING' }
                  },
                  required: ['step', 'name', 'description']
                }
              }
            },
            required: ['am', 'pm']
          }
        },
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
    if (cleanedText.startsWith('\`\`\`')) {
      const match = cleanedText.match(/^\`\`\`(?:json)?\\s*([\\s\\S]*?)\\s*\`\`\`$/);
      if (match) cleanedText = match[1];
    }
    
    const parsedResult = JSON.parse(cleanedText);

    return new Response(
      JSON.stringify(parsedResult),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro interno';
    console.error('[agent-routine] Erro:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
