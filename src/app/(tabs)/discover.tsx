import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from '../../context/LocalizationContext';
import { DataService } from '../../services/dataService';
import { Ingredient, CompatibilityRule } from '../../services/mockDb';
import { Search, Info, Award, AlertTriangle, ChevronRight, HelpCircle } from 'lucide-react-native';

export default function DiscoverScreen() {
  const { t, language } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredIngredients, setFilteredIngredients] = useState<Ingredient[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rules, setRules] = useState<CompatibilityRule[]>([]);

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

  // Filtragem reativa por busca
  useEffect(() => {
    if (!searchQuery) {
      setFilteredIngredients(ingredients);
      return;
    }
    const q = searchQuery.toLowerCase();
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

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#FAF9F6]">
        <ActivityIndicator size="large" color="#8F9779" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#FAF9F6] pt-12">
      {/* Header */}
      <View className="px-6 py-4 border-b border-[#F2F0EB]">
        <Text className="text-2xl font-serif text-[#2C2C2E] font-bold">
          {t('discover.title')}
        </Text>
        <Text className="text-xs font-sans text-[#8E8E93] mt-0.5">
          {t('discover.subtitle')}
        </Text>
      </View>

      {/* Busca */}
      <View className="px-6 my-4">
        <View className="bg-[#F2F0EB] flex-row items-center px-4 py-3 rounded-2xl">
          <Search size={18} color="#8E8E93" className="mr-2" />
          <TextInput
            placeholder="Cerca ingredienti (es. Retinolo, Vitamina C)..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 font-sans text-sm text-[#2C2C2E]"
          />
        </View>
      </View>

      {/* Lista de ingredientes */}
      <ScrollView className="flex-1 px-6">
        <View className="pb-24">
          {filteredIngredients.length === 0 ? (
            <View className="bg-white p-8 rounded-3xl border border-[#F2F0EB] items-center justify-center my-6">
              <HelpCircle size={40} color="#C6C6C8" />
              <Text className="font-sans text-sm text-[#8E8E93] text-center mt-2 leading-relaxed">
                Nessun ingrediente trovato. Prova con un altro termine.
              </Text>
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
                  className="bg-white border border-[#F2F0EB] rounded-3xl mb-3 shadow-sm overflow-hidden"
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => toggleExpand(item.id)}
                    className="p-4 flex-row justify-between items-center"
                  >
                    <View className="flex-1">
                      <Text className="font-serif text-base font-bold text-[#2C2C2E]">
                        {item.name}
                      </Text>
                      <View className="flex-row items-center mt-1 space-x-1">
                        <Award size={12} color="#8F9779" />
                        <Text className="font-sans text-[10px] text-[#8E8E93]">
                          {t('discover.evidence')} <Text className="font-bold text-[#8F9779]">{item.evidence_level}</Text>
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
                    <View className="px-4 pb-4 pt-2 border-t border-[#FAF9F6] space-y-3">
                      <View>
                        <Text className="font-sans text-xs text-[#8E8E93] font-semibold uppercase">Descrizione</Text>
                        <Text className="font-sans text-xs text-[#2C2C2E] mt-1 leading-relaxed">
                          {description}
                        </Text>
                      </View>

                      <View>
                        <Text className="font-sans text-xs text-[#8E8E93] font-semibold uppercase">{t('discover.benefits')}</Text>
                        <Text className="font-sans text-xs text-[#2C2C2E] mt-1 leading-relaxed font-medium">
                          {benefits}
                        </Text>
                      </View>

                      {/* Exibir conflitos conhecidos */}
                      {conflicts.length > 0 && (
                        <View className="bg-[#D97D64]/10 p-3 rounded-2xl border border-[#D97D64]/20">
                          <View className="flex-row items-center space-x-1 mb-1">
                            <AlertTriangle size={12} color="#D97D64" />
                            <Text className="font-sans text-[10px] font-bold text-[#D97D64] uppercase">
                              {t('discover.conflicts')}
                            </Text>
                          </View>
                          <View className="space-y-1">
                            {conflicts.map((c, i) => {
                              const otherIngredient = c.ingredient_a === item.name ? c.ingredient_b : c.ingredient_a;
                              return (
                                <Text key={i} className="font-sans text-[10px] text-[#2C2C2E] leading-relaxed">
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
