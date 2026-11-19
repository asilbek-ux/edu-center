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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_USERS = [
  {
    email: 'admin@educenter.uz',
    password: 'admin123',
    role: 'super_admin',
    fullName: 'Anvar Alimov',
    phone: '+998 90 123 45 67',
  },
  {
    email: 'menejer@educenter.uz',
    password: 'admin123',
    role: 'admin',
    fullName: 'Malika Karimova',
    phone: '+998 90 234 56 78',
  },
  {
    email: 'teacher@educenter.uz',
    password: 'teacher123',
    role: 'teacher',
    fullName: 'Javohir Rustamov',
    phone: '+998 90 345 67 89',
    specialization: 'robotics',
  },
  {
    email: 'student@educenter.uz',
    password: 'student123',
    role: 'student',
    fullName: 'Sardorbek Rahimov',
    phone: '+998 90 456 78 90',
  },
  {
    email: 'parent@educenter.uz',
    password: 'parent123',
    role: 'parent',
    fullName: 'Dilnoza Rahimova',
    phone: '+998 90 567 89 01',
  },
];

async function seedDemoAccounts() {
  console.log('--- SEEDING DEMO ACCOUNTS TO SUPABASE AUTH ---');
  const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error('List users error:', listError);
    return;
  }

  for (const account of DEMO_USERS) {
    const existing = (usersData.users || []).find(
      (u) => u.email?.toLowerCase() === account.email.toLowerCase()
    );
    let userId;
    if (existing) {
      console.log(`Updating ${account.email}...`);
      userId = existing.id;
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: account.password,
        email_confirm: true,
        user_metadata: { full_name: account.fullName },
      });
    } else {
      console.log(`Creating ${account.email}...`);
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: { full_name: account.fullName },
      });
      if (error) {
        console.error(`Error creating ${account.email}:`, error.message);
        continue;
      }
      userId = data.user.id;
    }

    // Upsert profile
    const { error: profErr } = await supabaseAdmin.from('profiles').upsert(
      {
        id: userId,
        role: account.role,
        full_name: account.fullName,
        email: account.email,
        phone: account.phone,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (profErr) {
      console.warn(`Profile upsert error for ${account.email}:`, profErr.message);
    } else {
      console.log(`Profile synced for ${account.email} (${account.role}).`);
    }

    // If teacher, ensure teacher record
    if (account.role === 'teacher') {
      const { data: tch } = await supabaseAdmin.from('teachers').select('id').eq('profile_id', userId).single();
      if (!tch) {
        await supabaseAdmin.from('teachers').insert({
          profile_id: userId,
          employee_code: 'TCH-001',
          specialization: account.specialization || 'robotics',
          salary_rate_uzs: 4500000,
        });
      }
    }

    // If student, ensure student record
    if (account.role === 'student') {
      const { data: std } = await supabaseAdmin.from('students').select('id').eq('profile_id', userId).single();
      if (!std) {
        await supabaseAdmin.from('students').insert({
          profile_id: userId,
          student_code: 'EDU-2026-001',
          school_grade: '8-sinf',
        });
      }
    }

    // If parent, ensure parent record
    if (account.role === 'parent') {
      const { data: prt } = await supabaseAdmin.from('parents').select('id').eq('profile_id', userId).single();
      if (!prt) {
        await supabaseAdmin.from('parents').insert({
          profile_id: userId,
          relationship: 'Ona',
        });
      }
    }
  }

  console.log('--- ALL DEMO ACCOUNTS READY ---');
}

seedDemoAccounts();
