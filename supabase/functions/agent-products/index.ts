// Supabase Edge Function: agent-products
// ─────────────────────────────────────────────────────────────────────────────
// Agente de Produtos (IA)
// Recebe os ingredientes recomendados e busca no catálogo quais produtos
// dão "match" com esses ingredientes, retornando a lista ideal de compras.
// 
// Para publicar: supabase functions deploy agent-products --no-verify-jwt

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

    const { recommendedIngredients, catalog, language = 'pt' } = await req.json();

    if (!recommendedIngredients || !catalog) {
      return new Response(
        JSON.stringify({ error: 'recommendedIngredients e catalog são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let languageInstructions = '';
    if (language === 'pt') {
      languageInstructions = "O motivo (reason) deve ser escrito em Português.";
    } else if (language === 'en') {
      languageInstructions = "The reason must be written in English.";
    } else if (language === 'it') {
      languageInstructions = "Il motivo (reason) deve essere scritto in Italiano.";
    } else {
      languageInstructions = "O motivo (reason) deve ser escrito em Português.";
    }

    // Passar apenas o ID, nome e ingredientes do catálogo para economizar tokens
    const simplifiedCatalog = catalog.map((p: any) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      ingredients: p.active_ingredients
    }));

    const promptText = `
Você é um Especialista em Recomendação de Produtos de Skincare.
O usuário precisa de uma rotina que contenha os seguintes ingredientes chave: ${recommendedIngredients.join(', ')}

=== CATÁLOGO DISPONÍVEL ===
${JSON.stringify(simplifiedCatalog, null, 2)}

=== TAREFA ===
Cruze a lista de ingredientes que o usuário precisa com os produtos disponíveis no catálogo acima.
Selecione APENAS os produtos do catálogo que atendam a essas necessidades. Não invente produtos que não estejam na lista.
Para cada produto selecionado, dê um motivo curto explicando por que ele foi escolhido com base nos ingredientes.

${languageInstructions}

Retorne ESTRITAMENTE um JSON com este formato (sem crases de markdown):
{
  "recommended_products": [
    {
      "product_id": "id_do_produto_exatamente_como_no_catalogo",
      "reason": "Explicação curta do motivo."
    }
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
              recommended_products: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    product_id: { type: 'STRING' },
                    reason: { type: 'STRING' }
                  },
                  required: ['product_id', 'reason']
                }
              }
            },
            required: ['recommended_products']
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
    console.error('[agent-products] Erro:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
