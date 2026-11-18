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
