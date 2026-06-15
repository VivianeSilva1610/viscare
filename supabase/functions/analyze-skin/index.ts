// Supabase Edge Function: analyze-skin
// ─────────────────────────────────────────────────────────────────────────────
// Esta função recebe uma imagem em base64 e o idioma, chama o Google Gemini 
// e retorna a análise da pele estruturada em JSON.
//
// Para publicar:
//   supabase functions deploy analyze-skin --no-verify-jwt
//
// Configurar variável de ambiente no painel Supabase:
//   supabase secrets set GEMINI_API_KEY="SUA_CHAVE_AQUI"
//

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
        JSON.stringify({ error: 'GEMINI_API_KEY não configurada nas variáveis de ambiente do Supabase.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { image, language } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'Imagem em base64 é obrigatória.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limpar o prefixo "data:image/...;base64," caso exista
    let cleanBase64 = image;
    let mimeType = 'image/jpeg';
    
    if (image.startsWith('data:')) {
      const match = image.match(/^data:([^;]+);base64,/);
      if (match) {
        mimeType = match[1];
      }
      const commaIndex = image.indexOf(',');
      if (commaIndex !== -1) {
        cleanBase64 = image.substring(commaIndex + 1);
      }
    }

    const lang = ['pt', 'it', 'en'].includes(language) ? language : 'pt';

    // Construir o prompt dinamicamente com base no idioma solicitado
    let languageInstructions = '';
    if (lang === 'pt') {
      languageInstructions = "Escreva o diagnóstico em Português. Seja empático, encorajador e profissional.";
    } else if (lang === 'it') {
      languageInstructions = "Scrivi la diagnosi in Italiano. Sii empatico, incoraggiante e professionale.";
    } else {
      languageInstructions = "Write the diagnosis in English. Be empathetic, encouraging, and professional.";
    }

    const promptText = `Análise clínica de imagem facial da pele do usuário. Analise as características visuais para fornecer uma avaliação aproximada.
    Retorne estritamente um objeto JSON com os seguintes campos (sem tags de código markdown e sem blocos \`\`\`json):
    {
      "hydration": número entre 0 e 100 (onde 100 significa pele muito hidratada, 40 significa seca),
      "wrinkles": número entre 0 e 100 (onde 100 significa ausência total de rugas e linhas, pele lisa),
      "sensitivity": número entre 0 e 100 (onde 100 significa pele extremamente reativa, vermelha ou irritada, e 0 significa tolerante),
      "acne": número entre 0 e 100 (onde 100 significa pele totalmente limpa e livre de cravos ou espinhas, e 0 significa acne severa),
      "diagnosis": "Um texto conciso com no máximo 3 frases. ${languageInstructions} Comente sobre o estado geral visível (ex: áreas de vermelhidão, poros ou linhas finas) e mencione qual ativo seria recomendado (ex: Ácido Hialurônico, Niacinamida, Vitamina C ou Retinol) baseado no que foi observado na foto."
    }`;

    // Chamar API do Gemini
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
    const geminiResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Erro na API do Gemini: ${geminiResponse.status} - ${errorText}`);
    }

    const responseData = await geminiResponse.json();
    const generatedText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      throw new Error('Nenhuma resposta de texto retornada pelo Gemini.');
    }

    // Fazer o parse da resposta em JSON
    const parsedResult = JSON.parse(generatedText.trim());

    return new Response(
      JSON.stringify(parsedResult),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro interno do servidor';
    console.error('[analyze-skin] Erro:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
