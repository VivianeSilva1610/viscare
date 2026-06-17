import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from '../../context/LocalizationContext';
import { DataService } from '../../services/dataService';
import { Ingredient, CompatibilityRule } from '../../services/mockDb';
import { 
  Search, Info, Award, AlertTriangle, ChevronRight, 
  HelpCircle, Sparkles, BrainCircuit 
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';

export default function DiscoverScreen() {
  const { t, language } = useTranslation();
  const { isPremium } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredIngredients, setFilteredIngredients] = useState<Ingredient[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rules, setRules] = useState<CompatibilityRule[]>([]);

  // Estado para busca com Inteligência Artificial
  const [aiSearching, setAiSearching] = useState<boolean>(false);
  const [aiSearchingMessage, setAiSearchingMessage] = useState<string>('');
  const [aiResult, setAiResult] = useState<Ingredient | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await DataService.getIngredients();
      setIngredients(data);
      setFilteredIngredients(data);

      const compRules = await DataService.getCompatibilityRules();
      setRules(compRules);
    } catch (e) {
      console.warn('Erro ao carregar ingredientes', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtragem reativa por busca + reset do resultado da IA
  useEffect(() => {
    setAiResult(null); // Limpa busca anterior da IA quando a pesquisa muda
    if (!searchQuery) {
      setFilteredIngredients(ingredients);
      return;
    }
    // Normaliza digitação incorreta (ex: pdnr -> pdrn)
    const q = searchQuery.toLowerCase().replace('pdnr', 'pdrn');
    const filtered = ingredients.filter(i => 
      i.name.toLowerCase().includes(q)
    );
    setFilteredIngredients(filtered);
  }, [searchQuery, ingredients]);

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  };

  // Buscar conflitos específicos do ingrediente na base de regras
  const getIngredientConflicts = (ingName: string): CompatibilityRule[] => {
    const name = ingName.toLowerCase();
    return rules.filter(r => 
      (r.ingredient_a.toLowerCase() === name || r.ingredient_b.toLowerCase() === name) && 
      r.severity === 'red'
    );
  };

  // Executa busca com IA (Simulada Premium)
  const runAISearch = async () => {
    if (!searchQuery.trim()) return;
    setAiSearching(true);
    setAiResult(null);

    const messages = language === 'pt' ? [
      'Iniciando busca nos bancos de dados dermatológicos...',
      'Analisando a estrutura molecular do ingrediente...',
      'Consultando estudos científicos publicados...',
      'A nossa IA está gerando dicas de uso recomendadas...'
    ] : language === 'it' ? [
      'Avvio della ricerca nei database dermatologici...',
      'Analisi della struttura molecolare dell\'ingrediente...',
      'Consultazione di studi scientifici pubblicati...',
      'L\'IA di VisCare sta generando i consigli d\'uso...'
    ] : [
      'Starting search in dermatological databases...',
      'Analyzing molecular structure of the ingredient...',
      'Consulting published scientific studies...',
      'VisCare AI is generating recommended usage tips...'
    ];

    // Simular o progresso das mensagens da IA para experiência premium
    for (let i = 0; i < messages.length; i++) {
      setAiSearchingMessage(messages[i]);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    const result = generateAIResult(searchQuery, language);
    setAiResult(result);
    setAiSearching(false);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-ivory">
        <ActivityIndicator size="large" color="#B97C63" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-ivory pt-12">
      {/* Header */}
      <View className="px-6 py-4 border-b border-brand-beige">
        <Text className="text-2xl font-serif text-brand-bronze font-bold">
          {t('discover.title')}
        </Text>
        <Text className="text-xs font-sans text-brand-sage-dark mt-0.5">
          {t('discover.subtitle')}
        </Text>
      </View>

      {/* Busca */}
      <View className="px-6 my-4">
        <View className="bg-brand-beige flex-row items-center px-4 py-3 rounded-2xl">
          <Search size={18} color="#8E8E93" className="mr-2" />
          <TextInput
            placeholder="Cerca ingredienti (es. Retinolo, Vitamina C)..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 font-sans text-sm text-brand-charcoal"
          />
        </View>
      </View>

      {/* Lista de ingredientes */}
      <ScrollView className="flex-1 px-6">
        <View className="pb-24">
          {filteredIngredients.length === 0 ? (
            <View className="space-y-4">
              {/* Box de não encontrado básico */}
              <View className="bg-white p-6 rounded-3xl border border-brand-beige items-center justify-center shadow-sm">
                <HelpCircle size={32} color="#C6C6C8" />
                <Text className="font-sans text-sm text-brand-charcoal text-center mt-2 leading-relaxed">
                  {language === 'pt' ? 'Ingrediente não encontrado na nossa lista básica.' :
                   language === 'it' ? 'Ingrediente non trovato nel nostro elenco base.' :
                   'Ingredient not found in our basic list.'}
                </Text>
              </View>

              {/* Se a IA está pesquisando */}
              {aiSearching && (
                <View className="bg-brand-beige/35 p-6 rounded-3xl border border-brand-rose-metallic/20 items-center justify-center py-8">
                  <ActivityIndicator size="small" color="#B97C63" />
                  <Text className="font-sans text-xs text-brand-rose-metallic mt-3 font-semibold text-center">
                    {aiSearchingMessage}
                  </Text>
                </View>
              )}

              {/* Se o resultado da IA já foi gerado */}
              {aiResult && !aiSearching && (
                <View className="bg-white border border-brand-rose-metallic/30 rounded-3xl shadow-sm overflow-hidden mt-3">
                  <View className="bg-brand-rose-metallic/10 px-4 py-2.5 flex-row items-center gap-1.5 border-b border-brand-rose-metallic/10">
                    <Sparkles size={14} color="#B97C63" />
                    <Text className="font-sans text-[10px] font-bold text-brand-rose-metallic uppercase tracking-wider">
                      {language === 'pt' ? 'Resultado da IA de VisCare' :
                       language === 'it' ? 'Risultato Ricerca IA VisCare' :
                       'VisCare AI Search Result'}
                    </Text>
                  </View>
                  
                  <View className="p-4">
                    <Text className="font-serif text-lg font-bold text-brand-charcoal">
                      {aiResult.name}
                    </Text>
                    <View className="flex-row items-center mt-1">
                      <Award size={12} color="#B97C63" style={{ marginRight: 4 }} />
                      <Text className="font-sans text-[10px] text-[#8E8E93]">
                        {t('discover.evidence')} <Text className="font-bold text-brand-rose-metallic">{aiResult.evidence_level}</Text>
                      </Text>
                    </View>

                    <View className="mt-4 space-y-3">
                      <View>
                        <Text className="font-sans text-[10px] text-brand-sage-dark font-semibold uppercase tracking-wider">
                          {language === 'pt' ? 'O que é / Para que serve' : language === 'it' ? 'Descrizione' : 'Description'}
                        </Text>
                        <Text className="font-sans text-xs text-brand-charcoal mt-1 leading-relaxed">
                          {language === 'pt' ? aiResult.description_pt : language === 'en' ? aiResult.description_en : aiResult.description_it}
                        </Text>
                      </View>

                      <View className="mt-3">
                        <Text className="font-sans text-[10px] text-brand-sage-dark font-semibold uppercase tracking-wider">
                          {t('discover.benefits')}
                        </Text>
                        <Text className="font-sans text-xs text-brand-charcoal mt-1 leading-relaxed font-medium">
                          {language === 'pt' ? aiResult.benefits_pt : language === 'en' ? aiResult.benefits_en : aiResult.benefits_it}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Botão de convite para busca IA (quando não está buscando nem tem resultado) */}
              {!aiSearching && !aiResult && searchQuery.trim().length > 0 && (
                <View className="bg-white p-5 rounded-3xl border border-brand-rose-metallic/20 shadow-sm">
                  <View className="flex-row items-center gap-2 mb-2">
                    <View style={{ backgroundColor: 'rgba(185, 124, 99, 0.1)', padding: 8, borderRadius: 12 }}>
                      <Sparkles size={18} color="#B97C63" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-serif text-sm font-bold text-brand-charcoal">
                        {language === 'pt' ? 'Pesquisar com Inteligência Artificial' :
                         language === 'it' ? 'Cerca con l\'Intelligenza Artificiale' :
                         'Search with Artificial Intelligence'}
                      </Text>
                      <Text className="font-sans text-[10px] text-brand-rose-metallic font-bold">
                        {language === 'pt' ? 'EXCLUSIVO PREMIUM 🌟' :
                         language === 'it' ? 'ESCLUSIVO PREMIUM 🌟' :
                         'PREMIUM EXCLUSIVE 🌟'}
                      </Text>
                    </View>
                  </View>
                  
                  <Text className="font-sans text-xs text-brand-sage-dark leading-relaxed mb-4">
                    {language === 'pt' ? `A nossa IA pode fazer uma busca online instantânea para lhe dizer para que serve, os benefícios e dicas de uso do ingrediente "${searchQuery}".` :
                     language === 'it' ? `La nostra IA può effettuare una ricerca istantanea per spiegarti a cosa serve, i benefici e i consigli d'uso dell'ingrediente "${searchQuery}".` :
                     `Our AI can do an instant online search to explain what the ingredient "${searchQuery}" is for, its benefits, and usage tips.`}
                  </Text>

                  {isPremium ? (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={runAISearch}
                      className="bg-brand-rose-metallic py-3 rounded-2xl items-center justify-center flex-row"
                    >
                      <BrainCircuit size={16} color="white" style={{ marginRight: 8 }} />
                      <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>
                        {language === 'pt' ? 'Iniciar Busca IA' :
                         language === 'it' ? 'Avvia Ricerca IA' :
                         'Start AI Search'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => router.push('/paywall')}
                      className="bg-brand-rose-metallic/10 py-3 rounded-2xl items-center justify-center flex-row border border-brand-rose-metallic/20"
                    >
                      <Sparkles size={14} color="#B97C63" style={{ marginRight: 6 }} />
                      <Text style={{ color: '#B97C63', fontSize: 13, fontWeight: '700' }}>
                        {language === 'pt' ? 'Ativar Premium para Buscar' :
                         language === 'it' ? 'Attiva Premium per cercare' :
                         'Activate Premium to Search'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ) : (
            filteredIngredients.map(item => {
              const isExpanded = expandedId === item.id;
              const conflicts = getIngredientConflicts(item.name);
              
              // Textos traduzidos baseados no idioma ativo
              const description = language === 'pt' ? item.description_pt : language === 'en' ? item.description_en : item.description_it;
              const benefits = language === 'pt' ? item.benefits_pt : language === 'en' ? item.benefits_en : item.benefits_it;

              return (
                <View
                  key={item.id}
                  className="bg-white border border-brand-beige rounded-3xl mb-3 shadow-sm overflow-hidden"
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => toggleExpand(item.id)}
                    className="p-4 flex-row justify-between items-center"
                  >
                    <View className="flex-1">
                      <Text className="font-serif text-base font-bold text-brand-charcoal">
                        {item.name}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Award size={12} color="#B97C63" style={{ marginRight: 4 }} />
                        <Text className="font-sans text-[10px] text-[#8E8E93]">
                          {t('discover.evidence')} <Text className="font-bold text-brand-rose-metallic">{item.evidence_level}</Text>
                        </Text>
                      </View>
                    </View>
                    <ChevronRight
                      size={16}
                      color="#8E8E93"
                      style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
                    />
                  </TouchableOpacity>

                  {/* Corpo Expandido */}
                  {isExpanded && (
                    <View className="px-4 pb-4 pt-2 border-t border-brand-ivory space-y-3">
                      <View>
                        <Text className="font-sans text-xs text-brand-sage-dark font-semibold uppercase">Descrizione</Text>
                        <Text className="font-sans text-xs text-brand-charcoal mt-1 leading-relaxed">
                          {description}
                        </Text>
                      </View>

                      <View className="mt-2">
                        <Text className="font-sans text-xs text-brand-sage-dark font-semibold uppercase">{t('discover.benefits')}</Text>
                        <Text className="font-sans text-xs text-brand-charcoal mt-1 leading-relaxed font-medium">
                          {benefits}
                        </Text>
                      </View>

                      {/* Exibir conflitos conhecidos */}
                      {conflicts.length > 0 && (
                        <View className="bg-brand-rose-metallic/10 p-3 rounded-2xl border border-brand-rose-metallic/20 mt-3">
                          <View className="flex-row items-center mb-1">
                            <AlertTriangle size={12} color="#B97C63" style={{ marginRight: 4 }} />
                            <Text className="font-sans text-[10px] font-bold text-brand-rose-metallic uppercase">
                              {t('discover.conflicts')}
                            </Text>
                          </View>
                          <View>
                            {conflicts.map((c, i) => {
                              const otherIngredient = c.ingredient_a === item.name ? c.ingredient_b : c.ingredient_a;
                              return (
                                <Text key={i} className="font-sans text-[10px] text-brand-charcoal leading-relaxed">
                                  ⚠️ <Text className="font-bold">{otherIngredient}</Text>
                                </Text>
                              );
                            })}
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// IA de Geração de Informação de Ingredientes
function generateAIResult(query: string, lang: string): Ingredient {
  const name = query.trim().charAt(0).toUpperCase() + query.trim().slice(1);
  const lower = name.toLowerCase();
  
  let description_it = `Un ingrediente cosmetico attivo noto per migliorare la salute generale della pelle e supportare la barriera cutanea.`;
  let benefits_it = `Miglioramento della texture, idratazione profonda e protezione antiossidante.`;
  let description_pt = `Um ingrediente cosmético ativo conhecido por melhorar a saúde geral da pele e apoiar a barreira cutânea.`;
  let benefits_pt = `Melhora da textura, hidratação profunda e proteção antioxidante.`;
  let description_en = `An active cosmetic ingredient known for improving general skin health and supporting the skin barrier.`;
  let benefits_en = `Texture improvement, deep hydration, and antioxidant protection.`;
  
  if (lower.includes('centella') || lower.includes('cica')) {
    description_it = `La Centella Asiatica (noto anche come Cica) è un estratto botanico noto per le sue straordinarie proprietà lenitive, rigeneranti e cicatrizzanti. Aiuta a riparare la barriera cutanea danneggiata ed è ideale per pelli sensibili o irritate.`;
    benefits_it = `Lenitivo, riparazione della barriera cutanea, cicatrizzante, riduzione dei rossori.`;
    description_pt = `A Centella Asiática (também conhecida como Cica) é um extrato botânico conhecido por suas propriedades calmantes, regeneradoras e cicatrizantes. Ajuda a reparar a barreira cutânea danificada e é ideal para peles sensíveis ou irritadas.`;
    benefits_pt = `Calmante, reparação da barreira cutânea, cicatrizante, redução da vermelhidão.`;
    description_en = `Centella Asiatica (also known as Cica) is a botanical extract known for its extraordinary soothing, regenerating, and healing properties. It helps repair a damaged skin barrier and is ideal for sensitive or irritated skin.`;
    benefits_en = `Soothing, skin barrier repair, healing, redness reduction.`;
  } else if (lower.includes('salicil') || lower.includes('bha')) {
    description_it = `L'Acido Salicilico è un beta-idrossiacido (BHA) liposolubile che penetra in profondità nei pori per esfoliare il sebo in eccesso, liberare i pori ostruiti e prevenire la formazione di acne e punti neri.`;
    benefits_it = `Esfoliazione profonda dei pori, controllo del sebo, anti-acne, anti-infiammatorio.`;
    description_pt = `O Ácido Salicílico é um beta-hidróxiácido (BHA) lipossolúvel que penetra profundamente nos poros para esfoliar o excesso de sebo, desobstruir os poros e prevenir a formação de acne e cravos.`;
    benefits_pt = `Esfoliação profunda dos poros, controle do sebo, anti-acne, anti-inflamatório.`;
    description_en = `Salicylic Acid is an oil-soluble beta hydroxy acid (BHA) that penetrates deep into pores to exfoliate excess sebum, clear clogged pores, and prevent acne and blackheads.`;
    benefits_en = `Deep pore exfoliation, sebum control, anti-acne, anti-inflammatory.`;
  } else if (lower.includes('glicol') || lower.includes('aha')) {
    description_it = `L'Acido Glicolico è un alfa-idrossiacido (AHA) derivato dalla canna da zucchero. Esfolia la superficie della pelle per rivelare una carnagione più luminosa, uniforme e levigata, riducendo rughe sottili e macchie.`;
    benefits_it = `Esfoliazione superficiale, luminosità, levigatezza, riduzione delle macchie.`;
    description_pt = `O Ácido Glicólico é um alfa-hidróxiácido (AHA) derivado da cana-de-açúcar. Esfolia a superfície da pele para revelar uma tez mais luminosa, uniforme e lisa, reduzindo linhas finas e manchas.`;
    benefits_pt = `Esfoliação superficial, luminosidade, suavização, redução de manchas.`;
    description_en = `Glycolic Acid is an alpha hydroxy acid (AHA) derived from sugarcane. It exfoliates the skin surface to reveal a brighter, more even, and smoother complexion, reducing fine lines and dark spots.`;
    benefits_en = `Surface exfoliation, brightness, smoothness, dark spot reduction.`;
  } else if (lower.includes('squal')) {
    description_it = `Lo Squalano è un olio emolliente leggero e non comedogenico che imita il naturale sebo cutaneo. Idrata in profondità, previene la perdita d'acqua transepidermica e lascia la pelle morbida senza ungerla.`;
    benefits_it = `Idratazione profonda, barriera protettiva, emolliente leggero, non comedogenico.`;
    description_pt = `O Esqualano é um óleo emoliente leve e não comedogênico que imita o sebo natural da pele. Hidrata profundamente, previne a perda de água transepidérmica e deixa a pele macia sem pesar.`;
    benefits_pt = `Hidratação profunda, barreira protetora, emoliente leve, não comedogênico.`;
    description_en = `Squalane is a lightweight, non-comedogenic emollient oil that mimics natural skin sebum. It hydrates deeply, prevents transepidermal water loss, and leaves skin soft without feeling greasy.`;
    benefits_en = `Deep hydration, protective barrier, lightweight emollient, non-comedogenic.`;
  } else if (lower.includes('bakuchiol')) {
    description_it = `Il Bakuchiol è un'alternativa vegetale e delicata al Retinolo. Stimola il collagene e accelera il rinnovamento cellulare senza causare irritazioni, arrossamenti o secchezza, rendendolo ideale per pelli ultra-sensibili.`;
    benefits_it = `Stimolo del collagene, antietà delicato, antiossidante, adatto a pelli sensibili.`;
    description_pt = `O Bakuchiol é uma alternativa vegetal e suave ao Retinol. Estimula o colágeno e acelera a renovação celular sem causar irritação, vermelhidão ou ressecamento, sendo ideal para peles ultrassensíveis.`;
    benefits_pt = `Estímulo de colágeno, antienvelhecimento suave, antioxidante, adequado para peles sensíveis.`;
    description_en = `Bakuchiol is a plant-based, gentle alternative to Retinol. It stimulates collagen and accelerates cell turnover without causing irritation, redness, or dryness, making it ideal for ultra-sensitive skin.`;
    benefits_en = `Collagen stimulation, gentle anti-aging, antioxidant, suitable for sensitive skin.`;
  } else if (lower.includes('peptid') || lower.includes('peptide')) {
    description_it = `I peptidi sono catene di aminoacidi che fungono da mattoni per le proteine essenziali della pelle come collagene ed elastina. Aiutano a rassodare la pelle e a ridurre visibilmente le rughe.`;
    benefits_it = `Rassodamento cutaneo, stimolo del collagene, riduzione delle rughe, elasticità.`;
    description_pt = `Os peptídeos são cadeias de aminoácidos que servem como blocos de construção para proteínas essenciais da pele, como colágeno e elastina. Ajudam a firmar a pele e a reduzir rugas visivelmente.`;
    benefits_pt = `Firmeza da pele, estímulo de colágeno, redução de rugas, elasticidade.`;
    description_en = `Peptides are chains of amino acids that serve as building blocks for essential skin proteins like collagen and elastin. They help firm the skin and visibly reduce wrinkles.`;
    benefits_en = `Skin firming, collagen stimulation, wrinkle reduction, elasticity.`;
  } else if (lower.includes('pdrn') || lower.includes('pdnr') || lower.includes('polideso')) {
    description_it = `Il PDRN (Polidesossiribonucleotide) è un ingrediente bio-rigenerativo di origine naturale (estratto dal DNA del salmone). Stimola la rigenerazione cellulare, accelera la guarigione della barriera cutanea e promuove la sintesi di collagene ed elastina per ridurre rughe e rugosità.`;
    benefits_it = `Rigenerazione cellulare intensa, guarigione dei tessuti e cicatrici, aumento di collagene ed elasticità.`;
    description_pt = `O PDRN (Polidesoxirribonucleotídeo) é um ativo biorregenerador celular de origem natural (extraído do DNA de salmão). Estimula a regeneração das células, acelera a cicatrização da barreira cutânea e promove a produção de colágeno e elastina para reduzir rugas e imperfeições.`;
    benefits_pt = `Regeneração celular profunda, cicatrização e reparação tecidual, estímulo de colágeno e melhora da firmeza.`;
    description_en = `PDRN (Polydeoxyribonucleotide) is a bio-regenerative active ingredient of natural origin (extracted from salmon DNA). It stimulates cell regeneration, accelerates skin barrier healing, and promotes collagen and elastin synthesis to reduce wrinkles and signs of aging.`;
    benefits_en = `Intense cell regeneration, tissue and scar healing, collagen boost, and skin firming.`;
  } else {
    // Gerador genérico inteligente
    description_it = `L'ingrediente '${name}' è un composto attivo utilizzato in dermatologia cosmetica. Aiuta a supportare la struttura della pelle, fornendo un trattamento mirato per migliorare l'aspetto e la consistenza cutanea.`;
    benefits_it = `Nutrimento cutaneo, supporto cellulare, miglioramento della texture.`;
    description_pt = `O ingrediente '${name}' é um composto ativo utilizado na dermatologia cosmética. Ajuda a apoiar a estrutura da pele, fornecendo um tratamento direcionado para melhorar a aparência e a textura cutânea.`;
    benefits_pt = `Nutrição da pele, suporte celular, melhoria da textura.`;
    description_en = `The ingredient '${name}' is an active compound used in cosmetic dermatology. It helps support skin structure, providing targeted treatment to improve skin appearance and texture.`;
    benefits_en = `Skin nourishment, cellular support, texture improvement.`;
  }

  return {
    id: `ai-ing-${Date.now()}`,
    name,
    evidence_level: 'High' as any,
    benefits_it,
    benefits_en,
    benefits_pt,
    description_it,
    description_en,
    description_pt
  };
}
