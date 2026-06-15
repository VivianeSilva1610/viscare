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

    const { image, language, activeProducts, routineIngredients, hasSpfInRoutine } = await req.json();

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
    let productsContext = '';

    if (activeProducts && activeProducts.length > 0) {
      productsContext = `O usuário tem estes produtos no armário: ${JSON.stringify(activeProducts)}. `;
    }
    if (routineIngredients && routineIngredients.length > 0) {
      productsContext += `Os seguintes ingredientes estão ativos nas rotinas AM/PM: ${routineIngredients.join(', ')}. Protetor solar (SPF) na rotina: ${hasSpfInRoutine ? 'Sim' : 'Não'}.`;
    }

    if (lang === 'pt') {
      languageInstructions = "Escreva o diagnóstico em Português. Use vocabulário simples e claro. Explique o que as porcentagens significam (ex: se rugas for 68%, significa que a pele está 68% lisa e sem marcas, e não que tem 68% de rugas; se hidratação for 70%, significa nível de umidade bom). Explique como os produtos ativos da rotina atual do usuário se relacionam e ajudam no tratamento dos problemas observados no rosto.";
    } else if (lang === 'it') {
      languageInstructions = "Scrivi la diagnosi in Italiano. Usa un vocabolario semplice e chiaro. Spiega cosa significano le percentuali (es: se le rughe sono al 68%, significa che la pelle è liscia al 68%, non che ha il 68% di rughe; se l'idratazione è al 70%, significa un buon livello di umidità). Spiega come i prodotti attivi della routine dell'utente si collegano e aiutano a trattare i problemi osservati sul viso.";
    } else {
      languageInstructions = "Write the diagnosis in English. Use simple and clear vocabulary. Explain what the percentages mean (e.g. if wrinkles is 68%, it means the skin is 68% smooth and mark-free, not that it has 68% wrinkles; if hydration is 70%, it means a good moisture level). Explain how the active products in the user's current routine relate to and help treat the problems observed on the face.";
    }

    const promptText = `Análise clínica de imagem facial da pele do rosto do usuário. Concentre-se especificamente nos aspectos faciais (viso).
    ${productsContext}
    Retorne estritamente um objeto JSON com os seguintes campos (sem tags de código markdown e sem blocos \`\`\`json):
    {
      "hydration": número entre 0 e 100 (onde 100 significa pele perfeitamente hidratada, 0 significa extremamente seca),
      "wrinkles": número entre 0 e 100 (onde 100 significa pele totalmente lisa, firme e sem marcas de rugas/linhas finas, e 0 significa rugas severas generalizadas),
      "sensitivity": número entre 0 e 100 (onde 100 significa pele extremamente reativa e irritada/vermelha, e 0 significa pele tolerante),
      "acne": número entre 0 e 100 (onde 100 significa pele completamente lisa e pura, sem cravos ou espinhas, e 0 significa acne severa),
      "diagnosis": "Um texto conciso com no máximo 4 frases. ${languageInstructions} Comente sobre o estado geral visível do rosto na foto e correlacione diretamente com os produtos/ingredientes que o usuário já usa ou deveria usar."
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
