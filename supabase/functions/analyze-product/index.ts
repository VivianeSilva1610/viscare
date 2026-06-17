// Supabase Edge Function: analyze-product
// ─────────────────────────────────────────────────────────────────────────────
// Esta função recebe o nome, marca e ingredientes de um produto,
// consulta o Google Gemini e retorna a categoria, princípios ativos e uma avaliação do produto.
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

    const { name, brand, activeIngredients, language } = await req.json();

    if (!name || !brand) {
      return new Response(
        JSON.stringify({ error: 'Nome e marca do produto são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lang = ['pt', 'it', 'en'].includes(language) ? language : 'pt';

    const promptText = `Você é um dermatologista e cosmetologista especialista. Analise o seguinte produto de cuidados com a pele (skincare) de forma cientificamente precisa:
    Nome do Produto: "${name}"
    Marca: "${brand}"
    Ingredientes ativos informados pelo usuário: "${activeIngredients || 'Não informado'}"

    Instruções:
    1. Identifique a categoria correta do produto entre as seguintes opções exatas: "cleanser" (sabonetes/limpadores), "toner" (tônicos/loções), "treatment" (séruns/tratamentos com ácidos/ativos concentrados), "moisturizer" (hidratantes/cremes) ou "spf" (protetores solares).
    2. Detecte os princípios ativos reais presentes na fórmula clássica deste produto (ex: Retinol, Niacinamide, Hyaluronic Acid, Salicylic Acid, Vitamin C, PDRN). Se o usuário informou de forma incompleta ou incorreta, corrija-os. Caso contrário, mantenha-os traduzidos para a nomenclatura dermatológica padrão em inglês (ex: Hyaluronic Acid, Retinol, Niacinamide, Vitamin C, Salicylic Acid, Glycolic Acid).
    3. Escreva uma avaliação clínica concisa sobre o produto com no máximo 3 frases no idioma '${lang}'. Explique para qual tipo de pele é recomendado, o principal benefício e dê uma recomendação de uso (ex: usar apenas à noite, evitar misturar com outros ácidos, obrigatório usar protetor solar pela manhã).

    Retorne estritamente um objeto JSON com os seguintes campos (sem tags markdown e sem blocos \`\`\`json):
    {
      "category": string (deve ser "cleanser", "toner", "treatment", "moisturizer" ou "spf"),
      "activeIngredients": array de strings contendo os ativos detectados (ex: ["Retinol", "Hyaluronic Acid"]),
      "evaluation": string (avaliação explicativa concisa no idioma '${lang}')
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
              { text: promptText }
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              category: { type: 'STRING' },
              activeIngredients: {
                type: 'ARRAY',
                items: { type: 'STRING' }
              },
              evaluation: { type: 'STRING' }
            },
            required: ['category', 'activeIngredients', 'evaluation']
          }
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

    const parsedResult = JSON.parse(generatedText.trim());

    return new Response(
      JSON.stringify(parsedResult),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro interno do servidor';
    console.error('[analyze-product] Erro:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
