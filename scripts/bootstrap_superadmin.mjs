import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env.local securely
const envPath = resolve(__dirname, '../.env.local');
if (!fs.existsSync(envPath)) {
  console.error("XATO: .env.local fayli topilmadi.");
  process.exit(1);
}

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

if (!supabaseUrl || !serviceKey) {
  console.error("XATO: Supabase URL yoki Service Role kaliti topilmadi.");
  process.exit(1);
}

// Service Role client — faqat server tomonida ishlaydi
const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const SUPERADMIN_EMAIL = 'tursunovasilbek5504@gmail.com';
const SUPERADMIN_NAME = 'Asilbek Tursunov';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_INIT_PASSWORD || 'EduAdmin_2026!#Secure';

async function bootstrapSuperAdmin() {
  console.log('--- SUPER ADMIN BOOTSTRAP (AUTH ADMIN API) ---');
  console.log('Email:', SUPERADMIN_EMAIL);
  console.log('Parol:', '[MAXFIY / HIMOYALANGAN]');
  console.log('Supabase Server:', supabaseUrl);

  try {
    // 1. Foydalanuvchi mavjudligini tekshirish
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      throw new Error("Foydalanuvchilar ro'yxatini olishda xatolik: " + listError.message);
    }

    const existingUser = (usersData.users || []).find(
      u => u.email?.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase()
    );

    let userId;

    if (existingUser) {
      console.log('Holat: Foydalanuvchi Auth tizimida mavjud. Parol va email tasdiqlanishi yangilanmoqda...');
      userId = existingUser.id;
      const { data: updated, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: SUPERADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: SUPERADMIN_NAME }
      });
      if (updateError) {
        throw new Error("Parolni yangilashda xatolik: " + updateError.message);
      }
      console.log('Natija: Supabase Auth paroli va tasdiqlanishi muvaffaqiyatli yangilandi.');
    } else {
      console.log("Holat: Yangi Super Admin hisobi yaratilmoqda...");
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: SUPERADMIN_EMAIL,
        password: SUPERADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: SUPERADMIN_NAME }
      });
      if (createError) {
        throw new Error("Foydalanuvchi yaratishda xatolik: " + createError.message);
      }
      userId = created.user.id;
      console.log('Natija: Supabase Auth foydalanuvchisi yaratildi.');
    }

    // 2. public.profiles jadvaliga super_admin rolini biriktirish
    try {
      const { data: profile, error: profError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userId,
          role: 'super_admin',
          full_name: SUPERADMIN_NAME,
          email: SUPERADMIN_EMAIL,
          is_active: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })
        .select()
        .single();

      if (profError) {
        console.warn("Eslatma (Profiles jadvali):", profError.message);
        console.log("Agar SQL migratsiya hali bajarilmagan bo'lsa, avval SQL skriptni ishga tushiring.");
      } else {
        console.log("Natija: 'public.profiles' jadvalida super_admin roli muvaffaqiyatli biriktirildi!");
      }
    } catch (dbErr) {
      console.warn("Profiles jadvaliga yozishda eslatma:", dbErr.message);
    }

    console.log('\n--- TAYYOR ---');
    console.log('Super Admin Auth hisobi to\'liq sozlangan va login qilishga tayyor!');

  } catch (err) {
    console.error("Xatolik:", err.message);
    process.exit(1);
  }
}

bootstrapSuperAdmin();
