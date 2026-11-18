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
