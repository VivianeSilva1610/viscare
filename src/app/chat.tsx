import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LocalizationContext';
import { DataService } from '../services/dataService';
import { supabase } from '../services/supabase';
import { ArrowLeft, Send, Sparkles, Lock } from 'lucide-react-native';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export default function ChatScreen() {
  const { user, profile, isPremium, refreshProfile } = useAuth();
  const { language } = useTranslation();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const isUnlimited = user?.email?.toLowerCase() === 'viroedu@gmail.com';
  const topupQuestionsLeft = profile?.topup_vis_questions ?? 0;
  const usingTopupCredit = !isPremium && !isUnlimited && topupQuestionsLeft > 0;
  const hasAccess = isPremium || isUnlimited || usingTopupCredit;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userContext, setUserContext] = useState<any>({});

  // Mensagem de boas-vindas da Vis
  useEffect(() => {
    if (!hasAccess) return;
    const welcome =
      language === 'pt'
        ? '👋 Olá! Eu sou a Vis, sua assistente de skincare pessoal! Posso te ajudar com dúvidas sobre ingredientes, rotinas, ou o que você quiser saber sobre cuidados com a pele. Como posso te ajudar hoje? ✨'
        : language === 'it'
        ? "👋 Ciao! Sono Vis, la tua assistente skincare personale! Posso aiutarti con domande su ingredienti, routine o qualsiasi cosa sulla cura della pelle. Come posso aiutarti oggi? ✨"
        : "👋 Hi! I'm Vis, your personal skincare assistant! I can help you with questions about ingredients, routines, or anything about skin care. How can I help you today? ✨";

    setMessages([{ id: 'welcome', role: 'model', text: welcome, timestamp: new Date() }]);
    loadUserContext();
  }, []);

  const loadUserContext = async () => {
    if (!user) return;
    try {
      const [skinProfile, scans] = await Promise.all([
        DataService.getSkinProfile(user.id),
        DataService.getFacialScans(user.id),
      ]);
      const lastScan = scans?.length > 0 ? scans[scans.length - 1] : null;
      setUserContext({
        skinProfile,
        lastAnalysis: lastScan
          ? { hydration: lastScan.hydration, acne: lastScan.acne, wrinkles: lastScan.wrinkles, sensitivity: lastScan.sensitivity }
          : null,
      });
    } catch (e) {
      console.warn('Erro ao carregar contexto para o chat:', e);
    }
  };

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || isTyping) return;

    const userMsg: Message = { id: `user-${Date.now()}`, role: 'user', text, timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setIsTyping(true);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const history = newMessages.slice(1).map((m) => ({ role: m.role, text: m.text }));
      const { data, error } = await supabase.functions.invoke('agent-support', {
        body: { userId: user?.id, userMessage: text, history, userContext, language },
      });

      const replyText =
        error || !data?.reply
          ? language === 'pt' ? 'Desculpe, tive um problema. Tente novamente! 😊'
          : language === 'it' ? 'Scusa, ho avuto un problema. Riprova! 😊'
          : 'Sorry, I had trouble responding. Please try again! 😊'
          : data.reply;

      setMessages((prev) => [...prev, { id: `vis-${Date.now()}`, role: 'model', text: replyText, timestamp: new Date() }]);

      // Atualiza o perfil pra refletir o consumo do crédito avulso (se for o
      // caso) em toda a app — inclusive o selo/contador na tela inicial.
      if (usingTopupCredit) await refreshProfile();
    } catch (e) {
      console.warn('Erro no chat:', e);
    } finally {
      setIsTyping(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    }
  };

  const QUICK_SUGGESTIONS = {
    pt: ['O que é Niacinamida?', 'Posso usar Retinol de dia?', 'Como reduzir acne?'],
    it: ["Cos'è la Niacinamide?", 'Posso usare il Retinolo di giorno?', "Come ridurre l'acne?"],
    en: ['What is Niacinamide?', 'Can I use Retinol during the day?', 'How to reduce acne?'],
  };
  const suggestions = QUICK_SUGGESTIONS[language as 'pt' | 'it' | 'en'] ?? QUICK_SUGGESTIONS.pt;

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View className={`flex-row my-1.5 px-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
        {/* Avatar da Vis */}
        {!isUser && (
          <View className="w-8 h-8 rounded-full bg-brand-rose-metallic items-center justify-center mr-2 self-end mb-0.5">
            <Sparkles size={14} color="#FFF" />
          </View>
        )}
        <View
          className={`max-w-[75%] px-4 py-3 shadow-sm ${
            isUser
              ? 'bg-brand-rose-metallic rounded-[18px] rounded-br-[4px]'
              : 'bg-white rounded-[18px] rounded-bl-[4px] border border-brand-beige'
          }`}
        >
          <Text className={`font-sans text-sm leading-5 ${isUser ? 'text-white' : 'text-brand-charcoal'}`}>
            {item.text}
          </Text>
          <Text className={`text-[10px] font-sans mt-1 self-end ${isUser ? 'text-white/60' : 'text-brand-sage-dark'}`}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  // Na web, KeyboardAvoidingView não é necessário
  const Wrapper = Platform.OS === 'web' ? View : KeyboardAvoidingView;
  const wrapperProps = Platform.OS === 'web'
    ? { style: { flex: 1 } }
    : { behavior: Platform.OS === 'ios' ? 'padding' : 'height', style: { flex: 1 }, keyboardVerticalOffset: 0 };

  if (!hasAccess) {
    return (
      <SafeAreaView className="flex-1 bg-brand-ivory">
        <StatusBar style="dark" />
        <View className="flex-row items-center px-4 py-3 border-b border-brand-beige bg-brand-ivory">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <ArrowLeft size={22} color="#3D2B1F" />
          </TouchableOpacity>
          <Text className="font-sans text-base font-bold text-brand-charcoal">Vis</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 rounded-2xl bg-brand-rose-metallic/10 items-center justify-center mb-5">
            <Lock size={28} color="#B97C63" />
          </View>
          <Text className="font-serif text-xl font-bold text-brand-charcoal text-center mb-2">
            {language === 'pt' ? 'Converse com a Vis é Premium' : language === 'it' ? 'Parlare con Vis è Premium' : 'Chatting with Vis is Premium'}
          </Text>
          <Text className="font-sans text-sm text-brand-sage-dark text-center leading-5 mb-7">
            {language === 'pt'
              ? 'Assine o Premium pra tirar dúvidas ilimitadas sobre skincare com a Vis, a qualquer hora.'
              : language === 'it'
              ? 'Abbonati al Premium per fare domande illimitate sulla skincare a Vis, in qualsiasi momento.'
              : 'Subscribe to Premium to ask Vis unlimited skincare questions, anytime.'}
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/paywall')}
            className="bg-brand-rose-metallic px-8 py-3.5 rounded-full"
          >
            <Text className="font-sans text-sm font-bold text-white">
              {language === 'pt' ? 'Ver planos Premium' : language === 'it' ? 'Vedi i piani Premium' : 'See Premium plans'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-ivory">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-brand-beige bg-brand-ivory">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <ArrowLeft size={22} color="#3D2B1F" />
        </TouchableOpacity>
        <View className="w-10 h-10 rounded-full bg-brand-rose-metallic items-center justify-center mr-3">
          <Sparkles size={20} color="#FFF" />
        </View>
        <View>
          <Text className="font-sans text-base font-bold text-brand-charcoal">Vis</Text>
          <Text className="font-sans text-[11px] text-brand-rose-metallic">
            {language === 'pt' ? '✨ Assistente de Skincare' : language === 'it' ? '✨ Assistente Skincare' : '✨ Skincare Assistant'}
          </Text>
        </View>
      </View>

      {/* Aviso de créditos avulsos (só pra quem não é Premium) */}
      {usingTopupCredit && (
        <View className="bg-brand-rose-metallic/10 px-4 py-2 border-b border-brand-beige">
          <Text className="font-sans text-xs text-brand-rose-metallic text-center font-semibold">
            {language === 'pt'
              ? `${topupQuestionsLeft} pergunta${topupQuestionsLeft === 1 ? '' : 's'} avulsa${topupQuestionsLeft === 1 ? '' : 's'} restante${topupQuestionsLeft === 1 ? '' : 's'}`
              : language === 'it'
              ? `${topupQuestionsLeft} domanda${topupQuestionsLeft === 1 ? '' : 'e'} extra rimanent${topupQuestionsLeft === 1 ? 'e' : 'i'}`
              : `${topupQuestionsLeft} extra question${topupQuestionsLeft === 1 ? '' : 's'} left`}
          </Text>
        </View>
      )}

      {/* @ts-ignore — wrapperProps varia por plataforma */}
      <Wrapper {...wrapperProps}>
        {/* Mensagens */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 12 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Indicador "Vis está digitando..." */}
        {isTyping && (
          <View className="flex-row items-center px-6 pb-2">
            <ActivityIndicator size="small" color="#B97C63" />
            <Text className="ml-2 font-sans text-xs text-brand-sage-dark italic">
              {language === 'pt' ? 'Vis está digitando...' : language === 'it' ? 'Vis sta scrivendo...' : 'Vis is typing...'}
            </Text>
          </View>
        )}

        {/* Sugestões rápidas (apenas no início) */}
        {messages.length === 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
            className="flex-grow-0 mb-2"
          >
            {suggestions.map((suggestion) => (
              <TouchableOpacity
                key={suggestion}
                onPress={() => setInputText(suggestion)}
                className="bg-white border border-brand-beige px-3 py-2 rounded-2xl"
              >
                <Text className="font-sans text-xs text-brand-rose-metallic">{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input de Mensagem */}
        <View className="flex-row items-center px-3 py-2.5 border-t border-brand-beige bg-brand-ivory gap-2.5">
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={sendMessage}
            placeholder={
              language === 'pt' ? 'Pergunte algo sobre sua pele...'
              : language === 'it' ? 'Chiedi qualcosa sulla tua pelle...'
              : 'Ask something about your skin...'
            }
            placeholderTextColor="#8C8E78"
            multiline
            className="flex-1 bg-white rounded-[22px] px-4 py-2.5 font-sans text-sm text-brand-charcoal border border-brand-beige"
            style={{ maxHeight: 100 }}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!inputText.trim() || isTyping}
            className={`w-11 h-11 rounded-full items-center justify-center ${
              !inputText.trim() || isTyping ? 'bg-brand-beige' : 'bg-brand-rose-metallic'
            }`}
          >
            <Send size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </Wrapper>
    </SafeAreaView>
  );
}
