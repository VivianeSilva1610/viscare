const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://covtpwbaghvrbfxyirga.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvdnRwd2JhZ2h2cmJmeHlpcmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNTk5MDIsImV4cCI6MjA5NjczNTkwMn0.PtLl1pDM1sgPqvgwQU3-hgde7TUEwKankoVnXcBYPkU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const email = `test_${Date.now()}@viscare.test`;
  console.log('Tentando criar usuário:', email);
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: 'Password!123'
  });
  
  if (error) {
    console.error('ERRO AO CRIAR:', error.message);
  } else {
    console.log('SUCESSO! Usuário ID:', data.user ? data.user.id : 'Sem ID');
    if (!data.session) {
      console.log('ATENÇÃO: Conta criada, mas a sessão é nula. (A confirmação de e-mail ainda está ativada no Supabase ou precisa de configuração extra)');
    } else {
      console.log('Sessão iniciada com sucesso!');
    }
  }
}
test();
