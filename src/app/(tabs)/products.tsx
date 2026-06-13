import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LocalizationContext';
import { DataService } from '../../services/dataService';
import { UserProduct, Product } from '../../services/mockDb';
import { Plus, Search, Trash2, X, AlertTriangle, Calendar, Star, HelpCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function ProductsScreen() {
  const { user, isPremium } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [cabinet, setCabinet] = useState<UserProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Modal de adição
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [globalCatalog, setGlobalCatalog] = useState<Product[]>([]);
  const [filteredCatalog, setFilteredCatalog] = useState<Product[]>([]);
  
  // Estados para inserção manual
  const [customName, setCustomName] = useState<string>('');
  const [customBrand, setCustomBrand] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<'cleanser' | 'toner' | 'treatment' | 'moisturizer' | 'spf'>('cleanser');
  const [customActives, setCustomActives] = useState<string>('');
  const [openedAt, setOpenedAt] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expiration, setExpiration] = useState<string>('12');

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userProds = await DataService.getUserProducts(user.id);
      setCabinet(userProds);

      const catalog = await DataService.getGlobalProducts();
      setGlobalCatalog(catalog);
    } catch (e) {
      console.warn('Erro ao carregar prateleira', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Filtrar catálogo global com base na query do usuário
  useEffect(() => {
    if (!searchQuery) {
      setFilteredCatalog([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const filtered = globalCatalog.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.brand.toLowerCase().includes(q)
    );
    setFilteredCatalog(filtered);
  }, [searchQuery, globalCatalog]);

  const handleDelete = async (id: string) => {
    Alert.alert(
      t('alert.delete_product_title'),
      t('alert.delete_product_msg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.delete'), 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            await DataService.deleteUserProduct(user?.id || 'guest-user-id', id);
            await loadData();
          }
        }
      ]
    );
  };

  // Verificar limite de plano gratuito antes de adicionar
  const checkLimitBeforeAction = (): boolean => {
    if (!isPremium && cabinet.length >= 5) {
      Alert.alert(
        t('alert.limit_title'),
        t('products.limit_warning'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('settings.upgrade'), onPress: () => router.push('/paywall') }
        ]
      );
      return false;
    }
    return true;
  };

  // Adicionar produto a partir do catálogo global
  const handleAddFromCatalog = async (prod: Product) => {
    if (!checkLimitBeforeAction()) return;

    setLoading(true);
    try {
      await DataService.addUserProduct(user?.id || 'guest-user-id', {
        product_id: prod.id,
        custom_name: prod.name,
        custom_brand: prod.brand,
        custom_category: prod.category,
        custom_active_ingredients: prod.active_ingredients,
        opened_at: new Date().toISOString().split('T')[0],
        expiration_months: 12
      });
      setSearchQuery('');
      setIsAddModalOpen(false);
      await loadData();
    } catch (e) {
      console.warn(e);
      setLoading(false);
    }
  };

  // Adicionar produto manualmente
  const handleManualAdd = async () => {
    if (!customName || !customBrand) {
      Alert.alert(t('common.error'), t('alert.fields_required'));
      return;
    }

    if (!checkLimitBeforeAction()) return;

    setLoading(true);
    // Converter ativos string em array
    const activesArr = customActives
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    try {
      await DataService.addUserProduct(user?.id || 'guest-user-id', {
        product_id: null,
        custom_name: customName,
        custom_brand: customBrand,
        custom_category: customCategory,
        custom_active_ingredients: activesArr,
        opened_at: openedAt || null,
        expiration_months: expiration ? parseInt(expiration, 10) : null
      });

      // Limpar formulário
      setCustomName('');
      setCustomBrand('');
      setCustomActives('');
      setIsAddModalOpen(false);
      await loadData();
    } catch (e) {
      console.warn(e);
      setLoading(false);
    }
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
      <View className="px-6 py-4 flex-row justify-between items-center border-b border-brand-beige">
        <View>
          <Text className="text-2xl font-serif text-brand-bronze font-bold">
            {t('products.title')}
          </Text>
          <Text className="text-xs font-sans text-brand-sage-dark">
            {t('products.subtitle')} ({cabinet.length}/5)
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setIsAddModalOpen(true)}
          className="bg-brand-rose-metallic p-3 rounded-full shadow-sm"
        >
          <Plus size={18} color="white" />
        </TouchableOpacity>
      </View>

      {/* Grid de Produtos cadastrados */}
      {cabinet.length === 0 ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 py-12">
          <View className="flex-1 items-center justify-center py-12 bg-white rounded-[32px] border border-brand-beige">
            <HelpCircle size={48} color="#C6C6C8" />
            <Text className="font-serif text-lg text-brand-charcoal font-bold mt-4">{t('products.empty_title')}</Text>
            <Text className="font-sans text-xs text-brand-sage-dark text-center px-8 mt-2 leading-relaxed">
              {t('products.empty_msg')}
            </Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView className="flex-1 px-6 pt-4">
          <View className="flex-row flex-wrap justify-between pb-24">
            {cabinet.map(item => (
              <View
                key={item.id}
                className="w-[48%] bg-white p-4 border border-brand-beige rounded-3xl mb-4 shadow-sm justify-between min-h-[160px]"
              >
                <View>
                  <Text className="font-sans text-[10px] font-bold text-brand-rose-metallic uppercase tracking-wider">
                    {item.custom_category}
                  </Text>
                  <Text className="font-serif text-sm font-bold text-brand-charcoal mt-1" numberOfLines={2}>
                    {item.custom_name}
                  </Text>
                  <Text className="font-sans text-[11px] text-brand-sage-dark" numberOfLines={1}>
                    {item.custom_brand}
                  </Text>
                  
                  {item.custom_active_ingredients.length > 0 && (
                    <Text className="font-sans text-[10px] text-brand-rose-light mt-2 font-medium" numberOfLines={2}>
                      ✨ {item.custom_active_ingredients.join(', ')}
                    </Text>
                  )}
                </View>

                <View className="flex-row justify-between items-center mt-4 pt-2 border-t border-brand-ivory">
                  <View className="flex-row items-center space-x-1">
                    <Calendar size={12} color="#8E8E93" />
                    <Text className="font-sans text-[10px] text-[#8E8E93]">
                      {item.expiration_months ? `${item.expiration_months}M` : 'N/A'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    className="p-1.5 bg-red-500/10 rounded-lg"
                    accessibilityLabel={t('accessibility.delete_product')}
                  >
                    <Trash2 size={12} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* MODAL ADICIONAR PRODUTO */}
      <Modal
        visible={isAddModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddModalOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white rounded-t-[32px] p-6 h-[88%]">
            
            {/* Header Modal */}
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-serif text-brand-bronze font-bold">
                {t('products.add_modal_title')}
              </Text>
              <TouchableOpacity
                onPress={() => setIsAddModalOpen(false)}
                className="p-2 bg-brand-beige rounded-full"
              >
                <X size={16} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {/* Abas de Busca vs Manual */}
            <ScrollView className="flex-1 space-y-4" keyboardShouldPersistTaps="handled">
              
              {/* Barra de busca */}
              <View className="bg-brand-beige flex-row items-center px-4 py-3 rounded-2xl">
                <Search size={18} color="#8E8E93" className="mr-2" />
                <TextInput
                  placeholder={t('products.search_placeholder')}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  className="flex-1 font-sans text-sm text-brand-charcoal"
                />
              </View>

              {/* Resultados da busca rápida */}
              {searchQuery.length > 0 && (
                <View className="bg-brand-ivory border border-brand-beige rounded-2xl p-2 max-h-[160px]">
                  <ScrollView nestedScrollEnabled={true}>
                    {filteredCatalog.length === 0 ? (
                      <Text className="font-sans text-xs text-brand-sage-dark text-center p-4">
                        {t('products.no_catalog_results')}
                      </Text>
                    ) : (
                      filteredCatalog.map(p => (
                        <TouchableOpacity
                           key={p.id}
                          onPress={() => handleAddFromCatalog(p)}
                          className="flex-row justify-between items-center p-3 border-b border-brand-beige active:bg-brand-beige"
                        >
                          <View>
                            <Text className="font-sans text-xs font-bold text-brand-charcoal">{p.name}</Text>
                            <Text className="font-sans text-[10px] text-brand-sage-dark">{p.brand} • <Text className="capitalize">{p.category}</Text></Text>
                          </View>
                          <Plus size={16} color="#B97C63" />
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>
              )}

              {/* Inserção Manual */}
              <View className="border-t border-brand-beige pt-4">
                <Text className="font-serif text-sm font-bold text-brand-bronze mb-3">
                  {t('products.manual_title')}
                </Text>

                <View className="space-y-3">
                  <View>
                    <Text className="text-xs font-sans font-semibold text-brand-sage-dark mb-1">
                      {t('products.name')} *
                    </Text>
                    <TextInput
                      placeholder="es. Effaclar Duo"
                      value={customName}
                      onChangeText={setCustomName}
                      className="bg-brand-ivory px-4 py-2.5 border border-brand-beige rounded-xl font-sans text-sm"
                    />
                  </View>

                  <View>
                    <Text className="text-xs font-sans font-semibold text-brand-sage-dark mb-1">
                      {t('products.brand')} *
                    </Text>
                    <TextInput
                      placeholder="es. La Roche-Posay"
                      value={customBrand}
                      onChangeText={setCustomBrand}
                      className="bg-brand-ivory px-4 py-2.5 border border-brand-beige rounded-xl font-sans text-sm"
                    />
                  </View>

                  <View>
                    <Text className="text-xs font-sans font-semibold text-brand-sage-dark mb-1">
                      {t('products.category')}
                    </Text>
                    <View className="flex-row flex-wrap justify-between">
                      {(['cleanser', 'toner', 'treatment', 'moisturizer', 'spf'] as const).map(cat => (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => setCustomCategory(cat)}
                          className={`w-[31%] py-2 mb-2 border rounded-xl items-center ${customCategory === cat ? 'bg-brand-rose-light/10 border-brand-rose-metallic' : 'bg-brand-ivory border-brand-beige'}`}
                        >
                          <Text className={`font-sans text-[10px] font-bold capitalize ${customCategory === cat ? 'text-brand-rose-metallic' : 'text-brand-sage-dark'}`}>
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View>
                    <Text className="text-xs font-sans font-semibold text-brand-sage-dark mb-1">
                      {t('products.active_ingredients')}
                    </Text>
                    <TextInput
                      placeholder="es. Retinolo, Vitamina C, Acido Ialuronico"
                      value={customActives}
                      onChangeText={setCustomActives}
                      className="bg-brand-ivory px-4 py-2.5 border border-brand-beige rounded-xl font-sans text-sm"
                    />
                  </View>

                  <View className="flex-row justify-between">
                    <View className="w-[48%]">
                      <Text className="text-xs font-sans font-semibold text-brand-sage-dark mb-1">
                        {t('products.opened')}
                      </Text>
                      <TextInput
                        placeholder="AAAA-MM-GG"
                        value={openedAt}
                        onChangeText={setOpenedAt}
                        className="bg-brand-ivory px-4 py-2.5 border border-brand-beige rounded-xl font-sans text-sm"
                      />
                    </View>

                    <View className="w-[48%]">
                      <Text className="text-xs font-sans font-semibold text-brand-sage-dark mb-1">
                        {t('products.expiration')}
                      </Text>
                      <TextInput
                        placeholder="es. 12"
                        keyboardType="number-pad"
                        value={expiration}
                        onChangeText={setExpiration}
                        className="bg-brand-ivory px-4 py-2.5 border border-brand-beige rounded-xl font-sans text-sm"
                      />
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={handleManualAdd}
              activeOpacity={0.9}
              className="w-full py-4 bg-brand-rose-metallic rounded-full items-center mt-4"
            >
              <Text className="text-white font-sans text-base font-bold">
                {t('products.add_button')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
