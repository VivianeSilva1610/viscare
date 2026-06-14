#!/usr/bin/env node
/**
 * deploy-edge-functions.js — VisCare
 * 
 * Script para publicar a Edge Function `create-payment-intent` no Supabase
 * e configurar a variável STRIPE_SECRET_KEY.
 * 
 * COMO USAR:
 *   1. No terminal do projeto, execute: node scripts/deploy-edge-functions.js
 *   2. Ele vai pedir seu SUPABASE_ACCESS_TOKEN e sua STRIPE_SECRET_KEY
 * 
 * Onde achar o SUPABASE_ACCESS_TOKEN:
 *   → supabase.com → Log in → Clique na foto/avatar → Account → Access Tokens
 *   → Clique em "Generate new token" → Dê o nome "VisCare Deploy" → Copie o token
 * 
 * Onde achar a STRIPE_SECRET_KEY:
 *   → dashboard.stripe.com → Developers → API Keys → "Secret key" (começa com sk_live_...)
 *   → Clique em "Reveal live key token" → Copie
 */

const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(res => rl.question(q, res));

async function main() {
  console.log('\n🚀 VisCare — Deploy da Edge Function Stripe\n');
  console.log('─'.repeat(50));

  const accessToken = await ask('\n1️⃣  Cole seu SUPABASE_ACCESS_TOKEN (supabase.com → Account → Access Tokens):\n   > ');
  const secretKey   = await ask('\n2️⃣  Cole sua STRIPE_SECRET_KEY (dashboard.stripe.com → Developers → API Keys):\n   > ');

  if (!accessToken.trim() || !secretKey.trim()) {
    console.error('\n❌ Tokens não podem estar vazios. Abortando.\n');
    process.exit(1);
  }

  if (!secretKey.trim().startsWith('sk_')) {
    console.error('\n❌ STRIPE_SECRET_KEY deve começar com sk_live_ ou sk_test_\n');
    process.exit(1);
  }

  const projectRef = 'covtpwbaghvrbfxyirga'; // ID do projeto VisCare no Supabase (do .env)

  console.log('\n📦 Publicando Edge Function...');
  try {
    execSync(
      `npx supabase functions deploy create-payment-intent --project-ref ${projectRef} --no-verify-jwt`,
      { 
        env: { ...process.env, SUPABASE_ACCESS_TOKEN: accessToken.trim() },
        stdio: 'inherit',
        cwd: process.cwd(),
      }
    );
    console.log('\n✅ Edge Function publicada com sucesso!');
  } catch (e) {
    console.error('\n❌ Erro ao publicar Edge Function:', e.message);
    process.exit(1);
  }

  console.log('\n🔐 Configurando STRIPE_SECRET_KEY no Supabase...');
  try {
    execSync(
      `npx supabase secrets set STRIPE_SECRET_KEY="${secretKey.trim()}" --project-ref ${projectRef}`,
      {
        env: { ...process.env, SUPABASE_ACCESS_TOKEN: accessToken.trim() },
        stdio: 'inherit',
        cwd: process.cwd(),
      }
    );
    console.log('\n✅ STRIPE_SECRET_KEY configurada com segurança no servidor!');
  } catch (e) {
    console.error('\n❌ Erro ao configurar secret:', e.message);
    process.exit(1);
  }

  console.log('\n' + '═'.repeat(50));
  console.log('🎉 Tudo pronto! Sua Edge Function está no ar.');
  console.log('\n📌 URL da função:');
  console.log(`   https://${projectRef}.supabase.co/functions/v1/create-payment-intent`);
  console.log('\n🔒 A chave secreta do Stripe está segura no servidor Supabase.');
  console.log('   Ela NUNCA aparece no código do app.\n');
  rl.close();
}

main().catch(err => {
  console.error('Erro:', err);
  rl.close();
  process.exit(1);
});
