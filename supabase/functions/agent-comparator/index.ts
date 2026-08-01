// Supabase Edge Function: agent-comparator
// ─────────────────────────────────────────────────────────────────────────────
// Agente Comparador de Fotos (IA Vision)
// Recebe duas imagens em base64 e compara a evolução da pele visualmente.
// 
// Para publicar: supabase functions deploy agent-comparator --no-verify-jwt

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

    const { imageBefore, imageAfter, scanBefore, scanAfter, language = 'pt' } = await req.json();

    if (!imageBefore || !imageAfter) {
      return new Response(
        JSON.stringify({ error: 'imageBefore e imageAfter são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limpar prefixos base64
    const cleanBase64 = (img: string) => {
      if (img.startsWith('data:')) {
        const idx = img.indexOf(',');
        return { data: idx !== -1 ? img.substring(idx + 1) : img, mime: img.match(/^data:([^;]+);/)?.[1] || 'image/jpeg' };
      }
      return { data: img, mime: 'image/jpeg' };
    };

    const before = cleanBase64(imageBefore);
    const after = cleanBase64(imageAfter);

    let languageInstructions = '';
    if (language === 'pt') languageInstructions = 'Escreva em Português. Seja empático e motivador.';
    else if (language === 'en') languageInstructions = 'Write in English. Be empathetic and motivating.';
    else if (language === 'it') languageInstructions = 'Scrivi in Italiano. Sii empatico e motivante.';

    // Contexto numérico dos scans para reforçar a análise
    const scanContext = scanBefore && scanAfter
      ? `Dados numéricos da análise: ANTES (hidratação: ${scanBefore.hydration}, rugas: ${scanBefore.wrinkles}, sensibilidade: ${scanBefore.sensitivity}, acne: ${scanBefore.acne}). DEPOIS (hidratação: ${scanAfter.hydration}, rugas: ${scanAfter.wrinkles}, sensibilidade: ${scanAfter.sensitivity}, acne: ${scanAfter.acne}).`
      : '';

    const promptText = `
Você é um Especialista em Análise de Evolução de Pele.
Você recebeu DUAS fotos do rosto da mesma pessoa: a PRIMEIRA é a foto mais ANTIGA (ANTES) e a SEGUNDA é a foto mais RECENTE (DEPOIS).

${scanContext}

Compare as duas imagens e os dados numéricos (se disponíveis) e identifique a evolução da pele.

${languageInstructions}

Retorne ESTRITAMENTE um JSON válido (sem crases de markdown):
{
  "overall_progress": número de 0 a 100 representando o progresso geral (0 = piorou muito, 50 = sem mudança, 100 = melhora significativa),
  "summary": "Resumo geral da evolução em 1-2 frases motivadoras.",
  "improvements": [array de strings, máx 4 itens, descrevendo melhorias visíveis. Ex: 'Redução visível de vermelhidão'"],
  "areas_to_watch": [array de strings, máx 2 itens, descrevendo áreas que ainda precisam de atenção. Ex: 'Poros da zona T ainda visíveis'"]
}
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: promptText },
            { inlineData: { mimeType: before.mime, data: before.data } },
            { inlineData: { mimeType: after.mime, data: after.data } }
          ]
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              overall_progress: { type: 'INTEGER' },
              summary: { type: 'STRING' },
              improvements: { type: 'ARRAY', items: { type: 'STRING' } },
              areas_to_watch: { type: 'ARRAY', items: { type: 'STRING' } }
            },
            required: ['overall_progress', 'summary', 'improvements', 'areas_to_watch']
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
    console.error('[agent-comparator] Erro:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
