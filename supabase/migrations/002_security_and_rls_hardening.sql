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
