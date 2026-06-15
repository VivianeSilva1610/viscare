#!/usr/bin/env node
/**
 * deploy-analyze-skin.js — VisCare
 * 
 * Script para publicar a Edge Function `analyze-skin` no Supabase
 * e configurar a variável GEMINI_API_KEY.
 * 
 * COMO USAR:
 *   1. No terminal do projeto, execute: node scripts/deploy-analyze-skin.js
 *   2. Ele vai pedir seu SUPABASE_ACCESS_TOKEN e sua GEMINI_API_KEY
 * 
 * Onde achar o SUPABASE_ACCESS_TOKEN:
 *   → supabase.com → Log in → Clique na foto/avatar → Account → Access Tokens
 *   → Clique em "Generate new token" → Dê o nome "VisCare Deploy" → Copie o token
 * 
 * Onde achar a GEMINI_API_KEY:
 *   → aistudio.google.com → Log in → Clique em "Get API Key" → Copie
 */

const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(res => rl.question(q, res));

async function main() {
  console.log('\n🚀 VisCare — Deploy da Edge Function de Análise de Pele (Gemini AI)\n');
  console.log('─'.repeat(60));

  const accessToken = await ask('\n1️⃣  Cole seu SUPABASE_ACCESS_TOKEN (supabase.com → Account → Access Tokens):\n   > ');
  const geminiKey   = await ask('\n2️⃣  Cole sua GEMINI_API_KEY (aistudio.google.com → Get API Key):\n   > ');

  if (!accessToken.trim() || !geminiKey.trim()) {
    console.error('\n❌ Tokens não podem estar vazios. Abortando.\n');
    process.exit(1);
  }

  const projectRef = 'covtpwbaghvrbfxyirga'; // ID do projeto VisCare no Supabase (do .env)

  console.log('\n📦 Publicando Edge Function `analyze-skin`...');
  try {
    execSync(
      `npx supabase functions deploy analyze-skin --project-ref ${projectRef} --no-verify-jwt`,
      { 
        env: { ...process.env, SUPABASE_ACCESS_TOKEN: accessToken.trim() },
        stdio: 'inherit',
        cwd: process.cwd(),
      }
    );
    console.log('\n✅ Edge Function `analyze-skin` publicada com sucesso!');
  } catch (e) {
    console.error('\n❌ Erro ao publicar Edge Function:', e.message);
    process.exit(1);
  }

  console.log('\n🔐 Configurando GEMINI_API_KEY no Supabase...');
  try {
    execSync(
      `npx supabase secrets set GEMINI_API_KEY="${geminiKey.trim()}" --project-ref ${projectRef}`,
      {
        env: { ...process.env, SUPABASE_ACCESS_TOKEN: accessToken.trim() },
        stdio: 'inherit',
        cwd: process.cwd(),
      }
    );
    console.log('\n✅ GEMINI_API_KEY configurada com segurança no servidor!');
  } catch (e) {
    console.error('\n❌ Erro ao configurar secret:', e.message);
    process.exit(1);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('🎉 Tudo pronto! Sua Edge Function de Análise Facial está ativa no servidor.');
  console.log('\n📌 URL da função:');
  console.log(`   https://${projectRef}.supabase.co/functions/v1/analyze-skin`);
  console.log('\n🔒 A chave do Gemini está segura no servidor Supabase.');
  console.log('   Ela NUNCA é exposta no código do aplicativo cliente.\n');
  rl.close();
}

main().catch(err => {
  console.error('Erro:', err);
  rl.close();
  process.exit(1);
});
