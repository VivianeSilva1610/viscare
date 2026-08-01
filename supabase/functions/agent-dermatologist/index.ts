// Supabase Edge Function: agent-dermatologist
// ─────────────────────────────────────────────────────────────────────────────
// Agente Dermatológico (IA)
// Recebe os dados de análise facial e o perfil do usuário, e atua como um
// especialista para recomendar princípios ativos (ingredientes) e o que evitar.
// 
// Para publicar: supabase functions deploy agent-dermatologist --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // CORS preflight
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

    const { analysis, userProfile, language = 'pt' } = await req.json();

    if (!analysis || !userProfile) {
      return new Response(
        JSON.stringify({ error: 'Dados de análise (analysis) e perfil (userProfile) são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Configuração de idioma
    let languageInstructions = '';
    if (language === 'pt') {
      languageInstructions = "Responda em Português. Use tom profissional, empático e educativo.";
    } else if (language === 'en') {
      languageInstructions = "Answer in English. Use a professional, empathetic, and educational tone.";
    } else if (language === 'it') {
      languageInstructions = "Rispondi in Italiano. Usa un tono professionale, empatico ed educativo.";
    } else {
      languageInstructions = "Responda em Português.";
    }

    const promptText = `
Você é um Dermatologista Especialista em Skincare de Inteligência Artificial.
Sua função não é dar diagnósticos médicos, mas interpretar a análise facial e o perfil do usuário para recomendar os melhores princípios ativos (ingredientes de skincare).

=== DADOS DO USUÁRIO ===
Perfil:
- Idade: ${userProfile.age || 'Não informada'}
- Gênero: ${userProfile.gender || 'Não informado'}
- Tipo de Pele Base: ${userProfile.skin_type || 'Não informado'}
- Pele Sensível: ${userProfile.is_sensitive ? 'Sim' : 'Não'}

Análise Facial Atual (Scores de 0 a 100, onde 100 é perfeito/saudável e 0 é severo):
- Hidratação: ${analysis.hydration}
- Rugas/Linhas: ${analysis.wrinkles}
- Sensibilidade/Vermelhidão: ${analysis.sensitivity}
- Acne/Manchas: ${analysis.acne}
Diagnóstico visual anterior: "${analysis.diagnosis || 'Sem diagnóstico visual'}"

=== TAREFA ===
Com base nos dados acima, recomende ingredientes ativos essenciais para essa pessoa usar na rotina e ingredientes que ela deve passar longe.

${languageInstructions}

Retorne ESTRITAMENTE um JSON válido com os seguintes campos (sem crases de markdown):
{
  "recommended_ingredients": [array de strings com nomes de até 4 ingredientes ideais. Ex: "Ácido Salicílico", "Niacinamida"],
  "avoid_ingredients": [array de strings com ingredientes a evitar para este tipo de pele/estado atual. Ex: "Óleo Mineral", "Esfoliantes Físicos Agressivos"],
  "general_advice": "Uma frase de conselho dermatológico amigável resumindo o foco principal."
}
    `;

    // Chamar API do Gemini
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: promptText }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              recommended_ingredients: {
                type: 'ARRAY',
                items: { type: 'STRING' }
              },
              avoid_ingredients: {
                type: 'ARRAY',
                items: { type: 'STRING' }
              },
              general_advice: { type: 'STRING' }
            },
            required: ['recommended_ingredients', 'avoid_ingredients', 'general_advice']
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

    // Limpar markdown se houver
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
    console.error('[agent-dermatologist] Erro:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
