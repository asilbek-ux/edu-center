import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    const k = trimmed.slice(0, eqIdx).trim();
    const v = trimmed.slice(eqIdx + 1).trim();
    env[k] = v;
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const client = createClient(supabaseUrl, anonKey);

async function testLogin() {
  console.log('Login urinishi tekshirilmoqda...');
  const { data, error } = await client.auth.signInWithPassword({
    email: 'tursunovasilbek5504@gmail.com',
    password: 'EduAdmin_2026!#Secure'
  });

  if (error) {
    console.log('Natija:', error.message, `(${error.status})`);
  } else {
    console.log('Muvaffaqiyatli! User ID:', data.user.id);
  }
}

testLogin();
