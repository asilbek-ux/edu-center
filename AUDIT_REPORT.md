# EduCenter ERP/LMS — Comprehensive Codebase Audit & Security Report

**Date:** 2026-11-16  
**Platform:** EduCenter (IT, Robototexnika va Dasturlash O'quv Markazi Boshqaruv Tizimi)  
**Primary UI Language:** O'zbek tili (Lotin)  
**Target Scale:** 50–500 o'quvchi, 5 ta asosiy rol: Super Admin, Admin, O'qituvchi, O'quvchi, Ota-ona  
**Stack:** Next.js 14 (App Router), TypeScript 5.6, Tailwind CSS, Supabase (PostgreSQL, Auth, RLS), Python 3.13, aiogram 3.x

---

## 1. Mavjud Ishlayotgan Funksiyalar (Existing Features)
1. **Baza Strukturasi (PostgreSQL 21 ta jadval)**:
   - `profiles`, `students`, `teachers`, `parents`, `parent_students`, `courses`, `groups`, `group_students`, `lessons`, `attendance`, `payments`, `homework`, `submissions`, `quizzes`, `questions`, `quiz_attempts`, `rewards`, `xp_transactions`, `achievements`, `student_achievements`, `notifications`.
   - `001_initial_schema.sql` va `002_security_and_rls_hardening.sql` migratsiyalari mavjud.
2. **Xavfsizlik & RLS Asosi**:
   - `current_user_role()`, `current_user_is_active()`, `is_parent_of_student()`, `is_teacher_of_group()` funksiyalari mavjud.
   - `trg_prevent_profile_role_escalation` triggeri profildagi rolni o'zboshimchalik bilan o'zgartirishni bloklaydi.
   - `xp_transactions` jadvalida takroriy XP hisoblanishini cheklovchi `uq_xp_student_activity` unikal cheklovi mavjud.
   - `fn_sync_student_xp_and_level` triggeri orqali o'quvchi XP va Darajasi avtomatik sinxronlanadi.
3. **Geymifikatsiya Funksiyalari (`src/lib/gamification.ts`)**:
   - `calculateStudentLevel`, `evaluateRoboticsProject`, `buildXpIdempotencyKey` algoritmlari to'g'ri ishlangan.
4. **Kirish Sahifasi (`src/app/login/page.tsx`)**:
   - Email va parol bilan autentifikatsiya, xatoliklarni o'zbek tilida ko'rsatish va rollar bo'yicha yo'naltirish mavjud.
5. **Admin Boshqaruv Panelining Boshlang'ich Qismi (`src/app/admin/page.tsx`)**:
   - Asosiy statistika kartalari, o'quvchilar ro'yxati, kurslar va guruhlar ro'yxati, davomat tarixi ko'rinishi mavjud.
6. **Telegram Bot Matn Formatlagichlari (`bot/main.py`)**:
   - Davomat, to'lov va haftalik progress xabarlarining o'zbekcha shablonlari yaratilgan.

---

## 2. Aniqlangan Kamchiliklar va To'liq Emas Qismlar (Incomplete & Missing Features)
1. **Yetishmayotgan Dashboard Sahifalari (CRITICAL 404s)**:
   - `/teacher` yo'nalishi mavjud emas (`src/app/teacher/page.tsx` yo'q) — o'qituvchilar tizimga kirganda 404 xatolik yuz beradi.
   - `/student` yo'nalishi mavjud emas (`src/app/student/page.tsx` yo'q) — o'quvchilar tizimga kirganda 404 xatolik yuz beradi.
   - `/parent` yo'nalishi mavjud emas (`src/app/parent/page.tsx` yo'q) — ota-onalar tizimga kirganda 404 xatolik yuz beradi.
2. **Rol Tizimidagi Kamchilik**:
   - Talabda 5 ta rol ko'rsatilgan: `super_admin`, `admin`, `teacher`, `student`, `parent`.
   - Bazadagi `user_role` enumida esa faqat `admin`, `teacher`, `student`, `parent` mavjud. `super_admin` roli qo'shilishi va unga to'liq huquqlar berilishi lozim.
3. **Admin Panelidagi Chala Amallar**:
   - O'quvchini yangi qo'shish (ro'yxatdan o'tkazish, ota-onasini biriktirish) to'liq modal va action bilan ta'minlanmagan.
   - O'qituvchi qo'shish va tahrirlash (oylik stavka, mutaxassislik, guruhlar biriktirish) tugallanmagan.
   - Ota-onalar bo'limi alohida boshqarilmaydi.
   - To'lovlarni qabul qilish (kassa, Click, Payme orqali to'lov kiritish, kvitansiya raqamini shakllantirish, qarzdorlar ro'yxati) mavjud emas.
   - O'quvchining to'liq profili (davomat tarixi, to'lovlar, uy vazifalari, test natijalari, yutuqlar) modali chala.
   - Kurs va guruhlarni o'chirish/arxivlash hamda guruh sig'imi nazorati to'liq emas.
   - Haqiqiy grafiklar (daromad o'sishi, davomat statistikasi, o'quvchilar dinamikasi) mavjud emas.
4. **O'qituvchi Paneli (`/teacher`) Ehtiyojlari**:
   - Biriktirilgan guruhlar va dars jadvali ko'rinishi.
   - Dars mavzusini kiritish va o'sha kun uchun davomat belgilash (Keldi, Kechikdi, Kelmadi, Sababli).
   - Uy vazifasi va robototexnika loyihalarini yaratish.
   - Topshirilgan vazifalarni tekshirish va rubrika (Mexanika, Kod, Avtonomlik, Ijodkorlik 0-25) bo'yicha baholash.
   - Test (Quiz) yaratish va o'quvchilar natijalarini ko'rish.
5. **O'quvchi Paneli (`/student`) Ehtiyojlari**:
   - Shaxsiy profil, daraja, XP, streak kunlari, yutuqlar (badges).
   - Guruh dars jadvali va dars materiallari.
   - Uy vazifalarini ko'rish va fayl/github/video link orqali topshirish.
   - Onlayn testlarni vaqt limiti bilan topshirish, avtomatik baholanish va XP olish.
   - Davomat va baholar jurnali.
   - EduShop do'konida to'plangan XP larga sovg'alarni buyurtma qilish.
6. **Ota-ona Paneli (`/parent`) Ehtiyojlari**:
   - Farzand(lar)ini tanlash va ularning real vaqtdagi davomati, baholari, to'lov holati, jadvali va qarzdorliklarini ko'rish.
7. **Telegram Bot (`bot/main.py`)**:
   - Botda faqat matn formatlovchi 3 ta funksiya bor. Haqiqiy aiogram 3 `Dispatcher`, bot instansiyasi, `/start <token>`, `/help`, `/davomat`, `/tolov`, `/jadval` komandalari, token orqali hisobni bog'lash va bildirishnomalarni yuboruvchi asinxron servis mavjud emas.

---

## 3. Ma'lumotlar Bazasi va RLS Xavfsizlik Muammolari
1. **O'qituvchilar uchun RLS huquqlari yetishmasligi**:
   - O'qituvchilar o'z guruhlari uchun `lessons`, `homework`, `quizzes`, `questions` qo'shish va `submissions` jadvaliga baho qo'yish huquqiga ega bo'lmagan.
2. **O'quvchilar uchun RLS huquqlari**:
   - O'quvchilar o'z uy vazifalari bo'yicha `submissions` ga yozish va `quiz_attempts` yozish huquqiga ega bo'lishi kerak.
3. **Test savollari xavfsizligi**:
   - `questions` jadvalidagi `correct_option` va `explanation_uz` maydonlari o'quvchiga test topshirishdan oldin ko'rinib qolmasligi uchun xavfsiz server funksiyasi yoki API orqali filtrlanishi shart.
4. **Moliya hisob-kitoblari**:
   - Barcha to'lovlar va qarzdorliklar suzuvchi nuqtasiz (butun son, UZS tiyinsiz) saqlanadi va serverda tranzaksiya orqali tasdiqlanadi.

---

## 4. Bosqichma-bosqich Bajarish Rejasi (Execution Plan)
- **PHASE 2**: Loyiha konfiguratsiyasi va kerakli yordamchi modullarni to'g'rilash.
- **PHASE 3**: Autentifikatsiya, super_admin/admin/teacher/student/parent rollari va marshrutlash.
- **PHASE 4**: Supabase migratsiyasi (003_complete_platform_features.sql) — barcha rollar, RLS siyosatlari, funksiyalar va triggerlar.
- **PHASE 5**: To'liq Admin boshqaruv paneli (KPIlar, grafiklar, modal oynalar, CRUD, hisobotlar).
- **PHASE 6**: O'qituvchi boshqaruv paneli (`/teacher`).
- **PHASE 7**: O'quvchi boshqaruv paneli (`/student`).
- **PHASE 8**: Ota-ona boshqaruv paneli (`/parent`).
- **PHASE 9**: O'quvchilar, guruhlar va kurslarni mukammal boshqarish moduli.
- **PHASE 10**: Davomat va Moliya (To'lovlar, Kvitansiyalar, Qarzdorlik) moduli.
- **PHASE 11**: Uy vazifalari, Testlar (Quizzes), Geymifikatsiya va EduShop.
- **PHASE 12**: To'liq ishlaydigan aiogram 3 Telegram boti va bildirishnomalar integratsiyasi.
- **PHASE 13**: UI/UX, mobil moslashuvchanlik va O'zbek tili mukammalligi.
- **PHASE 14**: Xavfsizlik auditi va avtomatlashtirilgan testlar.
- **PHASE 15**: Ishga tushirish hujjatlari, `.env.example`, ishlab chiqarish (production) yo'riqnomasi.
