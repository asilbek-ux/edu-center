-- ============================================================================
-- EduCenter — Normalized PostgreSQL Schema & Row Level Security (Supabase)
-- Primary Language: Uzbek (Latin) | Courses: Robototexnika, IT va Dasturlash
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom ENUM Types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'manager', 'teacher', 'student', 'parent');
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

-- 1. PROFILES (Linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'student',
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) UNIQUE,
    email VARCHAR(255) UNIQUE,
    avatar_url TEXT,
    telegram_chat_id BIGINT UNIQUE,
    telegram_username VARCHAR(100),
    telegram_link_token VARCHAR(64) UNIQUE,
    preferred_theme VARCHAR(10) DEFAULT 'light' CHECK (preferred_theme IN ('light', 'dark', 'system')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. STUDENTS
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_code VARCHAR(20) NOT NULL UNIQUE, -- e.g. EDU-2026-001
    birth_date DATE,
    school_grade VARCHAR(30),
    xp_total INTEGER NOT NULL DEFAULT 0 CHECK (xp_total >= 0),
    current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level >= 1),
    streak_days INTEGER NOT NULL DEFAULT 0 CHECK (streak_days >= 0),
    monthly_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (monthly_discount_pct BETWEEN 0 AND 100),
    notes TEXT,
    enrolled_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TEACHERS
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    employee_code VARCHAR(20) NOT NULL UNIQUE,
    specialization course_category NOT NULL,
    bio TEXT,
    salary_rate_uzs BIGINT NOT NULL DEFAULT 0 CHECK (salary_rate_uzs >= 0),
    hired_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PARENTS
CREATE TABLE IF NOT EXISTS public.parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    occupation VARCHAR(120),
    emergency_phone VARCHAR(30),
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PARENT_STUDENTS (Many-to-Many Junction)
CREATE TABLE IF NOT EXISTS public.parent_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    relationship VARCHAR(40) NOT NULL DEFAULT 'Ota-ona', -- Ota, Ona, Vasiy
    is_primary_payer BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (parent_id, student_id)
);

-- 6. COURSES (Robototexnika & IT va Dasturlash)
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    title_uz VARCHAR(150) NOT NULL,
    category course_category NOT NULL,
    description_uz TEXT,
    duration_months SMALLINT NOT NULL DEFAULT 6 CHECK (duration_months > 0),
    lessons_per_week SMALLINT NOT NULL DEFAULT 3 CHECK (lessons_per_week BETWEEN 1 AND 7),
    monthly_fee_uzs BIGINT NOT NULL CHECK (monthly_fee_uzs >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. GROUPS
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) NOT NULL UNIQUE, -- e.g. ROB-01, PY-02
    name VARCHAR(100) NOT NULL,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
    room VARCHAR(40) NOT NULL DEFAULT 'Xona 1',
    schedule_days VARCHAR(50) NOT NULL, -- 'Du-Cho-Ju' or 'Se-Pay-Sha'
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_students SMALLINT NOT NULL DEFAULT 15 CHECK (max_students BETWEEN 1 AND 30),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'forming', 'completed', 'paused')),
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. GROUP_STUDENTS (Enrollment Junction)
CREATE TABLE IF NOT EXISTS public.group_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'graduated', 'dropped')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_id, student_id)
);

-- 9. LESSONS
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    lesson_number SMALLINT NOT NULL CHECK (lesson_number > 0),
    topic_uz VARCHAR(200) NOT NULL,
    lesson_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    materials_url TEXT,
    is_robotics_lab BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_id, lesson_date, start_time)
);

-- 10. ATTENDANCE
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status attendance_status NOT NULL DEFAULT 'present',
    participation_score SMALLINT CHECK (participation_score BETWEEN 0 AND 10),
    remarks TEXT,
    marked_by UUID REFERENCES public.profiles(id),
    marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (lesson_id, student_id)
);

-- 11. PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(30) NOT NULL UNIQUE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE RESTRICT,
    billing_month DATE NOT NULL, -- First day of billing month e.g. 2026-11-01
    amount_due_uzs BIGINT NOT NULL CHECK (amount_due_uzs >= 0),
    amount_paid_uzs BIGINT NOT NULL DEFAULT 0 CHECK (amount_paid_uzs >= 0),
    payment_method payment_method NOT NULL DEFAULT 'payme',
    status payment_status NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    receipt_url TEXT,
    recorded_by UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. HOMEWORK
CREATE TABLE IF NOT EXISTS public.homework (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    title_uz VARCHAR(200) NOT NULL,
    description_uz TEXT NOT NULL,
    attachment_url TEXT,
    max_score SMALLINT NOT NULL DEFAULT 100 CHECK (max_score > 0),
    xp_reward SMALLINT NOT NULL DEFAULT 25 CHECK (xp_reward >= 0),
    is_robotics_project BOOLEAN NOT NULL DEFAULT FALSE,
    deadline TIMESTAMPTZ NOT NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. SUBMISSIONS (Includes Robotics Project Rubric Evaluation)
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    homework_id UUID NOT NULL REFERENCES public.homework(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    file_url TEXT,
    github_or_video_url TEXT,
    comment_student TEXT,
    status submission_status NOT NULL DEFAULT 'submitted',
    score SMALLINT CHECK (score >= 0),
    -- Robotics Project Evaluation criteria (0-25 each)
    robotics_hardware_score SMALLINT CHECK (robotics_hardware_score BETWEEN 0 AND 25),
    robotics_code_score SMALLINT CHECK (robotics_code_score BETWEEN 0 AND 25),
    robotics_Autonomous_score SMALLINT CHECK (robotics_Autonomous_score BETWEEN 0 AND 25),
    robotics_creativity_score SMALLINT CHECK (robotics_creativity_score BETWEEN 0 AND 25),
    feedback_teacher TEXT,
    graded_by UUID REFERENCES public.profiles(id),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    graded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (homework_id, student_id)
);

-- 14. QUIZZES
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    title_uz VARCHAR(200) NOT NULL,
    description_uz TEXT,
    time_limit_minutes SMALLINT NOT NULL DEFAULT 20 CHECK (time_limit_minutes > 0),
    passing_score_pct SMALLINT NOT NULL DEFAULT 70 CHECK (passing_score_pct BETWEEN 1 AND 100),
    xp_reward SMALLINT NOT NULL DEFAULT 40 CHECK (xp_reward >= 0),
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    available_from TIMESTAMPTZ,
    available_until TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. QUESTIONS
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_order SMALLINT NOT NULL DEFAULT 1,
    question_text_uz TEXT NOT NULL,
    code_snippet TEXT,
    options JSONB NOT NULL, -- e.g. [{"id":"A","text":"..."},{"id":"B","text":"..."}]
    correct_option VARCHAR(10) NOT NULL,
    points SMALLINT NOT NULL DEFAULT 10 CHECK (points > 0),
    explanation_uz TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. QUIZ_ATTEMPTS
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    score_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (score_pct BETWEEN 0 AND 100),
    passed BOOLEAN NOT NULL DEFAULT FALSE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (quiz_id, student_id)
);

-- 17. REWARDS (EduShop items)
CREATE TABLE IF NOT EXISTS public.rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_uz VARCHAR(150) NOT NULL,
    description_uz TEXT,
    cost_xp INTEGER NOT NULL CHECK (cost_xp > 0),
    stock_quantity INTEGER NOT NULL DEFAULT 10 CHECK (stock_quantity >= 0),
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. XP_TRANSACTIONS (Anti-duplicate idempotency constraint on student + source_type + source_id)
CREATE TABLE IF NOT EXISTS public.xp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    source_type xp_source_type NOT NULL,
    source_id UUID NOT NULL, -- ID of attendance, submission, quiz_attempt, or reward
    amount INTEGER NOT NULL, -- Positive for earning, negative for reward redemption
    reason_uz VARCHAR(255) NOT NULL,
    awarded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- CRITICAL: Prevents duplicate XP awards for the exact same activity
    CONSTRAINT uq_xp_student_activity UNIQUE (student_id, source_type, source_id)
);

-- 19. ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    title_uz VARCHAR(120) NOT NULL,
    description_uz TEXT NOT NULL,
    icon_name VARCHAR(50) NOT NULL DEFAULT 'Trophy',
    xp_bonus INTEGER NOT NULL DEFAULT 50 CHECK (xp_bonus >= 0),
    criteria_type VARCHAR(50) NOT NULL, -- 'streak_days', 'robotics_score', 'quizzes_passed', 'xp_milestone'
    criteria_threshold INTEGER NOT NULL CHECK (criteria_threshold > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. STUDENT_ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS public.student_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, achievement_id)
);

-- 21. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type notification_type NOT NULL DEFAULT 'system',
    title_uz VARCHAR(200) NOT NULL,
    body_uz TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    sent_via_telegram BOOLEAN NOT NULL DEFAULT FALSE,
    telegram_message_id BIGINT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_students_code ON public.students(student_code);
CREATE INDEX IF NOT EXISTS idx_students_xp ON public.students(xp_total DESC);
CREATE INDEX IF NOT EXISTS idx_groups_course ON public.groups(course_id);
CREATE INDEX IF NOT EXISTS idx_groups_teacher ON public.groups(teacher_id);
CREATE INDEX IF NOT EXISTS idx_group_students_student ON public.group_students(student_id);
CREATE INDEX IF NOT EXISTS idx_lessons_group_date ON public.lessons(group_id, lesson_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_student_month ON public.payments(student_id, billing_month DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_submissions_homework ON public.submissions(homework_id, status);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_weekly ON public.xp_transactions(created_at DESC, student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_profile_id, is_read, created_at DESC);

-- ============================================================================
-- AUTOMATIC LEVEL & XP SYNCHRONIZATION TRIGGER
-- Level Formula: Level = FLOOR(SQRT(GREATEST(xp_total, 0) / 100.0)) + 1
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_sync_student_xp_and_level()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_xp INTEGER;
    v_new_level INTEGER;
BEGIN
    SELECT COALESCE(SUM(amount), 0)
      INTO v_new_xp
      FROM public.xp_transactions
     WHERE student_id = NEW.student_id;

    v_new_xp := GREATEST(v_new_xp, 0);
    v_new_level := FLOOR(SQRT(v_new_xp / 100.0))::INTEGER + 1;

    UPDATE public.students
       SET xp_total = v_new_xp,
           current_level = v_new_level,
           updated_at = NOW()
     WHERE id = NEW.student_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_student_xp ON public.xp_transactions;
CREATE TRIGGER trg_sync_student_xp
AFTER INSERT OR UPDATE OR DELETE ON public.xp_transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_student_xp_and_level();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to check current user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 1. Admin Full Access Policy across tables
CREATE POLICY admin_full_profiles ON public.profiles FOR ALL USING (public.current_user_role() = 'admin');
CREATE POLICY admin_full_students ON public.students FOR ALL USING (public.current_user_role() = 'admin');
CREATE POLICY admin_full_teachers ON public.teachers FOR ALL USING (public.current_user_role() = 'admin');
CREATE POLICY admin_full_parents ON public.parents FOR ALL USING (public.current_user_role() = 'admin');
CREATE POLICY admin_full_courses ON public.courses FOR ALL USING (public.current_user_role() = 'admin');
CREATE POLICY admin_full_groups ON public.groups FOR ALL USING (public.current_user_role() = 'admin');
CREATE POLICY admin_full_attendance ON public.attendance FOR ALL USING (public.current_user_role() = 'admin');
CREATE POLICY admin_full_payments ON public.payments FOR ALL USING (public.current_user_role() = 'admin');
CREATE POLICY admin_full_homework ON public.homework FOR ALL USING (public.current_user_role() = 'admin');
CREATE POLICY admin_full_submissions ON public.submissions FOR ALL USING (public.current_user_role() = 'admin');
CREATE POLICY admin_full_quizzes ON public.quizzes FOR ALL USING (public.current_user_role() = 'admin');
CREATE POLICY admin_full_xp ON public.xp_transactions FOR ALL USING (public.current_user_role() = 'admin');
CREATE POLICY admin_full_notifications ON public.notifications FOR ALL USING (public.current_user_role() = 'admin');

-- 2. Self & Role-Scoped Read/Write Policies
CREATE POLICY profile_read_own ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY courses_read_all ON public.courses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY rewards_read_all ON public.rewards FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY achievements_read_all ON public.achievements FOR SELECT USING (auth.role() = 'authenticated');

-- Student reads own student row, attendance, payments, and XP
CREATE POLICY student_read_self ON public.students FOR SELECT
USING (
    profile_id = auth.uid()
    OR public.current_user_role() = 'teacher'
    OR id IN (
        SELECT ps.student_id FROM public.parent_students ps
        JOIN public.parents p ON p.id = ps.parent_id
        WHERE p.profile_id = auth.uid()
    )
);

-- Parent & Student read own payments
CREATE POLICY payment_read_student_or_parent ON public.payments FOR SELECT
USING (
    student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
    OR student_id IN (
        SELECT ps.student_id FROM public.parent_students ps
        JOIN public.parents p ON p.id = ps.parent_id
        WHERE p.profile_id = auth.uid()
    )
);

-- Teacher manages attendance & homework for assigned groups
CREATE POLICY teacher_manage_attendance ON public.attendance FOR ALL
USING (
    public.current_user_role() = 'teacher' AND lesson_id IN (
        SELECT l.id FROM public.lessons l
        JOIN public.groups g ON g.id = l.group_id
        JOIN public.teachers t ON t.id = g.teacher_id
        WHERE t.profile_id = auth.uid()
    )
);

-- Notifications scoped to recipient
CREATE POLICY notifications_own ON public.notifications FOR SELECT
USING (recipient_profile_id = auth.uid());
-- ============================================================================
-- EduCenter — Migration 002: Security & RLS Hardening (Applied after 001)
-- Fixes:
-- 1. Eliminates recursive RLS policy on public.profiles via SECURITY DEFINER helpers
-- 2. Prevents privilege escalation (self-assigning 'admin' or 'teacher' role)
-- 3. Adds missing self-read policies on teachers, parents, and parent_students
-- 4. Protects payments and xp_transactions from unauthorized INSERT/UPDATE/DELETE
-- ============================================================================

-- 0. Non-recursive SECURITY DEFINER helper functions (bypasses RLS recursion safely)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_active FROM public.profiles WHERE id = auth.uid()), FALSE);
$$;

CREATE OR REPLACE FUNCTION public.is_parent_of_student(p_student_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.parent_students ps
      JOIN public.parents p ON p.id = ps.parent_id
     WHERE ps.student_id = p_student_id
       AND p.profile_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_of_group(p_group_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.groups g
      JOIN public.teachers t ON t.id = g.teacher_id
     WHERE g.id = p_group_id
       AND t.profile_id = auth.uid()
  );
$$;

-- 1. Secure Auth Signup Trigger: Never trust client metadata for role assignment
CREATE OR REPLACE FUNCTION public.fn_handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, role, full_name, email, phone, is_active)
    VALUES (
        NEW.id,
        'student'::user_role, -- Strictly default to student; only Admin can promote roles
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        NEW.raw_user_meta_data->>'phone',
        TRUE
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.fn_handle_new_auth_user();

-- 2. Prevent Privilege Escalation on Profile Updates
CREATE OR REPLACE FUNCTION public.fn_prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active) THEN
        IF public.current_user_role() IS DISTINCT FROM 'admin'::user_role THEN
            RAISE EXCEPTION 'Ruxsat etilmagan amal: Foydalanuvchi o''z rolini yoki faollik holatini o''zgartira olmaydi.';
        END IF;
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_profile_role_escalation();

-- Non-recursive Profile Update Policy (uses SECURITY DEFINER helpers instead of self-querying public.profiles)
DROP POLICY IF EXISTS profile_update_own_safe ON public.profiles;
CREATE POLICY profile_update_own_safe ON public.profiles
FOR UPDATE
USING (id = auth.uid() AND public.current_user_is_active())
WITH CHECK (
    id = auth.uid()
    AND role = public.current_user_role()
    AND is_active = public.current_user_is_active()
);

-- 3. Self-Read Policies for Teachers, Parents, and Parent-Student Links (Fixes join visibility)
DROP POLICY IF EXISTS teacher_read_self ON public.teachers;
CREATE POLICY teacher_read_self ON public.teachers
FOR SELECT USING (profile_id = auth.uid() OR public.current_user_role() = 'admin');

DROP POLICY IF EXISTS parent_read_self ON public.parents;
CREATE POLICY parent_read_self ON public.parents
FOR SELECT USING (profile_id = auth.uid() OR public.current_user_role() = 'admin');

DROP POLICY IF EXISTS parent_students_read_scoped ON public.parent_students;
CREATE POLICY parent_students_read_scoped ON public.parent_students
FOR SELECT USING (
    public.current_user_role() IN ('admin', 'teacher')
    OR public.is_parent_of_student(student_id)
);

-- Replace student & payment read policies to use non-recursive SECURITY DEFINER helper
DROP POLICY IF EXISTS student_read_self ON public.students;
CREATE POLICY student_read_self ON public.students
FOR SELECT USING (
    profile_id = auth.uid()
    OR public.current_user_role() IN ('admin', 'teacher')
    OR public.is_parent_of_student(id)
);

DROP POLICY IF EXISTS payment_read_student_or_parent ON public.payments;
CREATE POLICY payment_read_student_or_parent ON public.payments
FOR SELECT USING (
    public.current_user_role() = 'admin'
    OR student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
    OR public.is_parent_of_student(student_id)
);

-- 4. Strict Payment Protection: Only Admin can INSERT, UPDATE, or DELETE payments
DROP POLICY IF EXISTS admin_only_insert_payments ON public.payments;
CREATE POLICY admin_only_insert_payments ON public.payments
FOR INSERT WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS admin_only_update_payments ON public.payments;
CREATE POLICY admin_only_update_payments ON public.payments
FOR UPDATE USING (public.current_user_role() = 'admin')
WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS admin_only_delete_payments ON public.payments;
CREATE POLICY admin_only_delete_payments ON public.payments
FOR DELETE USING (public.current_user_role() = 'admin');

-- 5. Strict XP Transaction Protection: Students & Parents can NEVER insert/update/delete XP
DROP POLICY IF EXISTS xp_read_scoped ON public.xp_transactions;
CREATE POLICY xp_read_scoped ON public.xp_transactions
FOR SELECT USING (
    public.current_user_role() IN ('admin', 'teacher')
    OR student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
    OR public.is_parent_of_student(student_id)
);

DROP POLICY IF EXISTS xp_write_admin_or_teacher_only ON public.xp_transactions;
CREATE POLICY xp_write_admin_or_teacher_only ON public.xp_transactions
FOR INSERT WITH CHECK (
    public.current_user_role() IN ('admin', 'teacher')
);

DROP POLICY IF EXISTS xp_update_admin_only ON public.xp_transactions;
CREATE POLICY xp_update_admin_only ON public.xp_transactions
FOR UPDATE USING (public.current_user_role() = 'admin')
WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS xp_delete_admin_only ON public.xp_transactions;
CREATE POLICY xp_delete_admin_only ON public.xp_transactions
FOR DELETE USING (public.current_user_role() = 'admin');

-- 6. Group & Enrollment Policies for Course History & Schedule Access
DROP POLICY IF EXISTS groups_read_authenticated ON public.groups;
CREATE POLICY groups_read_authenticated ON public.groups
FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS group_students_read_scoped ON public.group_students;
CREATE POLICY group_students_read_scoped ON public.group_students
FOR SELECT USING (
    public.current_user_role() IN ('admin', 'teacher')
    OR student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
    OR public.is_parent_of_student(student_id)
);

DROP POLICY IF EXISTS admin_full_group_students ON public.group_students;
CREATE POLICY admin_full_group_students ON public.group_students
FOR ALL USING (public.current_user_role() = 'admin')
WITH CHECK (public.current_user_role() = 'admin');
-- ============================================================================
-- EduCenter — Migration 003: Complete Platform Features, Roles, and RLS
-- Applied after 001_initial_schema.sql and 002_security_and_rls_hardening.sql
-- ============================================================================

-- 1. Upgrade user_role enum to include 'super_admin'
DO $$ BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin' BEFORE 'admin';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Non-recursive SECURITY DEFINER helper functions for multi-role security
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role::text IN ('admin', 'super_admin')
      AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role::text = 'super_admin'
      AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_of_student(p_student_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.group_students gs
      JOIN public.groups g ON g.id = gs.group_id
      JOIN public.teachers t ON t.id = g.teacher_id
     WHERE gs.student_id = p_student_id
       AND t.profile_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_student_in_group(p_group_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.group_students gs
      JOIN public.students s ON s.id = gs.student_id
     WHERE gs.group_id = p_group_id
       AND s.profile_id = auth.uid()
       AND gs.status = 'active'
  );
$$;

-- 3. Super Admin & Admin Full Policies
CREATE POLICY super_admin_full_profiles ON public.profiles FOR ALL USING (public.is_admin());
CREATE POLICY super_admin_full_students ON public.students FOR ALL USING (public.is_admin());
CREATE POLICY super_admin_full_teachers ON public.teachers FOR ALL USING (public.is_admin());
CREATE POLICY super_admin_full_parents ON public.parents FOR ALL USING (public.is_admin());
CREATE POLICY super_admin_full_parent_students ON public.parent_students FOR ALL USING (public.is_admin());
CREATE POLICY super_admin_full_courses ON public.courses FOR ALL USING (public.is_admin());
CREATE POLICY super_admin_full_groups ON public.groups FOR ALL USING (public.is_admin());
CREATE POLICY super_admin_full_group_students ON public.group_students FOR ALL USING (public.is_admin());
CREATE POLICY super_admin_full_lessons ON public.lessons FOR ALL USING (public.is_admin());
CREATE POLICY super_admin_full_attendance ON public.attendance FOR ALL USING (public.is_admin());
CREATE POLICY super_admin_full_payments ON public.payments FOR ALL USING (public.is_admin());
CREATE POLICY super_admin_full_homework ON public.homework FOR ALL USING (public.is_admin());
CREATE POLICY super_admin_full_submissions ON public.submissions FOR ALL USING (public.is_admin());
CREATE POLICY super_admin_full_quizzes ON public.quizzes FOR ALL USING (public.is_admin());
CREATE POLICY super_admin_full_questions ON public.questions FOR ALL USING (public.is_admin());
CREATE POLICY super_admin_full_quiz_attempts ON public.quiz_attempts FOR ALL USING (public.is_admin());
CREATE POLICY super_admin_full_rewards ON public.rewards FOR ALL USING (public.is_admin());
CREATE POLICY super_admin_full_xp ON public.xp_transactions FOR ALL USING (public.is_admin());
CREATE POLICY super_admin_full_notifications ON public.notifications FOR ALL USING (public.is_admin());
CREATE POLICY super_admin_full_achievements ON public.achievements FOR ALL USING (public.is_admin());
CREATE POLICY super_admin_full_student_achievements ON public.student_achievements FOR ALL USING (public.is_admin());

-- 4. Teacher RLS Policies: Lessons, Homework, Submissions, Quizzes
DROP POLICY IF EXISTS teacher_manage_lessons ON public.lessons;
CREATE POLICY teacher_manage_lessons ON public.lessons
FOR ALL USING (
    public.is_admin() OR public.is_teacher_of_group(group_id)
) WITH CHECK (
    public.is_admin() OR public.is_teacher_of_group(group_id)
);

DROP POLICY IF EXISTS teacher_manage_homework ON public.homework;
CREATE POLICY teacher_manage_homework ON public.homework
FOR ALL USING (
    public.is_admin() OR public.is_teacher_of_group(group_id)
) WITH CHECK (
    public.is_admin() OR public.is_teacher_of_group(group_id)
);

DROP POLICY IF EXISTS teacher_grade_submissions ON public.submissions;
CREATE POLICY teacher_grade_submissions ON public.submissions
FOR ALL USING (
    public.is_admin() OR homework_id IN (
        SELECT h.id FROM public.homework h
        WHERE public.is_teacher_of_group(h.group_id)
    )
) WITH CHECK (
    public.is_admin() OR homework_id IN (
        SELECT h.id FROM public.homework h
        WHERE public.is_teacher_of_group(h.group_id)
    )
);

DROP POLICY IF EXISTS teacher_manage_quizzes ON public.quizzes;
CREATE POLICY teacher_manage_quizzes ON public.quizzes
FOR ALL USING (
    public.is_admin() OR public.is_teacher_of_group(group_id)
) WITH CHECK (
    public.is_admin() OR public.is_teacher_of_group(group_id)
);

DROP POLICY IF EXISTS teacher_manage_questions ON public.questions;
CREATE POLICY teacher_manage_questions ON public.questions
FOR ALL USING (
    public.is_admin() OR quiz_id IN (
        SELECT q.id FROM public.quizzes q
        WHERE public.is_teacher_of_group(q.group_id)
    )
) WITH CHECK (
    public.is_admin() OR quiz_id IN (
        SELECT q.id FROM public.quizzes q
        WHERE public.is_teacher_of_group(q.group_id)
    )
);

-- 5. Student RLS Policies: Lessons, Homework, Submissions, Quiz Attempts
DROP POLICY IF EXISTS student_read_lessons ON public.lessons;
CREATE POLICY student_read_lessons ON public.lessons
FOR SELECT USING (
    public.is_admin()
    OR public.is_teacher_of_group(group_id)
    OR public.is_student_in_group(group_id)
    OR group_id IN (
        SELECT gs.group_id FROM public.group_students gs
        WHERE public.is_parent_of_student(gs.student_id)
    )
);

DROP POLICY IF EXISTS student_read_homework ON public.homework;
CREATE POLICY student_read_homework ON public.homework
FOR SELECT USING (
    public.is_admin()
    OR public.is_teacher_of_group(group_id)
    OR public.is_student_in_group(group_id)
    OR group_id IN (
        SELECT gs.group_id FROM public.group_students gs
        WHERE public.is_parent_of_student(gs.student_id)
    )
);

DROP POLICY IF EXISTS student_manage_own_submissions ON public.submissions;
CREATE POLICY student_manage_own_submissions ON public.submissions
FOR INSERT WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
);

CREATE POLICY student_update_own_submissions ON public.submissions
FOR UPDATE USING (
    student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
    AND status = 'submitted'
) WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
);

CREATE POLICY student_read_own_submissions ON public.submissions
FOR SELECT USING (
    public.is_admin()
    OR student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
    OR public.is_parent_of_student(student_id)
    OR homework_id IN (
        SELECT h.id FROM public.homework h
        WHERE public.is_teacher_of_group(h.group_id)
    )
);

-- 6. Quiz Attempts RLS
DROP POLICY IF EXISTS quiz_attempts_read_scoped ON public.quiz_attempts;
CREATE POLICY quiz_attempts_read_scoped ON public.quiz_attempts
FOR SELECT USING (
    public.is_admin()
    OR student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
    OR public.is_parent_of_student(student_id)
    OR quiz_id IN (
        SELECT q.id FROM public.quizzes q
        WHERE public.is_teacher_of_group(q.group_id)
    )
);

DROP POLICY IF EXISTS student_insert_quiz_attempt ON public.quiz_attempts;
CREATE POLICY student_insert_quiz_attempt ON public.quiz_attempts
FOR INSERT WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
);

-- 7. Notifications Update Policy: Recipients can mark as read
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own ON public.notifications
FOR UPDATE USING (recipient_profile_id = auth.uid())
WITH CHECK (recipient_profile_id = auth.uid());

CREATE POLICY notifications_insert_authorized ON public.notifications
FOR INSERT WITH CHECK (
    public.is_admin() OR public.current_user_role() = 'teacher'::user_role
);

-- ============================================================================
-- 8. SECURE STORED FUNCTIONS (Financial, Quiz Grading, Attendance & Telegram)
-- ============================================================================

-- Function: Record payment securely with integer currency and audit
CREATE OR REPLACE FUNCTION public.fn_record_payment(
    p_student_id UUID,
    p_group_id UUID,
    p_billing_month DATE,
    p_amount_due BIGINT,
    p_amount_paid BIGINT,
    p_payment_method payment_method,
    p_status payment_status,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invoice_num VARCHAR(30);
    v_payment_id UUID;
    v_rand_seq INTEGER;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Ruxsat etilmagan amal: Faqat administrator to''lovlarni qayd qila oladi.';
    END IF;

    IF p_amount_due < 0 OR p_amount_paid < 0 THEN
        RAISE EXCEPTION 'To''lov summasi manfiy bo''lishi mumkin emas.';
    END IF;

    v_rand_seq := FLOOR(RANDOM() * 89999 + 10000)::INTEGER;
    v_invoice_num := 'INV-' || TO_CHAR(p_billing_month, 'YYYYMM') || '-' || v_rand_seq::VARCHAR;

    INSERT INTO public.payments (
        invoice_number,
        student_id,
        group_id,
        billing_month,
        amount_due_uzs,
        amount_paid_uzs,
        payment_method,
        status,
        paid_at,
        recorded_by,
        notes
    ) VALUES (
        v_invoice_num,
        p_student_id,
        p_group_id,
        p_billing_month,
        p_amount_due,
        p_amount_paid,
        p_payment_method,
        p_status,
        CASE WHEN p_amount_paid > 0 THEN NOW() ELSE NULL END,
        auth.uid(),
        p_notes
    )
    RETURNING id INTO v_payment_id;

    RETURN v_payment_id;
END;
$$;

-- Function: Secure Quiz Submission and Automated Server-side Grading
CREATE OR REPLACE FUNCTION public.fn_submit_quiz_attempt(
    p_quiz_id UUID,
    p_answers JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id UUID;
    v_quiz public.quizzes%ROWTYPE;
    v_total_points INTEGER := 0;
    v_earned_points INTEGER := 0;
    v_score_pct NUMERIC(5,2) := 0.00;
    v_passed BOOLEAN := FALSE;
    v_q RECORD;
    v_student_ans VARCHAR;
    v_xp_awarded INTEGER := 0;
    v_attempt_id UUID;
BEGIN
    SELECT id INTO v_student_id FROM public.students WHERE profile_id = auth.uid();
    IF v_student_id IS NULL THEN
        RAISE EXCEPTION 'Faqat ro''yxatdan o''tgan o''quvchilar test topshira oladi.';
    END IF;

    SELECT * INTO v_quiz FROM public.quizzes WHERE id = p_quiz_id AND is_published = TRUE;
    IF v_quiz.id IS NULL THEN
        RAISE EXCEPTION 'Test topilmadi yoki hali e''lon qilinmagan.';
    END IF;

    -- Evaluate each question securely on the server
    FOR v_q IN (SELECT id, correct_option, points FROM public.questions WHERE quiz_id = p_quiz_id) LOOP
        v_total_points := v_total_points + v_q.points;
        v_student_ans := p_answers->>v_q.id::text;
        IF v_student_ans IS NOT NULL AND UPPER(TRIM(v_student_ans)) = UPPER(TRIM(v_q.correct_option)) THEN
            v_earned_points := v_earned_points + v_q.points;
        END IF;
    END LOOP;

    IF v_total_points > 0 THEN
        v_score_pct := ROUND((v_earned_points::NUMERIC / v_total_points::NUMERIC) * 100, 2);
    ELSE
        v_score_pct := 100.00;
    END IF;

    v_passed := v_score_pct >= v_quiz.passing_score_pct;

    -- Insert or update attempt
    INSERT INTO public.quiz_attempts (
        quiz_id,
        student_id,
        answers,
        score_pct,
        passed,
        started_at,
        completed_at
    ) VALUES (
        p_quiz_id,
        v_student_id,
        p_answers,
        v_score_pct,
        v_passed,
        NOW() - INTERVAL '10 minutes',
        NOW()
    )
    ON CONFLICT (quiz_id, student_id)
    DO UPDATE SET
        answers = EXCLUDED.answers,
        score_pct = GREATEST(public.quiz_attempts.score_pct, EXCLUDED.score_pct),
        passed = public.quiz_attempts.passed OR EXCLUDED.passed,
        completed_at = NOW()
    RETURNING id INTO v_attempt_id;

    -- Award XP if passed (idempotent via uq_xp_student_activity)
    IF v_passed AND v_quiz.xp_reward > 0 THEN
        v_xp_awarded := v_quiz.xp_reward;
        INSERT INTO public.xp_transactions (
            student_id,
            source_type,
            source_id,
            amount,
            reason_uz
        ) VALUES (
            v_student_id,
            'quiz'::xp_source_type,
            v_attempt_id,
            v_xp_awarded,
            'Test muvaffaqiyatli topshirildi: ' || v_quiz.title_uz || ' (' || v_score_pct || '%)'
        )
        ON CONFLICT (student_id, source_type, source_id) DO NOTHING;
    END IF;

    RETURN jsonb_build_object(
        'attempt_id', v_attempt_id,
        'earned_points', v_earned_points,
        'total_points', v_total_points,
        'score_pct', v_score_pct,
        'passed', v_passed,
        'xp_awarded', v_xp_awarded
    );
END;
$$;

-- Function: Secure Telegram Account Linking
CREATE OR REPLACE FUNCTION public.fn_link_telegram_account(
    p_token VARCHAR,
    p_chat_id BIGINT,
    p_username VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile public.profiles%ROWTYPE;
BEGIN
    SELECT * INTO v_profile
      FROM public.profiles
     WHERE telegram_link_token = p_token
       AND is_active = TRUE;

    IF v_profile.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error_uz', 'Biriktirish kodi yaroqsiz yoki eskirgan.');
    END IF;

    UPDATE public.profiles
       SET telegram_chat_id = p_chat_id,
           telegram_username = p_username,
           telegram_link_token = NULL,
           updated_at = NOW()
     WHERE id = v_profile.id;

    RETURN jsonb_build_object(
        'success', true,
        'profile_id', v_profile.id,
        'full_name', v_profile.full_name,
        'role', v_profile.role
    );
END;
$$;

-- Function: Schedule Conflict Detection
CREATE OR REPLACE FUNCTION public.fn_check_group_schedule_conflict(
    p_room VARCHAR,
    p_teacher_id UUID,
    p_schedule_days VARCHAR,
    p_start_time TIME,
    p_end_time TIME,
    p_exclude_group_id UUID DEFAULT NULL
)
RETURNS TABLE (conflict_type VARCHAR, conflicting_group_code VARCHAR, conflicting_group_name VARCHAR)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN g.room = p_room AND g.teacher_id = p_teacher_id THEN 'xona_va_oqituvchi'
      WHEN g.room = p_room THEN 'xona_band'
      ELSE 'oqituvchi_band'
    END AS conflict_type,
    g.code AS conflicting_group_code,
    g.name AS conflicting_group_name
  FROM public.groups g
  WHERE g.status = 'active'
    AND (p_exclude_group_id IS NULL OR g.id != p_exclude_group_id)
    AND g.schedule_days = p_schedule_days
    AND (g.room = p_room OR g.teacher_id = p_teacher_id)
    AND (p_start_time < g.end_time AND p_end_time > g.start_time);
$$;
-- ============================================================================
-- EduCenter — Migration 004: Production Setup, Missing Modules, RLS & Super Admin
-- Applied after 001, 002, 003
-- ============================================================================

-- Ensure pgcrypto extension is enabled for secure password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Ensure 'manager' role exists in user_role enum
DO $$ BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager' AFTER 'admin';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Helper Functions for Manager & Super Admin RLS
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role::text IN ('admin', 'super_admin', 'manager')
      AND is_active = TRUE
  );
$$;

-- 3. EXPENSES TABLE (Xarajatlar)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_uz TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('rent', 'utilities', 'salaries', 'equipment', 'marketing', 'office', 'other')),
    amount_uzs BIGINT NOT NULL CHECK (amount_uzs > 0),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    paid_via TEXT NOT NULL DEFAULT 'bank_transfer',
    receipt_url TEXT,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);

-- 4. SALARIES TABLE (O'qituvchilar va xodimlar oylik maoshlari)
CREATE TABLE IF NOT EXISTS public.salaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    billing_month VARCHAR(7) NOT NULL CHECK (billing_month ~ '^[0-9]{4}-[0-9]{2}$'),
    amount_uzs BIGINT NOT NULL CHECK (amount_uzs > 0),
    status payment_status NOT NULL DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    payment_method payment_method NOT NULL DEFAULT 'bank_transfer',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(teacher_id, billing_month)
);

CREATE INDEX IF NOT EXISTS idx_salaries_teacher_month ON public.salaries(teacher_id, billing_month);
CREATE INDEX IF NOT EXISTS idx_salaries_status ON public.salaries(status);

-- 5. ANNOUNCEMENTS TABLE (E'lonlar)
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_uz TEXT NOT NULL,
    content_uz TEXT NOT NULL,
    target_role user_role, -- NULL means visible to everyone
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_announcements_created ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_target_role ON public.announcements(target_role);

-- 6. Ensure group_students has both joined_at and enrolled_at columns
ALTER TABLE public.group_students ADD COLUMN IF NOT EXISTS joined_at DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE public.group_students ADD COLUMN IF NOT EXISTS enrolled_at DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.group_students ADD COLUMN IF NOT EXISTS completed_at DATE;

-- Sync existing rows if any
DO $$ BEGIN
    UPDATE public.group_students SET enrolled_at = joined_at WHERE enrolled_at IS NULL AND joined_at IS NOT NULL;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- ENROLLMENTS VIEW (Synonym for group_students to support both schemas seamlessly)
CREATE OR REPLACE VIEW public.enrollments AS
SELECT
    id,
    group_id,
    student_id,
    status,
    COALESCE(enrolled_at, joined_at, created_at::date) AS enrolled_at,
    joined_at,
    completed_at,
    created_at
FROM public.group_students;

-- 7. Row Level Security for New Tables
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Expenses: Only Super Admin, Admin, and Manager
DROP POLICY IF EXISTS expenses_admin_all ON public.expenses;
CREATE POLICY expenses_admin_all ON public.expenses
    FOR ALL
    USING (public.is_admin() OR public.is_manager());

-- Salaries: Only Super Admin & Admin can manage; Teachers can view their own salary
DROP POLICY IF EXISTS salaries_admin_all ON public.salaries;
CREATE POLICY salaries_admin_all ON public.salaries
    FOR ALL
    USING (public.is_admin());

DROP POLICY IF EXISTS salaries_teacher_select ON public.salaries;
CREATE POLICY salaries_teacher_select ON public.salaries
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.teachers t
            WHERE t.id = salaries.teacher_id
              AND t.profile_id = auth.uid()
        )
    );

-- Announcements: Admins & Managers can manage; All authenticated users can read relevant announcements
DROP POLICY IF EXISTS announcements_admin_all ON public.announcements;
CREATE POLICY announcements_admin_all ON public.announcements
    FOR ALL
    USING (public.is_admin() OR public.is_manager());

DROP POLICY IF EXISTS announcements_read_relevant ON public.announcements;
CREATE POLICY announcements_read_relevant ON public.announcements
    FOR SELECT
    USING (
        auth.role() = 'authenticated' AND (
            target_role IS NULL OR
            EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                  AND p.role = announcements.target_role
            )
        )
    );

-- Manager permissions for existing tables (Students, Courses, Groups, Group_Students, Attendance, Payments)
DROP POLICY IF EXISTS manager_students_all ON public.students;
CREATE POLICY manager_students_all ON public.students
    FOR ALL USING (public.is_manager());

DROP POLICY IF EXISTS manager_courses_all ON public.courses;
CREATE POLICY manager_courses_all ON public.courses
    FOR ALL USING (public.is_manager());

DROP POLICY IF EXISTS manager_groups_all ON public.groups;
CREATE POLICY manager_groups_all ON public.groups
    FOR ALL USING (public.is_manager());

DROP POLICY IF EXISTS manager_group_students_all ON public.group_students;
CREATE POLICY manager_group_students_all ON public.group_students
    FOR ALL USING (public.is_manager());

DROP POLICY IF EXISTS manager_attendance_all ON public.attendance;
CREATE POLICY manager_attendance_all ON public.attendance
    FOR ALL USING (public.is_manager());

DROP POLICY IF EXISTS manager_payments_all ON public.payments;
CREATE POLICY manager_payments_all ON public.payments
    FOR ALL USING (public.is_manager());

-- ============================================================================
-- SUPER ADMIN PROFILINI BIRIKTIRISH
-- ============================================================================
INSERT INTO public.profiles (
    id,
    role,
    full_name,
    email,
    is_active,
    created_at,
    updated_at
) VALUES (
    '37822937-8869-4228-a7d0-19c718d91abe',
    'super_admin',
    'Asilbek Tursunov',
    'tursunovasilbek5504@gmail.com',
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    role = 'super_admin',
    is_active = TRUE,
    full_name = 'Asilbek Tursunov',
    email = 'tursunovasilbek5504@gmail.com',
    updated_at = NOW();
