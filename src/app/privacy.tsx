import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

export default function PrivacyScreen() {
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/onboarding');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F4F1' }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EDE8E4',
        backgroundColor: '#F8F4F1',
        paddingTop: Platform.OS === 'ios' ? 0 : 40,
      }}>
        <TouchableOpacity
          onPress={handleBack}
          style={{
            padding: 8,
            backgroundColor: '#EDE8E4',
            borderRadius: 999,
            marginRight: 16,
          }}
        >
          <ChevronLeft size={18} color="#8E8E93" />
        </TouchableOpacity>
        <Text style={{
          fontSize: 18,
          fontWeight: '700',
          color: '#B97C63',
          fontFamily: 'Playfair Display',
        }}>
          Política de Privacidade
        </Text>
      </View>

      {/* Conteúdo */}
      <ScrollView
        contentContainerStyle={{
          padding: 24,
          paddingBottom: 60,
          maxWidth: 800,
          alignSelf: 'center',
          width: '100%',
        }}
        showsVerticalScrollIndicator={true}
      >
        <Text style={{
          fontSize: 28,
          fontWeight: '700',
          color: '#B97C63',
          fontFamily: 'Playfair Display',
          marginBottom: 8,
        }}>
          Política de Privacidade – VisCare
        </Text>

        <Text style={{
          fontSize: 12,
          color: '#8E8E93',
          fontFamily: 'Poppins',
          marginBottom: 24,
        }}>
          Última atualização: 17 de Junho de 2026
        </Text>

        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 20,
        }}>
          Bem-vindo ao <Text style={{ fontWeight: '600' }}>VisCare</Text>. A sua privacidade é importante para nós. Esta Política de Privacidade explica como coletamos, utilizamos, armazenamos e protegemos suas informações ao utilizar nosso aplicativo.
        </Text>

        {/* Seção 1 */}
        <Text style={{
          fontSize: 18,
          fontWeight: '700',
          color: '#B97C63',
          fontFamily: 'Playfair Display',
          marginTop: 20,
          marginBottom: 12,
        }}>
          1. Informações que coletamos
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          Podemos coletar as seguintes informações:
        </Text>

        <Text style={{
          fontSize: 15,
          fontWeight: '600',
          color: '#B97C63',
          fontFamily: 'Poppins',
          marginTop: 10,
          marginBottom: 6,
        }}>
          Informações fornecidas pelo usuário
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
          paddingLeft: 8,
        }}>
          • Nome{"\n"}
          • Endereço de e-mail{"\n"}
          • Idade{"\n"}
          • Tipo de pele{"\n"}
          • Objetivos de cuidados com a pele{"\n"}
          • Preferências de rotina
        </Text>

        <Text style={{
          fontSize: 15,
          fontWeight: '600',
          color: '#B97C63',
          fontFamily: 'Poppins',
          marginTop: 10,
          marginBottom: 6,
        }}>
          Fotos enviadas pelo usuário
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
          paddingLeft: 8,
        }}>
          Caso você utilize os recursos de análise da pele, poderemos armazenar fotografias enviadas voluntariamente para gerar relatórios e acompanhar a evolução da rotina.
        </Text>

        <Text style={{
          fontSize: 15,
          fontWeight: '600',
          color: '#B97C63',
          fontFamily: 'Poppins',
          marginTop: 10,
          marginBottom: 6,
        }}>
          Dados de uso
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
          paddingLeft: 8,
        }}>
          • Interações com o aplicativo{"\n"}
          • Histórico de rotinas{"\n"}
          • Produtos cadastrados{"\n"}
          • Configurações do aplicativo
        </Text>

        {/* Seção 2 */}
        <Text style={{
          fontSize: 18,
          fontWeight: '700',
          color: '#B97C63',
          fontFamily: 'Playfair Display',
          marginTop: 20,
          marginBottom: 12,
        }}>
          2. Como utilizamos suas informações
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
          paddingLeft: 8,
        }}>
          Utilizamos os dados para:{"\n"}
          • Criar rotinas personalizadas de skincare;{"\n"}
          • Gerar lembretes e notificações;{"\n"}
          • Melhorar a experiência do usuário;{"\n"}
          • Fornecer análises e recomendações baseadas em inteligência artificial;{"\n"}
          • Garantir o funcionamento e a segurança da plataforma.
        </Text>

        {/* Seção 3 */}
        <Text style={{
          fontSize: 18,
          fontWeight: '700',
          color: '#B97C63',
          fontFamily: 'Playfair Display',
          marginTop: 20,
          marginBottom: 12,
        }}>
          3. Compartilhamento de informações
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          Não vendemos dados pessoais.{"\n\n"}
          Os dados poderão ser compartilhados apenas com fornecedores de serviços necessários para o funcionamento do aplicativo, como:{"\n"}
          • Hospedagem de dados;{"\n"}
          • Serviços de autenticação;{"\n"}
          • Serviços de inteligência artificial;{"\n"}
          • Serviços de notificações.{"\n\n"}
          Todos os parceiros são obrigados a proteger os dados dos usuários.
        </Text>

        {/* Seção 4 */}
        <Text style={{
          fontSize: 18,
          fontWeight: '700',
          color: '#B97C63',
          fontFamily: 'Playfair Display',
          marginTop: 20,
          marginBottom: 12,
        }}>
          4. Armazenamento e segurança
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          Empregamos medidas técnicas e organizacionais para proteger suas informações contra acesso não autorizado, perda, alteração ou divulgação indevida.
        </Text>

        {/* Seção 5 */}
        <Text style={{
          fontSize: 18,
          fontWeight: '700',
          color: '#B97C63',
          fontFamily: 'Playfair Display',
          marginTop: 20,
          marginBottom: 12,
        }}>
          5. Direitos do usuário
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
          paddingLeft: 8,
        }}>
          Você pode:{"\n"}
          • Solicitar acesso aos seus dados;{"\n"}
          • Corrigir informações incorretas;{"\n"}
          • Solicitar a exclusão da sua conta;{"\n"}
          • Solicitar a exclusão dos seus dados armazenados.
        </Text>

        {/* Seção 6 */}
        <Text style={{
          fontSize: 18,
          fontWeight: '700',
          color: '#B97C63',
          fontFamily: 'Playfair Display',
          marginTop: 20,
          marginBottom: 12,
        }}>
          6. Dados de menores
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          O aplicativo não é destinado a crianças menores de 13 anos sem supervisão dos responsáveis.
        </Text>

        {/* Seção 7 */}
        <Text style={{
          fontSize: 18,
          fontWeight: '700',
          color: '#B97C63',
          fontFamily: 'Playfair Display',
          marginTop: 20,
          marginBottom: 12,
        }}>
          7. Limitação de responsabilidade
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          O VisCare fornece informações educativas e recomendações de cuidados com a pele. O aplicativo não substitui diagnóstico, tratamento ou orientação médica profissional. Em caso de dúvidas ou problemas dermatológicos, consulte um dermatologista.
        </Text>

        {/* Seção 8 */}
        <Text style={{
          fontSize: 18,
          fontWeight: '700',
          color: '#B97C63',
          fontFamily: 'Playfair Display',
          marginTop: 20,
          marginBottom: 12,
        }}>
          8. Alterações nesta política
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          Podemos atualizar esta Política de Privacidade periodicamente. As alterações serão publicadas nesta página.
        </Text>

        {/* Seção 9 */}
        <Text style={{
          fontSize: 18,
          fontWeight: '700',
          color: '#B97C63',
          fontFamily: 'Playfair Display',
          marginTop: 20,
          marginBottom: 12,
        }}>
          9. Contato
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 24,
        }}>
          Para dúvidas sobre privacidade ou solicitação de exclusão de dados, entre em contato:{"\n\n"}
          <Text style={{ fontWeight: '600' }}>E-mail:</Text> viverevivi37@gmail.com{"\n"}
          <Text style={{ fontWeight: '600' }}>Responsável:</Text> Viviane M Silva
        </Text>

        <Text style={{
          fontSize: 14,
          fontWeight: '600',
          color: '#B97C63',
          textAlign: 'center',
          marginTop: 20,
          fontFamily: 'Poppins',
        }}>
          Ao utilizar o aplicativo, você concorda com esta Política de Privacidade.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
