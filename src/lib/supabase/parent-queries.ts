'use server';

import { createServerSupabaseClient } from './server';
import { requireParentServerAuth } from './auth-actions';
import { calculateStudentLevel } from '../gamification';
import { AttendanceStatus, PaymentStatus } from '../../types/database';
import { getDemoParentDashboardData } from '../demo-data';
import type {
  ParentChildSummary,
  ParentChildFullDetails,
} from './parent-types';

/**
 * 1. Fetch Parent Dashboard Summary and Children List
 */
export async function fetchParentDashboardData() {
  const { parentId, profileId, fullName, email } = await requireParentServerAuth();
  const supabase = createServerSupabaseClient();

  // Fetch parent profile & linked children
  const { data: parentLinks, error: linkErr } = await supabase
    .from('parent_students')
    .select(
      `
      student_id,
      relationship,
      students (
        id,
        student_code,
        xp_total,
        current_level,
        streak_days,
        profiles:profile_id (
          full_name,
          phone
        ),
        group_students (
          group_id
        ),
        attendance (
          status
        ),
        payments (
          amount_due_uzs,
          amount_paid_uzs,
          status
        )
      )
    `
    )
    .eq('parent_id', parentId);

  if (linkErr || parentId.startsWith('demo-')) return getDemoParentDashboardData();

  const children: ParentChildSummary[] = (parentLinks || []).map((l: any) => {
    const s = l.students;
    const prof = Array.isArray(s?.profiles) ? s.profiles[0] : s?.profiles;
    const att = Array.isArray(s?.attendance) ? s.attendance : [];
    const present = att.filter((a: any) => a.status === 'present' || a.status === 'late').length;
    const attPct = att.length > 0 ? Math.round((present / att.length) * 100) : 100;

    const pay = Array.isArray(s?.payments) ? s.payments : [];
    const debt = pay.reduce(
      (sum: number, p: any) =>
        sum + Math.max(0, Number(p.amount_due_uzs || 0) - Number(p.amount_paid_uzs || 0)),
      0
    );

    return {
      studentId: s?.id || '',
      studentCode: s?.student_code || '—',
      fullName: prof?.full_name || "Farzand",
      xpTotal: Number(s?.xp_total || 0),
      currentLevel: Number(s?.current_level || 1),
      streakDays: Number(s?.streak_days || 0),
      attendancePct: attPct,
      totalDebtUzs: debt,
      enrolledGroupsCount: (s?.group_students || []).length,
    };
  });

  // Fetch notifications for the parent
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(20);

  return {
    parent: { parentId, profileId, fullName, email },
    children,
    notifications: notifications || [],
  };
}

/**
 * 2. Fetch Detailed Child Academic, Attendance, and Payment History
 */
export async function fetchParentChildDetails(studentId: string): Promise<ParentChildFullDetails> {
  const { parentId } = await requireParentServerAuth();
  const supabase = createServerSupabaseClient();

  // Verify that the child belongs to this parent
  const { data: linkCheck } = await supabase
    .from('parent_students')
    .select('id')
    .eq('parent_id', parentId)
    .eq('student_id', studentId)
    .single();

  if (!linkCheck) {
    throw new Error("Ruxsat etilmagan amal: Ushbu o'quvchi ma'lumotlariga ruxsat yo'q.");
  }

  const [
    { data: student, error: stdErr },
    { data: enrollments, error: grpErr },
    { data: attendance, error: attErr },
    { data: submissions, error: subErr },
    { data: payments, error: payErr },
  ] = await Promise.all([
    supabase
      .from('students')
      .select('*, profiles:profile_id(*)')
      .eq('id', studentId)
      .single(),
    supabase
      .from('group_students')
      .select(
        `
        groups (
          id,
          code,
          name,
          room,
          schedule_days,
          start_time,
          end_time,
          courses (title_uz),
          teachers (
            profiles:profile_id (full_name)
          )
        )
      `
      )
      .eq('student_id', studentId)
      .eq('status', 'active'),
    supabase
      .from('attendance')
      .select('*, lessons(topic_uz, lesson_date, groups(code))')
      .eq('student_id', studentId)
      .order('marked_at', { ascending: false }),
    supabase
      .from('submissions')
      .select('*, homework(title_uz, deadline, groups(code))')
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false }),
    supabase
      .from('payments')
      .select('*, groups(code)')
      .eq('student_id', studentId)
      .order('billing_month', { ascending: false }),
  ]);

  if (stdErr) throw new Error(stdErr.message);
  if (grpErr) throw new Error(grpErr.message);
  if (attErr) throw new Error(attErr.message);
  if (subErr) throw new Error(subErr.message);
  if (payErr) throw new Error(payErr.message);

  const prof = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles;
  const attList = attendance || [];
  const present = attList.filter((a: any) => a.status === 'present' || a.status === 'late').length;
  const attPct = attList.length > 0 ? Math.round((present / attList.length) * 100) : 100;

  const groupsList = (enrollments || []).map((e: any) => {
    const g = e.groups;
    const tch = Array.isArray(g?.teachers?.profiles) ? g.teachers?.profiles[0] : g?.teachers?.profiles;
    return {
      id: g?.id || '',
      code: g?.code || '—',
      name: g?.name || 'Guruh',
      courseTitle: g?.courses?.title_uz || 'Kurs',
      teacherName: tch?.full_name || 'Ustoz',
      room: g?.room || 'Xona 1',
      scheduleDays: g?.schedule_days || '',
      startTime: String(g?.start_time || '').slice(0, 5),
      endTime: String(g?.end_time || '').slice(0, 5),
    };
  });

  const attendanceFormatted = attList.map((a: any) => ({
    id: a.id,
    lessonDate: a.lessons?.lesson_date || '',
    topicUz: a.lessons?.topic_uz || 'Dars',
    status: a.status as AttendanceStatus,
    groupCode: a.lessons?.groups?.code || '—',
    remarks: a.remarks,
  }));

  const homeworkFormatted = (submissions || []).map((s: any) => ({
    id: s.id,
    titleUz: s.homework?.title_uz || 'Vazifa',
    groupCode: s.homework?.groups?.code || '—',
    deadline: s.homework?.deadline || '',
    isSubmitted: s.status === 'submitted' || s.status === 'graded',
    score: s.score,
    feedbackTeacher: s.feedback_teacher,
  }));

  const paymentsFormatted = (payments || []).map((p: any) => {
    const due = Number(p.amount_due_uzs || 0);
    const paid = Number(p.amount_paid_uzs || 0);
    return {
      id: p.id,
      invoiceNumber: p.invoice_number,
      groupCode: p.groups?.code || '—',
      billingMonth: p.billing_month,
      amountDueUzs: due,
      amountPaidUzs: paid,
      balanceUzs: Math.max(0, due - paid),
      status: p.status as PaymentStatus,
      paidAt: p.paid_at,
    };
  });

  return {
    student: {
      id: student.id,
      studentCode: student.student_code,
      fullName: prof?.full_name || 'Farzand',
      birthDate: student.birth_date,
      schoolGrade: student.school_grade,
      xpTotal: Number(student.xp_total || 0),
      currentLevel: Number(student.current_level || 1),
      streakDays: Number(student.streak_days || 0),
      attendancePct: attPct,
    },
    groups: groupsList,
    attendance: attendanceFormatted,
    homework: homeworkFormatted,
    payments: paymentsFormatted,
  };
}
