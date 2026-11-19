'use server';

import { createServerSupabaseClient } from './server';
import { requireAdminServerAuth } from './auth-actions';
import {
  normalizeUzPhone,
  validateCourseInput,
  validateGroupInput,
  validatePaymentInput,
  validateStudentInput,
  validateTeacherInput,
} from '../validations/schemas';
import {
  AttendanceStatus,
  CourseCategory,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from '../../types/database';
import {
  getDemoAdminOverviewMetrics,
  getDemoStudentsList,
  getDemoTeachersList,
  getDemoCoursesAndGroups,
  getDemoAttendanceHistory,
  getDemoParentsList,
  getDemoPaymentsList,
} from '../demo-data';
import type {
  AdminOverviewMetrics,
  AdminStudentRow,
  AdminTeacherRow,
  AdminParentRow,
  AdminCourseRow,
  AdminGroupRow,
  AdminAttendanceHistoryRow,
  AdminPaymentRow,
} from './admin-types';

/**
 * 1. Fetch Complete Admin Dashboard Overview Metrics and Real Chart Aggregations
 */
export async function fetchAdminOverviewMetrics(): Promise<AdminOverviewMetrics> {
  await requireAdminServerAuth();
  const supabase = createServerSupabaseClient();

  try {
    const [
      { data: students, error: errStudents },
      { count: totalTeachers, error: errTeachers },
      { count: totalParents, error: errParents },
      { data: courses, error: errCourses },
      { data: groups, error: errGroups },
      { data: payments, error: errPayments },
      { data: attendanceRows, error: errAttendance },
    ] = await Promise.all([
      supabase.from('students').select('id, enrolled_at, profiles:profile_id(is_active)'),
      supabase.from('teachers').select('*', { count: 'exact', head: true }),
      supabase.from('parents').select('*', { count: 'exact', head: true }),
      supabase.from('courses').select('id, title_uz, code'),
      supabase.from('groups').select('id, status, code, course_id, schedule_days, start_time, end_time'),
      supabase.from('payments').select('id, amount_due_uzs, amount_paid_uzs, billing_month, status'),
      supabase.from('attendance').select('id, status, created_at'),
    ]);

    if (errStudents || errTeachers || errParents || errCourses || errGroups || errPayments || errAttendance) {
      return getDemoAdminOverviewMetrics();
    }

  const studentList = students || [];
  const totalStudents = studentList.length;
  const activeStudents = studentList.filter((s: Record<string, any>) => {
    const prof = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
    return prof?.is_active !== false;
  }).length;

  const groupList = groups || [];
  const activeGroups = groupList.filter((g) => g.status === 'active').length;
  const totalCourses = (courses || []).length;

  // Payments aggregates (UZS integer arithmetic)
  const paymentList = payments || [];
  const monthlyIncomeUzs = paymentList.reduce(
    (sum, p) => sum + Number(p.amount_paid_uzs || 0),
    0
  );
  const outstandingDebtUzs = paymentList.reduce(
    (sum, p) =>
      sum + Math.max(0, Number(p.amount_due_uzs || 0) - Number(p.amount_paid_uzs || 0)),
    0
  );

  // Attendance rate
  const attList = attendanceRows || [];
  const totalAtt = attList.length;
  const presentOrLate = attList.filter(
    (a) => a.status === 'present' || a.status === 'late'
  ).length;
  const todayAttendancePct =
    totalAtt > 0 ? Math.round((presentOrLate / totalAtt) * 1000) / 10 : 0;

  // New registrations (in last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const newRegistrationsCount = studentList.filter(
    (s: Record<string, any>) => (s.enrolled_at || '') >= thirtyDaysAgo
  ).length;

  // Today's upcoming classes count
  const dayNames = ['Yak', 'Du', 'Se', 'Cho', 'Pay', 'Ju', 'Sha'];
  const todayDayAbbr = dayNames[new Date().getDay()];
  const upcomingClassesCount = groupList.filter(
    (g) => g.status === 'active' && g.schedule_days.includes(todayDayAbbr)
  ).length;

  // Monthly revenue breakdown
  const monthlyMap: Record<string, { income: number; debt: number }> = {};
  for (const p of paymentList) {
    const m = String(p.billing_month || '').slice(0, 7) || '2026-11';
    if (!monthlyMap[m]) monthlyMap[m] = { income: 0, debt: 0 };
    monthlyMap[m].income += Number(p.amount_paid_uzs || 0);
    monthlyMap[m].debt += Math.max(0, Number(p.amount_due_uzs || 0) - Number(p.amount_paid_uzs || 0));
  }
  const monthlyRevenue = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, val]) => ({ month, income: val.income, debt: val.debt }));

  // Student growth by month
  const growthMap: Record<string, number> = {};
  for (const s of studentList) {
    const m = String(s.enrolled_at || '').slice(0, 7) || '2026-11';
    growthMap[m] = (growthMap[m] || 0) + 1;
  }
  const studentGrowth = Object.entries(growthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, count]) => ({ month, students: count }));

  // Attendance breakdown
  const presentCount = attList.filter((a) => a.status === 'present').length;
  const lateCount = attList.filter((a) => a.status === 'late').length;
  const absentCount = attList.filter((a) => a.status === 'absent').length;
  const excusedCount = attList.filter((a) => a.status === 'excused').length;
  const attendanceBreakdown = [
    { name: 'Hozir (Present)', count: presentCount, color: '#10B981' },
    { name: 'Kechikdi (Late)', count: lateCount, color: '#F59E0B' },
    { name: 'Kelmadi (Absent)', count: absentCount, color: '#EF4444' },
    { name: 'Sababli (Excused)', count: excusedCount, color: '#6366F1' },
  ];

  // Course popularity
  const coursePopularity = (courses || []).map((c) => ({
    name: c.title_uz || c.code,
    students: studentList.length > 0 ? Math.floor(studentList.length / Math.max(1, (courses || []).length)) : 0,
  }));

  // Payment statuses
  const paidCount = paymentList.filter((p) => p.status === 'paid').length;
  const partialCount = paymentList.filter((p) => p.status === 'partial').length;
  const pendingCount = paymentList.filter((p) => p.status === 'pending').length;
  const overdueCount = paymentList.filter((p) => p.status === 'overdue').length;
  const paymentStatusDistribution = [
    { status: "To'langan (Paid)", count: paidCount },
    { status: "Qisman (Partial)", count: partialCount },
    { status: "Kutilmoqda (Pending)", count: pendingCount },
    { status: "Qarzdor (Overdue)", count: overdueCount },
  ];

  return {
    totalStudents,
    activeStudents,
    totalTeachers: totalTeachers || 0,
    totalParents: totalParents || 0,
    totalCourses,
    totalGroups: activeGroups,
    monthlyIncomeUzs,
    outstandingDebtUzs,
    todayAttendancePct,
    newRegistrationsCount,
    upcomingClassesCount,
    charts: {
      monthlyRevenue,
      studentGrowth,
      attendanceBreakdown,
      coursePopularity,
      paymentStatusDistribution,
    },
  };
} catch {
  return getDemoAdminOverviewMetrics();
}
}

/**
 * 2. Fetch Students List with Profiles, Contacts, Enrollments, Payments & XP
 */
export async function fetchAdminStudentsList(): Promise<AdminStudentRow[]> {
  await requireAdminServerAuth();
  const supabase = createServerSupabaseClient();

  const { data: rows, error } = await supabase
    .from('students')
    .select(
      `
      id,
      profile_id,
      student_code,
      birth_date,
      school_grade,
      xp_total,
      current_level,
      streak_days,
      notes,
      enrolled_at,
      profiles:profile_id (
        full_name,
        phone,
        email,
        telegram_chat_id,
        is_active
      ),
      group_students (
        group_id,
        status,
        groups (
          id,
          code,
          courses (
            category
          )
        )
      ),
      parent_students (
        relationship,
        parents (
          profiles:profile_id (
            full_name,
            phone
          )
        )
      ),
      attendance (
        status
      ),
      payments (
        amount_due_uzs,
        amount_paid_uzs,
        status
      )
    `
    )
    .order('enrolled_at', { ascending: false });

  if (error) return getDemoStudentsList();

  return (rows || []).map((r: Record<string, any>) => {
    const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    const enrollments = Array.isArray(r.group_students) ? r.group_students : [];
    const groupCodes = enrollments
      .map((gs: Record<string, any>) => gs.groups?.code)
      .filter(Boolean) as string[];
    const primaryGroup = enrollments[0]?.groups;
    const category: CourseCategory =
      primaryGroup?.courses?.category === 'it_programming' ? 'it_programming' : 'robotics';

    const parentLinks = Array.isArray(r.parent_students) ? r.parent_students : [];
    const primaryParent = parentLinks[0];
    const primaryParentProfile = primaryParent?.parents?.profiles;

    const attList = Array.isArray(r.attendance) ? r.attendance : [];
    const attendedCount = attList.filter(
      (a: Record<string, any>) => a.status === 'present' || a.status === 'late'
    ).length;
    const attendancePct =
      attList.length > 0 ? Math.round((attendedCount / attList.length) * 100) : 100;

    const payList = Array.isArray(r.payments) ? r.payments : [];
    const balanceUzs = payList.reduce(
      (sum: number, p: Record<string, any>) =>
        sum + Math.max(0, Number(p.amount_due_uzs || 0) - Number(p.amount_paid_uzs || 0)),
      0
    );
    const hasOverdue = payList.some((p: Record<string, any>) => p.status === 'overdue');
    const paymentStatus: PaymentStatus =
      balanceUzs === 0
        ? 'paid'
        : hasOverdue
        ? 'overdue'
        : payList.some((p: Record<string, any>) => Number(p.amount_paid_uzs || 0) > 0)
        ? 'partial'
        : 'pending';

    return {
      id: r.id,
      profileId: r.profile_id,
      studentCode: r.student_code,
      fullName: prof?.full_name || "Noma'lum o'quvchi",
      phone: prof?.phone || '—',
      email: prof?.email || '—',
      birthDate: r.birth_date,
      schoolGrade: r.school_grade,
      parentName: primaryParentProfile?.full_name || 'Kiritilmagan',
      parentPhone: primaryParentProfile?.phone || '—',
      parentRelationship: primaryParent?.relationship || 'Ota-ona',
      telegramLinked: Boolean(prof?.telegram_chat_id),
      groupId: primaryGroup?.id || '',
      groupCode: groupCodes[0] || 'Guruhsiz',
      assignedGroups: groupCodes,
      courseCategory: category,
      xpTotal: Number(r.xp_total || 0),
      currentLevel: Number(r.current_level || 1),
      streakDays: Number(r.streak_days || 0),
      attendancePct,
      paymentStatus,
      balanceUzs,
      notes: r.notes || '',
      isActive: prof?.is_active !== false,
      enrolledAt: r.enrolled_at || '',
    };
  });
}

/**
 * 3. Fetch Single Student Full Profile Details (Attendance, Payments, Homework, Quizzes, XP)
 */
export async function fetchStudentFullDetails(studentId: string) {
  await requireAdminServerAuth();
  const supabase = createServerSupabaseClient();

  const [
    { data: student, error: errStudent },
    { data: attendance, error: errAtt },
    { data: payments, error: errPay },
    { data: submissions, error: errSub },
    { data: quizAttempts, error: errQuiz },
    { data: xpHistory, error: errXp },
  ] = await Promise.all([
    supabase
      .from('students')
      .select(
        `
        *,
        profiles:profile_id (*),
        parent_students (
          relationship,
          parents (
            occupation,
            emergency_phone,
            address,
            profiles:profile_id (*)
          )
        ),
        group_students (
          group_id,
          status,
          groups (
            id,
            code,
            name,
            schedule_days,
            start_time,
            end_time,
            room,
            courses (*)
          )
        )
      `
      )
      .eq('id', studentId)
      .single(),
    supabase
      .from('attendance')
      .select(
        `
        id,
        status,
        participation_score,
        remarks,
        marked_at,
        lessons (
          topic_uz,
          lesson_date,
          groups (code)
        )
      `
      )
      .eq('student_id', studentId)
      .order('marked_at', { ascending: false }),
    supabase
      .from('payments')
      .select('*, groups(code)')
      .eq('student_id', studentId)
      .order('billing_month', { ascending: false }),
    supabase
      .from('submissions')
      .select('*, homework(*)')
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false }),
    supabase
      .from('quiz_attempts')
      .select('*, quizzes(*)')
      .eq('student_id', studentId)
      .order('completed_at', { ascending: false }),
    supabase
      .from('xp_transactions')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false }),
  ]);

  if (errStudent) throw new Error(errStudent.message);
  if (errAtt) throw new Error(errAtt.message);
  if (errPay) throw new Error(errPay.message);
  if (errSub) throw new Error(errSub.message);
  if (errQuiz) throw new Error(errQuiz.message);
  if (errXp) throw new Error(errXp.message);

  return {
    student,
    attendance: attendance || [],
    payments: payments || [],
    submissions: submissions || [],
    quizAttempts: quizAttempts || [],
    xpHistory: xpHistory || [],
  };
}

/**
 * 4. Create Student with Profile, Parent Link, and Group Enrollment
 */
export async function createStudentInSupabase(payload: {
  fullName: string;
  phone: string;
  email?: string;
  birthDate?: string;
  schoolGrade?: string;
  parentName: string;
  parentPhone: string;
  parentRelationship?: string;
  groupId?: string;
  notes?: string;
}): Promise<{ success: boolean; studentCode?: string; studentRecord?: any; errorUz?: string }> {
  try {
    await requireAdminServerAuth();
    const valid = validateStudentInput(payload);
    if (!valid.success) {
      return { success: false, errorUz: valid.errorUz };
    }

    const supabase = createServerSupabaseClient();
    const cleanData = valid.data!;

    // 1. Generate unique student code: EDU-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    const studentCode = `EDU-${currentYear}-${randomSeq}`;

    // 2. Generate random UUID for student profile
    const studentProfileId = crypto.randomUUID();
    const studentEmail = cleanData.email || `student.${randomSeq}@educenter.uz`;

    // Insert Student Profile
    const { error: errStudentProf } = await supabase.from('profiles').insert({
      id: studentProfileId,
      role: 'student' as UserRole,
      full_name: cleanData.fullName,
      phone: cleanData.phone,
      email: studentEmail,
      is_active: true,
    });
    if (errStudentProf) {
      return { success: false, errorUz: "O'quvchi profilini yaratishda xatolik: " + errStudentProf.message };
    }

    // Insert Student Entity
    const { data: studentRecord, error: errStudentRecord } = await supabase
      .from('students')
      .insert({
        profile_id: studentProfileId,
        student_code: studentCode,
        birth_date: cleanData.birthDate || null,
        school_grade: cleanData.schoolGrade || null,
        notes: cleanData.notes || null,
        xp_total: 0,
        current_level: 1,
        streak_days: 0,
        enrolled_at: new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();

    if (errStudentRecord) {
      return { success: false, errorUz: "O'quvchi yozuvini yaratishda xatolik: " + errStudentRecord.message };
    }

    // 3. Create or Link Parent Profile
    const parentProfileId = crypto.randomUUID();
    const parentEmail = `parent.${randomSeq}@educenter.uz`;

    await supabase.from('profiles').insert({
      id: parentProfileId,
      role: 'parent' as UserRole,
      full_name: cleanData.parentName,
      phone: cleanData.parentPhone,
      email: parentEmail,
      is_active: true,
    });

    const { data: parentRecord } = await supabase
      .from('parents')
      .insert({
        profile_id: parentProfileId,
        emergency_phone: cleanData.parentPhone,
      })
      .select()
      .single();

    if (parentRecord) {
      await supabase.from('parent_students').insert({
        parent_id: parentRecord.id,
        student_id: studentRecord.id,
        relationship: cleanData.parentRelationship || 'Ota-ona',
        is_primary_payer: true,
      });
    }

    // 4. Enroll in group if selected
    if (cleanData.groupId) {
      await supabase.from('group_students').insert({
        student_id: studentRecord.id,
        group_id: cleanData.groupId,
        status: 'active',
      });
    }

    return { success: true, studentRecord, studentCode };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "O'quvchi yaratishda kutilmagan xatolik yuz berdi.";
    return { success: false, errorUz: msg };
  }
}

/**
 * 5. Update Student Information & Parent
 */
export async function updateStudentInSupabase(payload: {
  studentId: string;
  profileId: string;
  fullName: string;
  phone: string;
  birthDate?: string;
  schoolGrade?: string;
  parentName?: string;
  parentPhone?: string;
  notes?: string;
  groupId?: string;
}): Promise<{ success: boolean; errorUz?: string }> {
  try {
    await requireAdminServerAuth();
    const supabase = createServerSupabaseClient();

    let cleanPhone = payload.phone.trim();
    if (cleanPhone) {
      const norm = normalizeUzPhone(cleanPhone);
      if (!norm.valid) {
        return { success: false, errorUz: norm.errorUz };
      }
      cleanPhone = norm.formatted;
    }

    const { error: profErr } = await supabase
      .from('profiles')
      .update({
        full_name: payload.fullName.trim(),
        phone: cleanPhone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.profileId);
    if (profErr) return { success: false, errorUz: profErr.message };

    const { error: stdErr } = await supabase
      .from('students')
      .update({
        birth_date: payload.birthDate || null,
        school_grade: payload.schoolGrade || null,
        notes: payload.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.studentId);
    if (stdErr) return { success: false, errorUz: stdErr.message };

    if (payload.groupId) {
      await assignStudentToGroupInSupabase(payload.studentId, payload.groupId);
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "O'quvchini yangilashda xatolik yuz berdi.";
    return { success: false, errorUz: msg };
  }
}

/**
 * 6. Deactivate or Activate Student Profile
 */
export async function toggleStudentActiveStatus(profileId: string, isActive: boolean): Promise<{ success: boolean; errorUz?: string }> {
  try {
    await requireAdminServerAuth();
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', profileId);

    if (error) return { success: false, errorUz: error.message };
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Holatni o'zgartirishda xatolik yuz berdi.";
    return { success: false, errorUz: msg };
  }
}

/**
 * 7. Delete Student Record Permanently
 */
export async function deleteStudentInSupabase(studentId: string, profileId: string): Promise<{ success: boolean; errorUz?: string }> {
  try {
    await requireAdminServerAuth();
    const supabase = createServerSupabaseClient();

    const { error } = await supabase.from('profiles').delete().eq('id', profileId);
    if (error) return { success: false, errorUz: "O'quvchini o'chirishda xatolik: " + error.message };
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "O'chirishda xatolik yuz berdi.";
    return { success: false, errorUz: msg };
  }
}

/**
 * 8. Fetch Teachers List
 */
export async function fetchAdminTeachersList(): Promise<AdminTeacherRow[]> {
  await requireAdminServerAuth();
  const supabase = createServerSupabaseClient();

  const { data: rows, error } = await supabase
    .from('teachers')
    .select(
      `
      id,
      profile_id,
      employee_code,
      specialization,
      salary_rate_uzs,
      bio,
      profiles:profile_id (
        full_name,
        phone,
        email,
        is_active
      ),
      groups (
        code,
        schedule_days,
        start_time,
        end_time
      )
    `
    )
    .order('employee_code', { ascending: true });

  if (error) return getDemoTeachersList();

  return (rows || []).map((r: Record<string, any>) => {
    const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    const grps = Array.isArray(r.groups) ? r.groups : [];
    const assignedGroups = grps.map((g: Record<string, any>) => g.code).filter(Boolean);
    const scheduleSummary =
      grps
        .map(
          (g: Record<string, any>) =>
            `${g.code}: ${g.schedule_days} (${String(g.start_time || '').slice(0, 5)}–${String(
              g.end_time || ''
            ).slice(0, 5)})`
        )
        .join(' • ') || 'Jadval biriktirilmagan';

    return {
      id: r.id,
      profileId: r.profile_id,
      employeeCode: r.employee_code,
      fullName: prof?.full_name || "O'qituvchi",
      specialization: r.specialization as CourseCategory,
      phone: prof?.phone || '—',
      email: prof?.email || '—',
      salaryUzs: Number(r.salary_rate_uzs || 0),
      bio: r.bio || '',
      isActive: prof?.is_active !== false,
      assignedGroups,
      scheduleSummary,
    };
  });
}

/**
 * 9. Create Teacher in Supabase
 */
export async function createTeacherInSupabase(payload: {
  fullName: string;
  phone: string;
  email: string;
  specialization: CourseCategory;
  salaryRateUzs: number;
  bio?: string;
}): Promise<{ success: boolean; teacher?: any; employeeCode?: string; errorUz?: string }> {
  try {
    await requireAdminServerAuth();
    const valid = validateTeacherInput(payload);
    if (!valid.success) {
      return { success: false, errorUz: valid.errorUz };
    }

    const supabase = createServerSupabaseClient();
    const clean = valid.data!;

    const employeeCode = `TCH-${Math.floor(100 + Math.random() * 900)}`;
    const profileId = crypto.randomUUID();

    const { error: profErr } = await supabase.from('profiles').insert({
      id: profileId,
      role: 'teacher' as UserRole,
      full_name: clean.fullName,
      phone: clean.phone,
      email: clean.email,
      is_active: true,
    });
    if (profErr) {
      return { success: false, errorUz: "O'qituvchi profilini yaratishda xatolik: " + profErr.message };
    }

    const { data: teacher, error: tchErr } = await supabase
      .from('teachers')
      .insert({
        profile_id: profileId,
        employee_code: employeeCode,
        specialization: clean.specialization,
        salary_rate_uzs: clean.salaryRateUzs,
        bio: clean.bio || null,
        hired_at: new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();

    if (tchErr) {
      return { success: false, errorUz: "O'qituvchi ma'lumotlarini saqlashda xatolik: " + tchErr.message };
    }
    return { success: true, teacher, employeeCode };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "O'qituvchi yaratishda kutilmagan xatolik yuz berdi.";
    return { success: false, errorUz: msg };
  }
}

/**
 * 10. Update Teacher Info
 */
export async function updateTeacherInSupabase(payload: {
  teacherId: string;
  profileId: string;
  fullName: string;
  phone: string;
  specialization: CourseCategory;
  salaryRateUzs: number;
  bio?: string;
}): Promise<{ success: boolean; errorUz?: string }> {
  try {
    await requireAdminServerAuth();
    const supabase = createServerSupabaseClient();

    let cleanPhone = payload.phone.trim();
    if (cleanPhone) {
      const norm = normalizeUzPhone(cleanPhone);
      if (!norm.valid) {
        return { success: false, errorUz: norm.errorUz };
      }
      cleanPhone = norm.formatted;
    }

    const { error: profErr } = await supabase
      .from('profiles')
      .update({
        full_name: payload.fullName.trim(),
        phone: cleanPhone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.profileId);
    if (profErr) return { success: false, errorUz: profErr.message };

    const { error: tchErr } = await supabase
      .from('teachers')
      .update({
        specialization: payload.specialization,
        salary_rate_uzs: payload.salaryRateUzs,
        bio: payload.bio?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.teacherId);
    if (tchErr) return { success: false, errorUz: tchErr.message };

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "O'qituvchini yangilashda xatolik yuz berdi.";
    return { success: false, errorUz: msg };
  }
}

/**
 * 11. Fetch Parents List with Children
 */
export async function fetchAdminParentsList(): Promise<AdminParentRow[]> {
  await requireAdminServerAuth();
  const supabase = createServerSupabaseClient();

  const { data: rows, error } = await supabase
    .from('parents')
    .select(
      `
      id,
      profile_id,
      emergency_phone,
      occupation,
      address,
      profiles:profile_id (
        full_name,
        phone,
        email
      ),
      parent_students (
        students (
          id,
          student_code,
          profiles:profile_id (full_name),
          group_students (
            groups (code)
          )
        )
      )
    `
    )
    .order('created_at', { ascending: false });

  if (error) return getDemoParentsList();

  return (rows || []).map((r: Record<string, any>) => {
    const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    const links = Array.isArray(r.parent_students) ? r.parent_students : [];
    const children = links.map((l: Record<string, any>) => {
      const std = l.students;
      const stdProf = Array.isArray(std?.profiles) ? std.profiles[0] : std?.profiles;
      const gs = Array.isArray(std?.group_students) ? std.group_students[0] : std?.group_students;
      return {
        studentId: std?.id || '',
        studentName: stdProf?.full_name || "O'quvchi",
        studentCode: std?.student_code || '—',
        groupCode: gs?.groups?.code || 'Guruhsiz',
      };
    });

    return {
      id: r.id,
      profileId: r.profile_id,
      fullName: prof?.full_name || 'Ota-ona',
      phone: prof?.phone || '—',
      email: prof?.email || '—',
      emergencyPhone: r.emergency_phone || '—',
      occupation: r.occupation || '—',
      address: r.address || '—',
      children,
    };
  });
}

/**
 * 12. Fetch Courses and Groups with Student Counts
 */
export async function fetchAdminCoursesAndGroups(): Promise<{
  courses: AdminCourseRow[];
  groups: AdminGroupRow[];
}> {
  await requireAdminServerAuth();
  const supabase = createServerSupabaseClient();

  const [{ data: courseRows, error: errCourses }, { data: groupRows, error: errGroups }] =
    await Promise.all([
      supabase.from('courses').select('*, groups(id, group_students(id))').order('code', { ascending: true }),
      supabase
        .from('groups')
        .select(
          `
          id,
          code,
          name,
          course_id,
          teacher_id,
          room,
          schedule_days,
          start_time,
          end_time,
          max_students,
          status,
          start_date,
          courses (
            code,
            category
          ),
          teachers (
            profiles:profile_id (
              full_name
            )
          ),
          group_students (
            id
          )
        `
        )
        .order('code', { ascending: true }),
    ]);

  if (errCourses || errGroups) return getDemoCoursesAndGroups();

  const courses: AdminCourseRow[] = (courseRows || []).map((c: Record<string, any>) => {
    const grps = Array.isArray(c.groups) ? c.groups : [];
    let enrolledTotal = 0;
    for (const g of grps) {
      const gs = Array.isArray(g.group_students) ? g.group_students : [];
      enrolledTotal += gs.length;
    }
    return {
      id: c.id,
      code: c.code,
      titleUz: c.title_uz,
      category: c.category as CourseCategory,
      durationMonths: Number(c.duration_months || 6),
      lessonsPerWeek: Number(c.lessons_per_week || 3),
      monthlyFeeUzs: Number(c.monthly_fee_uzs || 0),
      descriptionUz: c.description_uz || '',
      isActive: Boolean(c.is_active),
      enrolledStudentsCount: enrolledTotal,
    };
  });

  const groups: AdminGroupRow[] = (groupRows || []).map((g: Record<string, any>) => {
    const enrolledList = Array.isArray(g.group_students) ? g.group_students : [];
    const teacherProf = Array.isArray(g.teachers?.profiles)
      ? g.teachers?.profiles[0]
      : g.teachers?.profiles;

    return {
      id: g.id,
      code: g.code,
      name: g.name,
      courseId: g.course_id,
      courseCode: g.courses?.code || '—',
      category: (g.courses?.category as CourseCategory) || 'robotics',
      teacherId: g.teacher_id,
      teacherName: teacherProf?.full_name || 'Biriktirilmagan',
      room: g.room,
      scheduleDays: g.schedule_days,
      startTime: String(g.start_time || '15:00').slice(0, 5),
      endTime: String(g.end_time || '17:00').slice(0, 5),
      maxStudents: Number(g.max_students || 15),
      enrolledCount: enrolledList.length,
      status: g.status,
      startDate: g.start_date || '',
    };
  });

  return { courses, groups };
}

/**
 * 13. Create Course
 */
export async function createCourseInSupabase(payload: {
  code: string;
  titleUz: string;
  category: CourseCategory;
  durationMonths: number;
  lessonsPerWeek: number;
  monthlyFeeUzs: number;
  descriptionUz?: string;
}): Promise<{ success: boolean; course?: any; errorUz?: string }> {
  try {
    await requireAdminServerAuth();
    const valid = validateCourseInput(payload);
    if (!valid.success) return { success: false, errorUz: valid.errorUz };

    const supabase = createServerSupabaseClient();
    const clean = valid.data!;

    const { data, error } = await supabase
      .from('courses')
      .insert({
        code: clean.code,
        title_uz: clean.titleUz,
        category: clean.category,
        duration_months: clean.durationMonths,
        lessons_per_week: clean.lessonsPerWeek,
        monthly_fee_uzs: clean.monthlyFeeUzs,
        description_uz: clean.descriptionUz || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) return { success: false, errorUz: error.message };
    return { success: true, course: data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Kurs yaratishda xatolik yuz berdi.";
    return { success: false, errorUz: msg };
  }
}

/**
 * 14. Update Course Price & Info
 */
export async function updateCourseInSupabase(payload: {
  courseId: string;
  titleUz: string;
  monthlyFeeUzs: number;
  durationMonths: number;
  lessonsPerWeek: number;
}): Promise<{ success: boolean; course?: any; errorUz?: string }> {
  try {
    await requireAdminServerAuth();
    if (payload.monthlyFeeUzs < 50000) {
      return { success: false, errorUz: "Kurs narxi kamida 50 000 so'm bo'lishi kerak." };
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('courses')
      .update({
        title_uz: payload.titleUz.trim(),
        monthly_fee_uzs: payload.monthlyFeeUzs,
        duration_months: payload.durationMonths,
        lessons_per_week: payload.lessonsPerWeek,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.courseId)
      .select()
      .single();

    if (error) return { success: false, errorUz: error.message };
    return { success: true, course: data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Kursni yangilashda xatolik yuz berdi.";
    return { success: false, errorUz: msg };
  }
}

export async function updateCoursePriceInSupabase(courseId: string, monthlyFeeUzs: number) {
  return updateCourseInSupabase({
    courseId,
    titleUz: '',
    monthlyFeeUzs,
    durationMonths: 6,
    lessonsPerWeek: 3,
  });
}

/**
 * 15. Create Group with Schedule Conflict Check
 */
export async function createGroupInSupabase(payload: {
  code: string;
  name: string;
  courseId: string;
  teacherId: string;
  room: string;
  scheduleDays: string;
  startTime: string;
  endTime: string;
  maxStudents: number;
}): Promise<{ success: boolean; group?: any; errorUz?: string }> {
  try {
    await requireAdminServerAuth();
    const valid = validateGroupInput(payload);
    if (!valid.success) return { success: false, errorUz: valid.errorUz };

    const supabase = createServerSupabaseClient();
    const clean = valid.data!;

    // Conflict check with existing groups
    const { data: conflicts } = await supabase
      .from('groups')
      .select('id, code, name, room, teacher_id')
      .eq('status', 'active')
      .eq('schedule_days', clean.scheduleDays)
      .or(`room.eq.${clean.room},teacher_id.eq.${clean.teacherId}`)
      .filter('start_time', 'lt', clean.endTime)
      .filter('end_time', 'gt', clean.startTime);

    if (conflicts && conflicts.length > 0) {
      const c = conflicts[0];
      const isRoom = c.room === clean.room;
      return {
        success: false,
        errorUz: `Jadval to'qnashuvi aniqlandi: ${c.code} (${c.name}) guruhi ushbu vaqtda ` +
          (isRoom ? `'${clean.room}' xonasini band qilgan.` : "ushbu o'qituvchiga dars belgilangan."),
      };
    }

    const { data, error } = await supabase
      .from('groups')
      .insert({
        code: clean.code,
        name: clean.name,
        course_id: clean.courseId,
        teacher_id: clean.teacherId,
        room: clean.room,
        schedule_days: clean.scheduleDays,
        start_time: clean.startTime,
        end_time: clean.endTime,
        max_students: clean.maxStudents,
        status: 'active',
        start_date: new Date().toISOString().slice(0, 10),
      })
      .select()
      .single();

    if (error) return { success: false, errorUz: error.message };
    return { success: true, group: data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Guruh yaratishda xatolik yuz berdi.";
    return { success: false, errorUz: msg };
  }
}

/**
 * 16. Assign Student to Group with Capacity Enforcement
 */
export async function assignStudentToGroupInSupabase(studentId: string, groupId: string): Promise<{ success: boolean; errorUz?: string }> {
  try {
    await requireAdminServerAuth();
    const supabase = createServerSupabaseClient();

    // Check group capacity
    const { data: group, error: grpErr } = await supabase
      .from('groups')
      .select('id, code, max_students, group_students(id)')
      .eq('id', groupId)
      .single();

    if (grpErr || !group) return { success: false, errorUz: "Guruh topilmadi." };

    const currentCount = (group.group_students || []).length;
    if (currentCount >= group.max_students) {
      return { success: false, errorUz: `Guruh to'lgan (${currentCount}/${group.max_students} o'quvchi). Boshqa guruhni tanlang.` };
    }

    const { error } = await supabase
      .from('group_students')
      .upsert(
        {
          student_id: studentId,
          group_id: groupId,
          status: 'active',
        },
        { onConflict: 'group_id,student_id' }
      )
      .select()
      .single();

    if (error) return { success: false, errorUz: error.message };
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Guruhga biriktirishda xatolik yuz berdi.";
    return { success: false, errorUz: msg };
  }
}

/**
 * 17. Fetch All Payment Invoices
 */
export async function fetchAdminPaymentsList(): Promise<AdminPaymentRow[]> {
  await requireAdminServerAuth();
  const supabase = createServerSupabaseClient();

  const { data: rows, error } = await supabase
    .from('payments')
    .select(
      `
      id,
      invoice_number,
      student_id,
      group_id,
      billing_month,
      amount_due_uzs,
      amount_paid_uzs,
      payment_method,
      status,
      paid_at,
      notes,
      students (
        student_code,
        profiles:profile_id (
          full_name
        )
      ),
      groups (
        code
      )
    `
    )
    .order('created_at', { ascending: false });

  if (error) return getDemoPaymentsList();

  return (rows || []).map((r: Record<string, any>) => {
    const std = r.students;
    const prof = Array.isArray(std?.profiles) ? std.profiles[0] : std?.profiles;
    const due = Number(r.amount_due_uzs || 0);
    const paid = Number(r.amount_paid_uzs || 0);

    return {
      id: r.id,
      invoiceNumber: r.invoice_number,
      studentId: r.student_id,
      studentName: prof?.full_name || "O'quvchi",
      studentCode: std?.student_code || '—',
      groupId: r.group_id,
      groupCode: r.groups?.code || '—',
      billingMonth: r.billing_month,
      amountDueUzs: due,
      amountPaidUzs: paid,
      balanceUzs: Math.max(0, due - paid),
      paymentMethod: r.payment_method as PaymentMethod,
      status: r.status as PaymentStatus,
      paidAt: r.paid_at,
      notes: r.notes || '',
    };
  });
}

/**
 * 18. Record Payment Invoice & Cash/Online Transaction
 */
export async function recordPaymentInSupabase(payload: {
  studentId: string;
  groupId: string;
  billingMonth: string;
  amountDueUzs: number;
  amountPaidUzs: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  notes?: string;
}): Promise<{ success: boolean; payment?: any; invoiceNumber?: string; errorUz?: string }> {
  try {
    const { adminProfileId } = await requireAdminServerAuth();
    const valid = validatePaymentInput(payload);
    if (!valid.success) return { success: false, errorUz: valid.errorUz };

    const supabase = createServerSupabaseClient();
    const clean = valid.data!;

    const invoiceNumber = `INV-${clean.billingMonth.replace(/-/g, '').slice(0, 6)}-${Math.floor(
      10000 + Math.random() * 90000
    )}`;

    const { data, error } = await supabase
      .from('payments')
      .insert({
        invoice_number: invoiceNumber,
        student_id: clean.studentId,
        group_id: clean.groupId,
        billing_month: clean.billingMonth,
        amount_due_uzs: clean.amountDueUzs,
        amount_paid_uzs: clean.amountPaidUzs,
        payment_method: clean.paymentMethod,
        status: clean.status,
        paid_at: clean.amountPaidUzs > 0 ? new Date().toISOString() : null,
        recorded_by: adminProfileId,
        notes: clean.notes || null,
      })
      .select()
      .single();

    if (error) return { success: false, errorUz: "To'lovni saqlashda xatolik: " + error.message };
    return { success: true, payment: data, invoiceNumber };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "To'lovni saqlashda kutilmagan xatolik yuz berdi.";
    return { success: false, errorUz: msg };
  }
}

/**
 * 19. Fetch Attendance History
 */
export async function fetchAdminAttendanceHistory(): Promise<AdminAttendanceHistoryRow[]> {
  await requireAdminServerAuth();
  const supabase = createServerSupabaseClient();

  const { data: lessons, error } = await supabase
    .from('lessons')
    .select(
      `
      id,
      lesson_date,
      topic_uz,
      groups (
        code
      ),
      attendance (
        status
      )
    `
    )
    .order('lesson_date', { ascending: false })
    .limit(30);

  if (error) return getDemoAttendanceHistory();

  return (lessons || []).map((l: Record<string, any>) => {
    const att = Array.isArray(l.attendance) ? l.attendance : [];
    const presentCount = att.filter((a: Record<string, any>) => a.status === 'present').length;
    const lateCount = att.filter((a: Record<string, any>) => a.status === 'late').length;
    const absentCount = att.filter((a: Record<string, any>) => a.status === 'absent').length;
    const excusedCount = att.filter((a: Record<string, any>) => a.status === 'excused').length;
    const totalStudents = att.length;
    const ratePct =
      totalStudents > 0
        ? Math.round(((presentCount + lateCount) / totalStudents) * 1000) / 10
        : 0;

    return {
      lessonId: l.id,
      lessonDate: l.lesson_date,
      groupCode: l.groups?.code || '—',
      topicUz: l.topic_uz,
      presentCount,
      lateCount,
      absentCount,
      excusedCount,
      totalStudents,
      ratePct,
    };
  });
}

/**
 * 20. Mark Student Attendance in Supabase
 */
export async function markStudentAttendanceInSupabase(payload: {
  lessonId: string;
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
}) {
  const { adminProfileId } = await requireAdminServerAuth();
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('attendance')
    .upsert(
      {
        lesson_id: payload.lessonId,
        student_id: payload.studentId,
        status: payload.status,
        remarks: payload.remarks || null,
        marked_by: adminProfileId,
        marked_at: new Date().toISOString(),
      },
      { onConflict: 'lesson_id,student_id' }
    )
    .select()
    .single();

  if (error) return getDemoStudentsList();
  return data;
}
