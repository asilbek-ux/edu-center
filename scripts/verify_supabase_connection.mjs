import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env.local manually
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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;

console.log('--- SUPABASE TEKSHIRUVI BOSHLANDI ---');
console.log('Project URL:', supabaseUrl ? 'Mavjud (OK)' : 'Topilmadi (XATO)');
console.log('Anon/Publishable Key:', anonKey ? 'Mavjud (OK)' : 'Topilmadi (XATO)');
console.log('Service Role Key:', serviceKey ? 'Mavjud (OK)' : 'Topilmadi (XATO)');

if (!supabaseUrl || !anonKey) {
  console.error('XATO: Supabase URL yoki kalit topilmadi.');
  process.exit(1);
}

// 1. Anon client bilan ulanishni tekshirish
const anonClient = createClient(supabaseUrl, anonKey);

// 2. Admin (Service Role) client bilan ulanishni tekshirish
const adminClient = serviceKey ? createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}) : null;

async function runVerification() {
  const results = {
    connection: false,
    tables: {},
    superAdminExistsInAuth: false,
    superAdminExistsInProfile: false,
    superAdminProfile: null,
    notes: []
  };

  try {
    // A. Baza ulanishini tekshirish (profiles jadvali orqali)
    const clientToUse = adminClient || anonClient;
    const { data: profiles, error: profError } = await clientToUse
      .from('profiles')
      .select('id, role, email, full_name, is_active')
      .limit(5);

    if (profError) {
      results.notes.push(`'profiles' jadvalini o'qishda natija: ${profError.message} (${profError.code})`);
    } else {
      results.connection = true;
      results.tables['profiles'] = true;
    }

    // B. Muhim jadvallarni tekshirish
    const tablesToCheck = [
      'students',
      'teachers',
      'parents',
      'courses',
      'groups',
      'group_students',
      'attendance',
      'payments',
      'expenses',
      'salaries',
      'announcements'
    ];

    for (const table of tablesToCheck) {
      const { error } = await clientToUse.from(table).select('id').limit(1);
      if (!error) {
        results.tables[table] = true;
      } else {
        results.tables[table] = false;
        results.notes.push(`Jadval '${table}': ${error.message}`);
      }
    }

    // C. Super Admin foydalanuvchisini tekshirish
    const targetEmail = 'tursunovasilbek5504@gmail.com';

    // 1) Auth tekshiruvi (Service Role orqali)
    if (adminClient) {
      try {
        const { data: userData, error: userError } = await adminClient.auth.admin.listUsers();
        if (userError) {
          results.notes.push(`auth.admin.listUsers xatosi: ${userError.message}`);
        } else {
          const found = (userData.users || []).find(u => u.email?.toLowerCase() === targetEmail.toLowerCase());
          if (found) {
            results.superAdminExistsInAuth = true;
          }
        }
      } catch (err) {
        results.notes.push(`auth tekshiruvida istisno: ${err.message}`);
      }
    }

    // 2) Profile jadvalidan tekshirish
    const { data: adminProf, error: adminProfErr } = await clientToUse
      .from('profiles')
      .select('id, role, full_name, email, is_active')
      .eq('email', targetEmail)
      .maybeSingle();

    if (adminProf) {
      results.superAdminExistsInProfile = true;
      results.superAdminProfile = adminProf;
    }

    console.log('\n--- NATIJALAR ---');
    console.log('1. Baza bilan ulanish:', results.connection ? 'Muvaffaqiyatli (OK)' : 'Muvaffaqiyatsiz');
    console.log('2. Jadvallar holati:', JSON.stringify(results.tables, null, 2));
    console.log('3. Super Admin Auth mavjudligi:', results.superAdminExistsInAuth ? 'Mavjud (OK)' : 'Hali mavjud emas');
    console.log('4. Super Admin Profile mavjudligi:', results.superAdminExistsInProfile ? 'Mavjud (OK)' : 'Hali mavjud emas');
    if (results.superAdminProfile) {
      console.log('   Rol:', results.superAdminProfile.role);
      console.log('   Faollik:', results.superAdminProfile.is_active);
    }
    if (results.notes.length > 0) {
      console.log('\nQo\'shimcha eslatmalar:');
      results.notes.forEach(n => console.log(' - ', n));
    }

  } catch (err) {
    console.error('Kutilmagan xato:', err.message);
  }
}

runVerification();
