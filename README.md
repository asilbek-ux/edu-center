# EduCenter — Ta'lim Markazini Boshqarish Tizimi (ERP / LMS)

**EduCenter** — 50–500 nafar o'quvchiga mo'ljallangan **Robototexnika** hamda **IT va Dasturlash** o'quv markazlari uchun ishlab chiqilgan zamonaviy, to'liq funksional, xavfsiz SaaS ERP/LMS boshqaruv platformasi.
Interfeys to'liq **O'zbek tilida (Lotin alifbosida)** yaratilgan bo'lib, Desktop, Planshet hamda Mobil telefonlarda mukammal moslashuvchan (responsive) ishlaydi.

---

## 1. Asosiy Rollar va Imkoniyatlar (5 ta Foydalanuvchi Roli)

1. **Bosh Administrator (Super Admin)**:
   - Tizim boshqaruvi, administratorlar faoliyatini nazorat qilish, to'liq huquqlar.
2. **Administrator (Admin)**:
   - O'quvchilarni ro'yxatga olish, tahrirlash, guruhlarga biriktirish va o'chirish.
   - O'qituvchilarni qo'shish, maosh stavkalarini belgilash va guruhlarni biriktirish.
   - Ota-onalar profillarini boshqarish va farzandlariga ulash.
   - Kurslar va guruhlarni ochish, guruh sig'imi va jadval to'qnashuvini avtomatik nazorat qilish.
   - Moliya va to'lovlarni qabul qilish (kassa, Payme, Click, Uzum), kvitansiyalarni shakllantirish va qarzdorlar hisobotini yuritish.
   - 11 ta real KPI ko'rsatkichlari va 5 ta real interaktiv grafiklar (tushum, o'sish, davomat, kurslar ommabopligi).
3. **O'qituvchi (Teacher)**:
   - Faqat o'ziga biriktirilgan guruhlar va o'quvchilar ro'yxatini ko'rish.
   - Dars jadvali va xonalar taqsimotini kuzatish.
   - Yangi dars boshlash, dars mavzusini kiritish va o'sha kun uchun davomat belgilash (Hozir, Kechikdi, Kelmadi, Sababli).
   - Uy vazifalari va Robototexnika loyihalarini yaratish, muddat (deadline) va XP mukofotlarini belgilash.
   - O'quvchilar topshirgan ishlarni (kod, video, sxema) 4 ta mezonli rubrika (Mexanika, Kod, Avtonomlik, Ijodkorlik — har biri 0-25 ball) bo'yicha baholash va izoh qoldirish.
   - Onlayn testlar (Quizzes) yaratish va o'quvchilar natijalarini ko'rish.
4. **O'quvchi (Student)**:
   - Shaxsiy profil, o'quvchi kodi, darajasi (Level), XP ballari, dars qoldirmaslik zanjiri (Streak kunlari).
   - Dars jadvali, xona raqami va dars mavzulari.
   - Davomat jurnali va qatnashish foizi.
   - Uy vazifalarini ko'rish va havola (GitHub/Video/Fayl) orqali topshirish, o'qituvchi bahosi va izohlarini olish.
   - Interaktiv onlayn testlarni vaqt hisoblagichi bilan topshirish, avtomatik baholanish va XP yutib olish.
   - Yutuqlar (Achievements/Badges) va darajalar pog'onasi.
   - Shaxsiy bildirishnomalar.
5. **Ota-ona (Parent)**:
   - Bog'langan barcha farzandlarini bir bosishda almashtirib ko'rish.
   - Farzandining real vaqtdagi davomati va o'zlashtirish ko'rsatkichlari.
   - Topshirilgan vazifalar, qo'yilgan ballar va ustoz izohlari.
   - O'quv to'lovlari, to'langan summasi va to'lanishi kerak bo'lgan qoldiq qarz balansi.
   - Telegram orqali har bir dars davomati va to'lov eslatmalarini qabul qilish.

---

## 2. Texnologiyalar Steki

- **Frontend & Server Actions:** Next.js 14 (App Router), React 18, TypeScript 5.6
- **Styling:** Tailwind CSS, Lucide Icons, Modern SaaS UI
- **Backend & Ma'lumotlar Bazasi:** Supabase (PostgreSQL 15+, 21 ta normallashtirilgan jadval, Row Level Security, Triggers, Functions)
- **Autentifikatsiya:** Supabase Auth (Email + Parol, Role-based JWT validation, Protected Routes)
- **Telegram Bot:** Python 3.11–3.13, `aiogram 3.x`, `supabase-py`
- **Geymifikatsiya & Moliya:** Determinant XP hisoblash, tranzaksion butun sonli UZS to'lov hisobi

---

## 3. Muhit O'zgaruvchilarini Sozlash (`.env.local`)

Loyihaning ildiz papkasida `.env.example` dan nusxa olib `.env.local` yarating:

```bash
cp .env.example .env.local
```

Kerakli kalitlar:
```env
# Brauzer uchun ochiq kalitlar
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Server-only maxfiy kalitlar (Hech qachon NEXT_PUBLIC_ prefiksini bermang!)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key
TELEGRAM_BOT_TOKEN=your-telegram-bot-token-from-botfather
TELEGRAM_WEBHOOK_SECRET=your-webhook-secret-token
```

---

## 4. Ma'lumotlar Bazasi Migratsiyalarini Qo'llash (Tartib Qat'iy!)

Supabase Dashboard -> **SQL Editor** bo'limida quyidagi 3 ta faylni ketma-ketlikda ishga tushiring:

1. **`supabase/migrations/001_initial_schema.sql`**
   - 21 ta asosiy jadval, UUID kalitlar, cheklovlar, indekslar va avtomatik XP hisoblash triggerlarini yaratadi.
2. **`supabase/migrations/002_security_and_rls_hardening.sql`**
   - Rekursiyasiz RLS xavfsizlik funksiyalarini yaratadi, foydalanuvchilar o'z rolini o'zboshimchalik bilan o'zgartirishini taqiqlaydi, to'lovlar va XP jadvallarini qulflaydi.
3. **`supabase/migrations/003_complete_platform_features.sql`**
   - `super_admin` rolini kiritadi.
   - O'qituvchilar, o'quvchilar va ota-onalar uchun to'liq RLS siyosatlarini o'rnatadi.
   - Xavfsiz to'lov saqlash (`fn_record_payment`), test topshirish va avtomatik baholash (`fn_submit_quiz_attempt`), Telegram hisobini biriktirish (`fn_link_telegram_account`) va jadval to'qnashuvini tekshirish (`fn_check_group_schedule_conflict`) funksiyalarini yuklaydi.

---

## 5. Web Ilovani Ishga Tushirish

```bash
# Bog'liqliklarni o'rnatish
npm install

# TypeScript va build tekshiruvi
npm run typecheck
npm run build

# Dasturchi rejimida ishga tushirish (Local Dev)
npm run dev
```

Brauzerda oching: [http://localhost:3000](http://localhost:3000)

---

## 6. Telegram Botni Ishga Tushirish (Python + aiogram 3)

Bot serverda alohida asinxron servis sifatida ishlaydi:

```bash
cd bot
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
python main.py
```

Bot imkoniyatlari:
- `/start` — Botni ishga tushirish yoki web paneldan olingan bir martalik xavfsiz token orqali hisobni biriktirish (`/start <token>`).
- `/holat` — Shaxsiy profil, to'plangan XP va joriy darajani ko'rish.
- `/jadval` — Guruh dars kunlari, xona va boshlanish vaqtlari.
- `/davomat` — So'nggi darslardagi qatnashish natijalari.
- `/balans` — O'quv to'lovlari va qoldiq qarz holati.
- `/vazifalar` — Topshirilishi kerak bo'lgan vazifalar ro'yxati.
- **Avtomatik Xabarnomalar**: O'quvchi darsga kelganda, kechikganda yoki dars qoldirganda ota-ona Telegramiga avtomatik xabar yuboriladi.

---

## 7. Avtomatlashtirilgan Testlarni Ishga Tushirish

Loyiha arxitekturasi, xavfsizlik qoidalari, kiritish validatsiyalari va barcha dashboardlar to'liq unit testlar bilan qoplangan:

```bash
python -m unittest discover -s tests -v
```

---

## 8. Ishlab Chiqarishga Joylash (Production Deployment)

### Vercel orqali Frontendni Deploy Qilish:
1. Loyihani GitHub / GitLab omboriga yuklang.
2. [Vercel](https://vercel.com) da **Add New Project** ni bosing va repozitoriyni tanlang.
3. Framework Preset: **Next.js**.
4. **Environment Variables** bo'limida quyidagilarni kiriting:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `TELEGRAM_BOT_TOKEN`
5. **Deploy** tugmasini bosing.

### Telegram Botni Production Serverda Yurgizish:
Botni doimiy (background daemon) sifatida yurgizish uchun `systemd` (Linux) yoki `PM2` dan foydalaning:
```bash
pm2 start "python bot/main.py" --name educenter-bot
```
