import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from '../context/LocalizationContext';

const content = {
  it: {
    headerTitle: "Termini di Servizio",
    title: "Termini di Servizio – Viscare",
    lastUpdated: "Ultimo aggiornamento: 29 Giugno 2026",
    intro: "Benvenuto su Viscare. Accedendo o utilizzando la nostra applicazione, accetti i presenti Termini di Servizio. Se non sei d'accordo con questi termini, non utilizzare l'applicazione.",
    section1Title: "1. Scopo dell'applicazione",
    section1Body: "Viscare è una piattaforma digitale progettata per aiutare gli utenti a organizzare le proprie routine di cura della pelle, fornendo informazioni educative, promemoria, monitoraggio dei progressi e raccomandazioni personalizzate basate sui dati forniti dall'utente.",
    section2Title: "2. Natura delle informazioni",
    section2Intro: "Le informazioni fornite da Viscare sono a scopo puramente informativo ed educativo.",
    section2Body: "L'applicazione:\n• Non effettua diagnosi mediche;\n• Non sostituisce le visite mediche o dermatologiche;\n• Non prescrive farmaci;\n• Non garantisce risultati specifici.",
    section2Outro: "Qualsiasi decisione relativa alla salute della pelle deve essere presa con il supporto di un professionista qualificato.",
    section3Title: "3. Account utente",
    section3Intro: "Per accedere ad alcune funzionalità, l'utente può creare un account.",
    section3Body: "L'utente è responsabile di:\n• Mantenere al sicuro le credenziali di accesso;\n• Fornire informazioni veritiere e aggiornate;\n• Non condividere il proprio account con terzi.",
    section4Title: "4. Fotografie e contenuti inviati",
    section4Intro: "Inviando fotografie della pelle o altre informazioni all'applicazione, l'utente dichiara di avere l'autorizzazione a condividere tale contenuto.",
    section4Body: "Le immagini saranno utilizzate esclusivamente per:\n• Analizzare l'evoluzione della routine;\n• Generare report personalizzati;\n• Migliorare l'esperienza dell'utente.",
    section4Note: "Le foto del viso inviate specificamente per la funzione di scansione della pelle tramite IA sono considerate dati biometrici sensibili. La foto viene elaborata da un servizio di intelligenza artificiale di terze parti (Google Gemini) solo al momento della scansione e non viene memorizzata sui nostri server — vengono salvati nel tuo profilo solo i risultati dell'analisi (punteggi di idratazione, untuosità, ecc.). Questa funzione richiede un consenso specifico, che può essere revocato in qualsiasi momento nelle Impostazioni.",
    section5Title: "5. Intelligenza Artificiale",
    section5Intro: "Alcune raccomandazioni possono essere generate da sistemi di intelligenza artificiale.",
    section5Body: "L'utente riconosce che:\n• Le raccomandazioni sono automatizzate;\n• Possono verificarsi imprecisioni;\n• I risultati devono essere valutati con senso critico;\n• L'IA non sostituisce una valutazione professionale.",
    section6Title: "6. Piano gratuito e piano premium",
    section6Intro: "Viscare può offrire funzionalità gratuite e funzionalità a pagamento tramite abbonamento.",
    section6Body: "Le funzionalità disponibili in ciascuna modalità possono essere modificate in qualsiasi momento aggiornando questi termini.",
    section7Title: "7. Cancellazione",
    section7Intro: "L'utente può cancellare il proprio account in qualsiasi momento.",
    section7Body: "La cancellazione dell'account può comportare la rimozione permanente dei dati associati, come descritto nell'Informativa sulla Privacy.",
    section8Title: "8. Uso vietato",
    section8Body: "È vietato:\n• Utilizzare l'applicazione per attività illegali;\n• Tentare di accedere ad aree limitate del sistema;\n• Copiare, modificare o distribuire il software senza autorizzazione;\n• Inserire contenuti offensivi, fraudolenti o che violino i diritti di terzi.",
    section9Title: "9. Limitazione di responsabilità",
    section9Body: "Nella misura massima consentita dalla legge applicabile, Viscare non sarà responsabile per:\n• Reazioni allergiche ai prodotti;\n• Decisioni prese esclusivamente sulla base delle raccomandazioni dell'applicazione;\n• Danni diretti o indireti derivanti dall'uso della piattaforma;\n• Interruzioni temporanee del servizio.",
    section10Title: "10. Proprietà intellettuale",
    section10Body: "Tutto il contenuto dell'applicazione, inclusi loghi, design, testi, funzionalità e software, è protetto dalle leggi sulla proprietà intellettuale e appartiene a Viscare o ai suoi licenziatari.",
    section11Title: "11. Modifiche dei termini",
    section11Intro: "Ci riserviamo il diritto di modificare questi Termini di Servizio in qualsiasi momento.",
    section11Body: "Le modifiche entreranno in vigore dopo la loro pubblicazione nell'applicazione.",
    section12Title: "12. Legge applicabile",
    section12Body: "I presenti Termini di Servizio saranno interpretati in conformità con la legge applicabile del paese in cui il servizio è stabilito.",
    section13Title: "13. Contatti",
    section13Body: "Per domande relative a questi Termini di Servizio:\n\nE-mail: viverevivi37@gmail.com\nResponsabile dell'applicazione: Viviane M Silva",
    footer: "Utilizzando Viscare, dichiari di aver letto, compreso e accettato questi Termini di Servizio."
  },
  en: {
    headerTitle: "Terms of Service",
    title: "Terms of Service – Viscare",
    lastUpdated: "Last updated: June 29, 2026",
    intro: "Welcome to Viscare. By accessing or using our application, you agree to these Terms of Service. If you do not agree to these terms, do not use the application.",
    section1Title: "1. Purpose of the application",
    section1Body: "Viscare is a digital platform designed to assist users in organizing skincare routines, providing educational information, reminders, progress tracking, and personalized recommendations based on the data provided by the user.",
    section2Title: "2. Nature of the information",
    section2Intro: "The information provided by Viscare is for informational and educational purposes.",
    section2Body: "The application:\n• Does not make medical diagnoses;\n• Does not replace medical or dermatological consultations;\n• Does not prescribe medications;\n• Does not guarantee specific results.",
    section2Outro: "Any decision related to skin health should be made with the guidance of a qualified professional.",
    section3Title: "3. User account",
    section3Intro: "To access certain features, the user may create an account.",
    section3Body: "The user is responsible for:\n• Keeping access credentials secure;\n• Providing true and updated information;\n• Not sharing the account with third parties.",
    section4Title: "4. Photographs and submitted content",
    section4Intro: "By submitting photographs of the skin or other information to the application, the user declares that they have the authorization to share that content.",
    section4Body: "The images will be used exclusively for:\n• Analyzing the routine evolution;\n• Generating personalized reports;\n• Improving user experience.",
    section4Note: "Face photos submitted specifically for the AI skin-scan feature are considered sensitive biometric data. The photo is processed by a third-party AI service (Google Gemini) only at the moment of the scan and is not stored on our servers — only the analysis results (hydration, oiliness scores, etc.) are saved to your profile. This feature requires specific consent, which can be revoked at any time in Settings.",
    section5Title: "5. Artificial Intelligence",
    section5Intro: "Some recommendations may be generated by artificial intelligence systems.",
    section5Body: "The user acknowledges that:\n• Recommendations are automated;\n• Inaccuracies may occur;\n• Results should be evaluated critically;\n• AI does not replace professional evaluation.",
    section6Title: "6. Free plan and premium plan",
    section6Intro: "Viscare may offer free features and paid features via subscription.",
    section6Body: "The features available in each tier may be modified at any time by updating these terms.",
    section7Title: "7. Cancellation",
    section7Intro: "The user may cancel their account at any time.",
    section7Body: "Account deletion may result in the permanent removal of associated data, as described in the Privacy Policy.",
    section8Title: "8. Prohibited use",
    section8Body: "It is prohibited to:\n• Use the application for illegal activities;\n• Attempt to access restricted areas of the system;\n• Copy, modify, or distribute the software without authorization;\n• Insert offensive, fraudulent content or content that violates third-party rights.",
    section9Title: "9. Limitation of liability",
    section9Body: "To the maximum extent permitted by applicable law, Viscare will not be liable for:\n• Allergic reactions to products;\n• Decisions made solely based on the application's recommendations;\n• Direct or indirect damages resulting from the use of the platform;\n• Temporary service interruptions.",
    section10Title: "10. Intellectual property",
    section10Body: "All application content, including logos, design, texts, features, and software, is protected by intellectual property laws and belongs to Viscare or its licensors.",
    section11Title: "11. Changes to terms",
    section11Intro: "We reserve the right to modify these Terms of Service at any time.",
    section11Body: "Changes will take effect upon their publication in the application.",
    section12Title: "12. Applicable law",
    section12Body: "These Terms of Service will be interpreted in accordance with the applicable laws of the country where the service is established.",
    section13Title: "13. Contact",
    section13Body: "For questions related to these Terms of Service:\n\nEmail: viverevivi37@gmail.com\nPerson responsible for the application: Viviane M Silva",
    footer: "By using Viscare, you declare that you have read, understood, and accepted these Terms of Service."
  },
  pt: {
    headerTitle: "Termos de Serviço",
    title: "Termos de Serviço – Viscare",
    lastUpdated: "Última atualização: 29 de Junho de 2026",
    intro: "Bem-vindo ao Viscare. Ao acessar ou utilizar nosso aplicativo, você concorda com os presentes Termos de Serviço. Caso não concorde com estes termos, não utilize o aplicativo.",
    section1Title: "1. Objetivo do aplicativo",
    section1Body: "O Viscare é uma plataforma digital destinada a auxiliar usuários na organização de rotinas de cuidados com a pele, fornecendo informações educativas, lembretes, acompanhamento de progresso e recomendações personalizadas baseadas nos dados fornecidos pelo usuário.",
    section2Title: "2. Natureza das informações",
    section2Intro: "As informações disponibilizadas pelo Viscare possuem caráter informativo e educacional.",
    section2Body: "O aplicativo:\n• Não realiza diagnósticos médicos;\n• Não substitui consultas médicas ou dermatológicas;\n• Não prescreve medicamentos;\n• Não garante resultados específicos.",
    section2Outro: "Qualquer decisão relacionada à saúde da pele deve ser tomada com acompanhamento de um profissional qualificado.",
    section3Title: "3. Conta do usuário",
    section3Intro: "Para acessar determinadas funcionalidades, o usuário poderá criar uma conta.",
    section3Body: "O usuário é responsável por:\n• Manter suas credenciais de acesso seguras;\n• Fornecer informações verdadeiras e atualizadas;\n• Não compartilhar sua conta com terceiros.",
    section4Title: "4. Fotografias e conteúdo enviado",
    section4Intro: "Ao enviar fotografias da pele ou outras informações ao aplicativo, o usuário declara possuir autorização para compartilhar esse conteúdo.",
    section4Body: "As imagens serão utilizadas exclusivamente para:\n• Análise da evolução da rotina;\n• Geração de relatórios personalizados;\n• Melhorias na experiência do usuário.",
    section4Note: "Fotos de rosto enviadas especificamente para a função de análise de pele por IA são consideradas dado biométrico sensível (LGPD, Art. 11). Essa foto é processada por um serviço de inteligência artificial de terceiros (Google Gemini) apenas no momento do escaneamento e não é armazenada em nossos servidores — apenas os resultados da análise (notas de hidratação, oleosidade etc.) ficam salvos no seu perfil. Essa função exige consentimento específico, que pode ser revogado a qualquer momento em Configurações.",
    section5Title: "5. Inteligência Artificial",
    section5Intro: "Algumas recomendações podem ser geradas por sistemas de inteligência artificial.",
    section5Body: "O usuário reconhece que:\n• As recomendações são automatizadas;\n• Podem ocorrer imprecisões;\n• Os resultados devem ser avaliados com senso crítico;\n• A IA não substitui avaliação profissional.",
    section6Title: "6. Plano gratuito e plano premium",
    section6Intro: "O Viscare poderá oferecer funcionalidades gratuitas e recursos pagos por assinatura.",
    section6Body: "Os recursos disponíveis em cada modalidade poderão ser alterados a qualquer momento mediante atualização destes termos.",
    section7Title: "7. Cancelamento",
    section7Intro: "O usuário poderá cancelar sua conta a qualquer momento.",
    section7Body: "A exclusão da conta poderá resultar na remoção permanente dos dados associados, conforme descrito na Política de Privacidade.",
    section8Title: "8. Uso proibido",
    section8Body: "É proibido:\n• Utilizar o aplicativo para atividades ilegais;\n• Tentar acessar áreas restritas do sistema;\n• Copiar, modificar ou distribuir o software sem autorização;\n• Inserir conteúdo ofensivo, fraudulento ou que viole direitos de terceiros.",
    section9Title: "9. Limitação de responsabilidade",
    section9Body: "Na máxima extensão permitida pela legislação aplicável, o Viscare não será responsável por:\n• Reações alérgicas a produtos;\n• Decisões tomadas exclusivamente com base nas recomendações do aplicativo;\n• Danos diretos ou indiretos decorrentes do uso da plataforma;\n• Interrupções temporárias do serviço.",
    section10Title: "10. Propriedade intelectual",
    section10Body: "Todo o conteúdo do aplicativo, incluindo logotipos, design, textos, funcionalidades e software, é protegido pelas leis de propriedade intelectual e pertence ao Viscare ou aos seus licenciadores.",
    section11Title: "11. Alterações dos termos",
    section11Intro: "Reservamo-nos o direito de modificar estes Termos de Serviço a qualquer momento.",
    section11Body: "As alterações entrarão em vigor após sua publicação no aplicativo.",
    section12Title: "12. Legislação aplicável",
    section12Body: "Estes Termos de Serviço serão interpretados de acordo com a legislação aplicável do país onde o serviço estiver estabelecido.",
    section13Title: "13. Contato",
    section13Body: "Para dúvidas relacionadas a estes Termos de Serviço:\n\nE-mail: viverevivi37@gmail.com\nResponsável pelo aplicativo: Viviane M Silva",
    footer: "Ao utilizar o Viscare, você declara ter lido, compreendido e aceitado estes Termos de Serviço."
  }
};

export default function TermsScreen() {
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
          {currentText.section1Body}
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
        }}>
          {currentText.section2Intro}
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
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          {currentText.section2Outro}
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
          {currentText.section3Intro}
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
          paddingLeft: 8,
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
          {currentText.section4Intro}
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
          paddingLeft: 8,
        }}>
          {currentText.section4Body}
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
          fontStyle: 'italic',
        }}>
          {currentText.section4Note}
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
        }}>
          {currentText.section5Intro}
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
          {currentText.section6Intro}
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
          {currentText.section7Intro}
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
          marginBottom: 12,
          paddingLeft: 8,
        }}>
          {currentText.section9Body}
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
          {currentText.section10Title}
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          {currentText.section10Body}
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
          {currentText.section11Title}
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          {currentText.section11Intro}
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          {currentText.section11Body}
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
          {currentText.section12Title}
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 12,
        }}>
          {currentText.section12Body}
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
          {currentText.section13Title}
        </Text>
        <Text style={{
          fontSize: 14,
          lineHeight: 22,
          color: '#333',
          fontFamily: 'Poppins',
          marginBottom: 24,
        }}>
          {currentText.section13Body}
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
