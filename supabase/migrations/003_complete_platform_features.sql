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
