import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

export default function TermsScreen() {
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
          Termos de Serviço
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
          Termos de Serviço – Viscare
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
          Bem-vindo ao <Text style={{ fontWeight: '600' }}>Viscare</Text>. Ao acessar ou utilizar nosso aplicativo, você concorda com os presentes Termos de Serviço. Caso não concorde com estes termos, não utilize o aplicativo.
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
          1. Objetivo do aplicativo
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          O Viscare é uma plataforma digital destinada a auxiliar usuários na organização de rotinas de cuidados com a pele, fornecendo informações educativas, lembretes, acompanhamento de progresso e recomendações personalizadas baseadas nos dados fornecidos pelo usuário.
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
          2. Natureza das informações
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          As informações disponibilizadas pelo Viscare possuem caráter informativo e educacional.
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
          paddingLeft: 8,
        }}>
          O aplicativo:{"\n"}
          • Não realiza diagnósticos médicos;{"\n"}
          • Não substitui consultas médicas ou dermatológicas;{"\n"}
          • Não prescreve medicamentos;{"\n"}
          • Não garante resultados específicos.
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          Qualquer decisão relacionada à saúde da pele deve ser tomada com acompanhamento de um profissional qualificado.
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
          3. Conta do usuário
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          Para acessar determinadas funcionalidades, o usuário poderá criar uma conta.
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
          paddingLeft: 8,
        }}>
          O usuário é responsável por:{"\n"}
          • Manter suas credenciais de acesso seguras;{"\n"}
          • Fornecer informações verdadeiras e atualizadas;{"\n"}
          • Não compartilhar sua conta com terceiros.
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
          4. Fotografias e conteúdo enviado
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          Ao enviar fotografias da pele ou outras informações ao aplicativo, o usuário declara possuir autorização para compartilhar esse conteúdo.
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
          paddingLeft: 8,
        }}>
          As imagens serão utilizadas exclusivamente para:{"\n"}
          • Análise da evolução da rotina;{"\n"}
          • Geração de relatórios personalizados;{"\n"}
          • Melhorias na experiência do usuário.
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
          5. Inteligência Artificial
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          Algumas recomendações podem ser geradas por sistemas de inteligência artificial.
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
          paddingLeft: 8,
        }}>
          O usuário reconhece que:{"\n"}
          • As recomendações são automatizadas;{"\n"}
          • Podem ocorrer imprecisões;{"\n"}
          • Os resultados devem ser avaliados com senso crítico;{"\n"}
          • A IA não substitui avaliação profissional.
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
          6. Plano gratuito e plano premium
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          O Viscare poderá oferecer funcionalidades gratuitas e recursos pagos por assinatura.
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          Os recursos disponíveis em cada modalidade poderão ser alterados a qualquer momento mediante atualização destes termos.
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
          7. Cancelamento
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          O usuário poderá cancelar sua conta a qualquer momento.
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          A exclusão da conta poderá resultar na remoção permanente dos dados associados, conforme descrito na Política de Privacidade.
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
          8. Uso proibido
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
          paddingLeft: 8,
        }}>
          É proibido:{"\n"}
          • Utilizar o aplicativo para atividades ilegais;{"\n"}
          • Tentar acessar áreas restritas do sistema;{"\n"}
          • Copiar, modificar ou distribuir o software sem autorização;{"\n"}
          • Inserir conteúdo ofensivo, fraudulento ou que viole direitos de terceiros.
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
          9. Limitação de responsabilidade
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
          paddingLeft: 8,
        }}>
          Na máxima extensão permitida pela legislação aplicável, o Viscare não será responsável por:{"\n"}
          • Reações alérgicas a produtos;{"\n"}
          • Decisões tomadas exclusivamente com base nas recomendações do aplicativo;{"\n"}
          • Danos diretos ou indiretos decorrentes do uso da plataforma;{"\n"}
          • Interrupções temporárias do serviço.
        </Text>

        {/* Seção 10 */}
        <Text style={{
          fontSize: 18,
          fontWeight: '700',
          color: '#B97C63',
          fontFamily: 'Playfair Display',
          marginTop: 20,
          marginBottom: 12,
        }}>
          10. Propriedade intelectual
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          Todo o conteúdo do aplicativo, incluindo logotipos, design, textos, funcionalidades e software, é protegido pelas leis de propriedade intelectual e pertence ao <Text style={{ fontWeight: '600' }}>Viscare</Text> ou aos seus licenciadores.
        </Text>

        {/* Seção 11 */}
        <Text style={{
          fontSize: 18,
          fontWeight: '700',
          color: '#B97C63',
          fontFamily: 'Playfair Display',
          marginTop: 20,
          marginBottom: 12,
        }}>
          11. Alterações dos termos
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          Reservamo-nos o direito de modificar estes Termos de Serviço a qualquer momento.
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          As alterações entrarão em vigor após sua publicação no aplicativo.
        </Text>

        {/* Seção 12 */}
        <Text style={{
          fontSize: 18,
          fontWeight: '700',
          color: '#B97C63',
          fontFamily: 'Playfair Display',
          marginTop: 20,
          marginBottom: 12,
        }}>
          12. Legislação aplicável
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          Estes Termos de Serviço serão interpretados de acordo com a legislação aplicável do país onde o serviço estiver estabelecido.
        </Text>

        {/* Seção 13 */}
        <Text style={{
          fontSize: 18,
          fontWeight: '700',
          color: '#B97C63',
          fontFamily: 'Playfair Display',
          marginTop: 20,
          marginBottom: 12,
        }}>
          13. Contato
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 24,
        }}>
          Para dúvidas relacionadas a estes Termos de Serviço:{"\n\n"}
          <Text style={{ fontWeight: '600' }}>E-mail:</Text> viverevivi37@gmail.com{"\n"}
          <Text style={{ fontWeight: '600' }}>Responsável pelo aplicativo:</Text> Viviane M Silva
        </Text>

        <Text style={{
          fontSize: 14,
          fontWeight: '600',
          color: '#B97C63',
          textAlign: 'center',
          marginTop: 20,
          fontFamily: 'Poppins',
        }}>
          Ao utilizar o Viscare, você declara ter lido, compreendido e aceitado estes Termos de Serviço.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
