import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from '../context/LocalizationContext';

const content = {
  it: {
    headerTitle: "Informativa sulla Privacy",
    title: "Informativa sulla Privacy – VisCare",
    lastUpdated: "Ultimo aggiornamento: 17 Giugno 2026",
    intro: "Benvenuto su VisCare. La tua privacy è importante per noi. Questa Informativa sulla Privacy spiega come raccogliamo, utilizziamo, conserviamo e proteggiamo le tue informazioni quando utilizzi la nostra applicazione.",
    section1Title: "1. Informazioni che raccogliamo",
    section1Intro: "Possiamo raccogliere le seguenti informazioni:",
    section1Sub1Title: "Informazioni fornite dall'utente",
    section1Sub1Body: "• Nome\n• Indirizzo e-mail\n• Età\n• Tipo di pelle\n• Obiettivi per la cura della pelle\n• Preferenze per la routine",
    section1Sub2Title: "Foto inviate dall'utente",
    section1Sub2Body: "Se utilizzi le funzioni di analisi della pelle, potremmo memorizzare le fotografie inviate volontariamente per generare report e monitorare l'evoluzione della tua routine.",
    section1Sub3Title: "Dati di utilizzo",
    section1Sub3Body: "• Interazioni con l'applicazione\n• Cronologia delle routine\n• Prodotti registrati\n• Impostazioni dell'applicazione",
    section2Title: "2. Come utilizziamo le tue informazioni",
    section2Body: "Utilizziamo i dati per:\n• Creare routine di skincare personalizzate;\n• Generare promemoria e notifiche;\n• Migliorare l'esperienza dell'utente;\n• Fornire analisi e raccomandazioni basate sull'intelligenza artificiale;\n• Garantire il funzionamento e la sicurezza della piattaforma.",
    section3Title: "3. Condivisione delle informazioni",
    section3Body: "Non vendiamo i tuoi dati personali.\n\nI dati possono essere condivisi solo con i fornitori di servizi necessari per il funzionamento dell'applicazione, come:\n• Hosting dei dati;\n• Servizi di autenticazione;\n• Servizi di intelligenza artificiale;\n• Servizi di notifica.\n\nTutti i partner sono tenuti a proteggere i dati degli utenti.",
    section4Title: "4. Conservazione e sicurezza",
    section4Body: "Impieghiamo misure tecniche e organizzative per proteggere le tue informazioni da accessi non autorizzati, perdite, alterazioni o divulgazioni improprie.",
    section5Title: "5. Diritti dell'utente",
    section5Body: "Puoi:\n• Richiedere l'accesso ai tuoi dati;\n• Correggere informazioni errate;\n• Richiedere la cancellazione del tuo account;\n• Richiedere la cancellazione dei tuoi dati memorizzati.",
    section6Title: "6. Dati dei minori",
    section6Body: "L'applicazione non è destinata a minori di 13 anni senza la supervisione dei genitori o dei tutori.",
    section7Title: "7. Limitazione di responsabilità",
    section7Body: "VisCare fornisce informazioni educative e raccomandazioni sulla cura della pelle. L'applicazione non sostituisce la diagnosi, il trattamento o la consulenza medica professionale. In caso di dubbi o problemi dermatologici, consulta un dermatologo.",
    section8Title: "8. Modifiche alla presente informativa",
    section8Body: "Potremmo aggiornare periodicamente questa Informativa sulla Privacy. Le modifiche saranno pubblicate su questa pagina.",
    section9Title: "9. Contatti",
    section9Body: "Per domande sulla privacy o richieste di cancellazione dei dati, contattaci:\n\nE-mail: viverevivi37@gmail.com\nResponsabile: Viviane M Silva",
    footer: "Utilizzando l'applicazione, acconsenti a questa Informativa sulla Privacy."
  },
  en: {
    headerTitle: "Privacy Policy",
    title: "Privacy Policy – VisCare",
    lastUpdated: "Last updated: June 17, 2026",
    intro: "Welcome to VisCare. Your privacy is important to us. This Privacy Policy explains how we collect, use, store, and protect your information when using our application.",
    section1Title: "1. Information we collect",
    section1Intro: "We may collect the following information:",
    section1Sub1Title: "Information provided by the user",
    section1Sub1Body: "• Name\n• Email address\n• Age\n• Skin type\n• Skincare goals\n• Routine preferences",
    section1Sub2Title: "Photos submitted by the user",
    section1Sub2Body: "If you use the skin analysis features, we may store photographs submitted voluntarily to generate reports and track the evolution of your routine.",
    section1Sub3Title: "Usage data",
    section1Sub3Body: "• Interactions with the application\n• Routine history\n• Registered products\n• Application settings",
    section2Title: "2. How we use your information",
    section2Body: "We use the data to:\n• Create personalized skincare routines;\n• Generate reminders and notifications;\n• Improve user experience;\n• Provide analyses and recommendations powered by artificial intelligence;\n• Guarantee the operation and security of the platform.",
    section3Title: "3. Sharing of information",
    section3Body: "We do not sell personal data.\n\nData may be shared only with service providers necessary for the operation of the application, such as:\n• Data hosting;\n• Authentication services;\n• Artificial intelligence services;\n• Notification services.\n\nAll partners are obligated to protect user data.",
    section4Title: "4. Storage and security",
    section4Body: "We employ technical and organizational measures to protect your information against unauthorized access, loss, alteration, or improper disclosure.",
    section5Title: "5. User rights",
    section5Body: "You can:\n• Request access to your data;\n• Correct incorrect information;\n• Request deletion of your account;\n• Request deletion of your stored data.",
    section6Title: "6. Minors' data",
    section6Body: "The application is not intended for children under 13 years of age without parental or guardian supervision.",
    section7Title: "7. Limitation of liability",
    section7Body: "VisCare provides educational information and skincare recommendations. The application does not replace professional medical diagnosis, treatment, or advice. In case of doubts or persistent skin issues, consult a dermatologist.",
    section8Title: "8. Changes to this policy",
    section8Body: "We may update this Privacy Policy periodically. Changes will be posted on this page.",
    section9Title: "9. Contact",
    section9Body: "For questions about privacy or requests for data deletion, please contact us:\n\nEmail: viverevivi37@gmail.com\nResponsible: Viviane M Silva",
    footer: "By using the application, you agree to this Privacy Policy."
  },
  pt: {
    headerTitle: "Política de Privacidade",
    title: "Política de Privacidade – VisCare",
    lastUpdated: "Última atualização: 17 de Junho de 2026",
    intro: "Bem-vindo ao VisCare. A sua privacidade é importante para nós. Esta Política de Privacidade explica como coletamos, utilizamos, armazenamos e protegemos suas informações ao utilizar nosso aplicativo.",
    section1Title: "1. Informações que coletamos",
    section1Intro: "Podemos coletar as seguintes informações:",
    section1Sub1Title: "Informações fornecidas pelo usuário",
    section1Sub1Body: "• Nome\n• Endereço de e-mail\n• Idade\n• Tipo de pele\n• Objetivos de cuidados com a pele\n• Preferências de rotina",
    section1Sub2Title: "Fotos enviadas pelo usuário",
    section1Sub2Body: "Caso você utilize os recursos de análise da pele, poderemos armazenar fotografias enviadas voluntariamente para gerar relatórios e acompanhar a evolução da rotina.",
    section1Sub3Title: "Dados de uso",
    section1Sub3Body: "• Interações com o aplicativo\n• Histórico de rotinas\n• Produtos cadastrados\n• Configurações do aplicativo",
    section2Title: "2. Como utilizamos suas informações",
    section2Body: "Utilizamos os dados para:\n• Criar rotinas personalizadas de skincare;\n• Gerar lembretes e notificações;\n• Melhorar a experiência do usuário;\n• Fornecer análises e recomendações baseadas em inteligência artificial;\n• Garantir o funcionamento e a segurança da plataforma.",
    section3Title: "3. Compartilhamento de informações",
    section3Body: "Não vendemos dados pessoais.\n\nOs dados poderão ser compartilhados apenas com fornecedores de serviços necessários para o funcionamento do aplicativo, como:\n• Hospedagem de dados;\n• Serviços de autenticação;\n• Serviços de inteligência artificial;\n• Serviços de notificações.\n\nTodos os parceiros são obrigados a proteger os dados dos usuários.",
    section4Title: "4. Armazenamento e segurança",
    section4Body: "Empregamos medidas técnicas e organizacionais para proteger suas informações contra acesso não autorizado, perda, alteração ou divulgação indevida.",
    section5Title: "5. Direitos do usuário",
    section5Body: "Você pode:\n• Solicitar acesso aos seus dados;\n• Corrigir informações incorretas;\n• Solicitar a exclusão da sua conta;\n• Solicitar a exclusão dos seus dados armazenados.",
    section6Title: "6. Dados de menores",
    section6Body: "O aplicativo não é destinado a crianças menores de 13 anos sem supervisão dos responsáveis.",
    section7Title: "7. Limitação de responsabilidade",
    section7Body: "O VisCare fornece informações educativas e recomendações de cuidados com a pele. O aplicativo não substitui diagnóstico, tratamento ou orientação médica profissional. Em caso de dúvidas ou problemas dermatológicos, consulte um dermatologista.",
    section8Title: "8. Alterações nesta política",
    section8Body: "Podemos atualizar esta Política de Privacidade periodicamente. As alterações serão publicadas nesta página.",
    section9Title: "9. Contato",
    section9Body: "Para dúvidas sobre privacidade ou solicitação de exclusão de dados, entre em contato:\n\nE-mail: viverevivi37@gmail.com\nResponsável: Viviane M Silva",
    footer: "Ao utilizar o aplicativo, você concorda com esta Política de Privacidade."
  }
};

export default function PrivacyScreen() {
  const router = useRouter();
  const { language } = useTranslation();
  
  const currentText = content[language] || content['it'];

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
          {currentText.headerTitle}
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
          {currentText.title}
        </Text>

        <Text style={{
          fontSize: 12,
          color: '#8E8E93',
          fontFamily: 'Poppins',
          marginBottom: 24,
        }}>
          {currentText.lastUpdated}
        </Text>

        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 20,
        }}>
          {currentText.intro}
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
          {currentText.section1Title}
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          {currentText.section1Intro}
        </Text>

        <Text style={{
          fontSize: 15,
          fontWeight: '600',
          color: '#B97C63',
          fontFamily: 'Poppins',
          marginTop: 10,
          marginBottom: 6,
        }}>
          {currentText.section1Sub1Title}
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
          paddingLeft: 8,
        }}>
          {currentText.section1Sub1Body}
        </Text>

        <Text style={{
          fontSize: 15,
          fontWeight: '600',
          color: '#B97C63',
          fontFamily: 'Poppins',
          marginTop: 10,
          marginBottom: 6,
        }}>
          {currentText.section1Sub2Title}
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
          paddingLeft: 8,
        }}>
          {currentText.section1Sub2Body}
        </Text>

        <Text style={{
          fontSize: 15,
          fontWeight: '600',
          color: '#B97C63',
          fontFamily: 'Poppins',
          marginTop: 10,
          marginBottom: 6,
        }}>
          {currentText.section1Sub3Title}
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
          paddingLeft: 8,
        }}>
          {currentText.section1Sub3Body}
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
          {currentText.section2Title}
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
          paddingLeft: 8,
        }}>
          {currentText.section2Body}
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
          {currentText.section3Title}
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          {currentText.section3Body}
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
          {currentText.section4Title}
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          {currentText.section4Body}
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
          {currentText.section5Title}
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
          paddingLeft: 8,
        }}>
          {currentText.section5Body}
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
          {currentText.section6Title}
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          {currentText.section6Body}
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
          {currentText.section7Title}
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          {currentText.section7Body}
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
          {currentText.section8Title}
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          {currentText.section8Body}
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
          {currentText.section9Title}
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 24,
        }}>
          {currentText.section9Body}
        </Text>

        <Text style={{
          fontSize: 14,
          fontWeight: '600',
          color: '#B97C63',
          textAlign: 'center',
          marginTop: 20,
          fontFamily: 'Poppins',
        }}>
          {currentText.footer}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
