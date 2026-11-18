-- ============================================================================
-- EduCenter — STEP 1: Extensions & User Roles Enum Setup
-- Ishga tushiring va "Run" tugmasini bosing (Alohida commit qilinadi)
-- ============================================================================

-- 1. Pgcrypto kengaytmasini yoqish
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Agar user_role turi mavjud bo'lmasa, uni to'liq 6 ta rol bilan yaratish
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM (
            'super_admin',
            'admin',
            'manager',
            'teacher',
            'student',
            'parent'
        );
    END IF;
END $$;

-- 3. Agar user_role oldin mavjud bo'lib, ayrim rollar yetishmayotgan bo'lsa, ularni qo'shish
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager';

-- Boshqa enum turlarini tekshirish va yaratish
DO $$ BEGIN
    CREATE TYPE course_category AS ENUM ('robotics', 'it_programming');
    CREATE TYPE attendance_status AS ENUM ('present', 'late', 'absent', 'excused');
    CREATE TYPE payment_status AS ENUM ('paid', 'partial', 'pending', 'overdue', 'refunded');
    CREATE TYPE payment_method AS ENUM ('cash', 'payme', 'click', 'uzum', 'bank_transfer');
    CREATE TYPE submission_status AS ENUM ('pending', 'submitted', 'graded', 'returned');
    CREATE TYPE xp_source_type AS ENUM ('attendance', 'homework', 'quiz', 'robotics_project', 'manual_bonus', 'reward_redemption');
    CREATE TYPE notification_type AS ENUM ('attendance', 'homework', 'payment', 'schedule', 'achievement', 'weekly_report', 'system');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
