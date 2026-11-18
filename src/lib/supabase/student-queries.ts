'use server';

import { createServerSupabaseClient } from './server';
import { requireStudentServerAuth } from './auth-actions';
import { calculateStudentLevel } from '../gamification';
import { AttendanceStatus, SubmissionStatus } from '../../types/database';
import { getDemoStudentDashboardData } from '../demo-data';
import type {
  StudentDashboardProfile,
  StudentGroupInfo,
  StudentAttendanceRecord,
  StudentHomeworkItem,
  StudentQuizItem,
  StudentAchievementItem,
  StudentNotificationItem,
} from './student-types';

/**
 * 1. Fetch Complete Scoped Student Dashboard Data
 */
export async function fetchStudentDashboardData() {
  const { studentId, profileId, fullName, email } = await requireStudentServerAuth();
  const supabase = createServerSupabaseClient();

  const [
    { data: student, error: errStudent },
    { data: enrollments, error: errEnroll },
    { data: attendance, error: errAtt },
    { data: submissions, error: errSub },
    { data: quizAttempts, error: errAttempts },
    { data: allAchievements, error: errAch },
    { data: unlockedAchievements, error: errUnlocked },
    { data: notifications, error: errNotif },
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
        group_id,
        status,
        groups (
          id,
          code,
          name,
          room,
          schedule_days,
          start_time,
          end_time,
          courses (
            title_uz,
            category
          ),
          teachers (
            profiles:profile_id (
              full_name
            )
          )
        )
      `
      )
      .eq('student_id', studentId)
      .eq('status', 'active'),
    supabase
      .from('attendance')
      .select(
        `
        id,
        status,
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
      .from('submissions')
      .select('*')
      .eq('student_id', studentId),
    supabase
      .from('quiz_attempts')
      .select('*')
      .eq('student_id', studentId),
    supabase
      .from('achievements')
      .select('*')
      .order('criteria_threshold', { ascending: true }),
    supabase
      .from('student_achievements')
      .select('*')
      .eq('student_id', studentId),
    supabase
      .from('notifications')
      .select('*')
      .eq('recipient_profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  if (
    errStudent ||
    studentId.startsWith('demo-') ||
    !student
  ) {
    return getDemoStudentDashboardData();
  }

  const prof = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles;
  const xpTotal = Number(student.xp_total || 0);
  const levelData = calculateStudentLevel(xpTotal);

  const profileData: StudentDashboardProfile = {
    studentId: student.id,
    profileId,
    studentCode: student.student_code,
    fullName: prof?.full_name || fullName,
    phone: prof?.phone || '—',
    email: prof?.email || email,
    xpTotal,
    currentLevel: levelData.level,
    currentLevelMinXp: levelData.currentLevelMinXp,
    nextLevelMinXp: levelData.nextLevelMinXp,
    progressPct: levelData.progressPct,
    streakDays: Number(student.streak_days || 0),
    enrolledAt: student.enrolled_at || '',
  };

  const groupList: StudentGroupInfo[] = (enrollments || []).map((e: any) => {
    const g = e.groups;
    const tchProf = Array.isArray(g?.teachers?.profiles)
      ? g.teachers?.profiles[0]
      : g?.teachers?.profiles;

    return {
      id: g?.id || '',
      code: g?.code || '—',
      name: g?.name || 'Guruh',
      courseTitle: g?.courses?.title_uz || 'Kurs',
      courseCategory: g?.courses?.category || 'robotics',
      teacherName: tchProf?.full_name || 'Ustoz',
      room: g?.room || 'Xona 1',
      scheduleDays: g?.schedule_days || '',
      startTime: String(g?.start_time || '').slice(0, 5),
      endTime: String(g?.end_time || '').slice(0, 5),
    };
  });

  const groupIds = groupList.map((g) => g.id);

  // Fetch homework for student's groups
  let homeworkItems: StudentHomeworkItem[] = [];
  if (groupIds.length > 0) {
    const { data: hw } = await supabase
      .from('homework')
      .select('*, groups(code)')
      .in('group_id', groupIds)
      .order('deadline', { ascending: true });

    const submissionMap = new Map((submissions || []).map((s: any) => [s.homework_id, s]));

    homeworkItems = (hw || []).map((h: any) => {
      const sub = submissionMap.get(h.id);
      return {
        id: h.id,
        groupId: h.group_id,
        groupCode: h.groups?.code || '—',
        titleUz: h.title_uz,
        descriptionUz: h.description_uz,
        deadline: h.deadline,
        maxScore: Number(h.max_score || 100),
        xpReward: Number(h.xp_reward || 25),
        isRoboticsProject: Boolean(h.is_robotics_project),
        submission: sub
          ? {
              id: sub.id,
              status: sub.status,
              score: sub.score,
              feedbackTeacher: sub.feedback_teacher,
              submittedAt: sub.submitted_at,
              fileUrl: sub.file_url,
              githubOrVideoUrl: sub.github_or_video_url,
            }
          : undefined,
      };
    });
  }

  // Fetch quizzes for student's groups
  let quizItems: StudentQuizItem[] = [];
  if (groupIds.length > 0) {
    const { data: qz } = await supabase
      .from('quizzes')
      .select('*, groups(code)')
      .in('group_id', groupIds)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    const attemptMap = new Map((quizAttempts || []).map((a: any) => [a.quiz_id, a]));

    quizItems = (qz || []).map((q: any) => {
      const att = attemptMap.get(q.id);
      return {
        id: q.id,
        groupId: q.group_id,
        groupCode: q.groups?.code || '—',
        titleUz: q.title_uz,
        descriptionUz: q.description_uz,
        timeLimitMinutes: Number(q.time_limit_minutes || 20),
        passingScorePct: Number(q.passing_score_pct || 70),
        xpReward: Number(q.xp_reward || 40),
        attempt: att
          ? {
              id: att.id,
              scorePct: Number(att.score_pct || 0),
              passed: Boolean(att.passed),
              completedAt: att.completed_at,
            }
          : undefined,
      };
    });
  }

  // Attendance formatting
  const attendanceList: StudentAttendanceRecord[] = (attendance || []).map((a: any) => ({
    id: a.id,
    lessonDate: a.lessons?.lesson_date || '',
    topicUz: a.lessons?.topic_uz || "Dars mashg'uloti",
    status: a.status as AttendanceStatus,
    groupCode: a.lessons?.groups?.code || '—',
    remarks: a.remarks,
  }));

  // Achievements
  const unlockedSet = new Set((unlockedAchievements || []).map((u: any) => u.achievement_id));
  const achievementItems: StudentAchievementItem[] = (allAchievements || []).map((a: any) => ({
    id: a.id,
    code: a.code,
    titleUz: a.title_uz,
    descriptionUz: a.description_uz,
    iconName: a.icon_name || 'Trophy',
    xpBonus: Number(a.xp_bonus || 50),
    isUnlocked: unlockedSet.has(a.id),
  }));

  const notificationItems: StudentNotificationItem[] = (notifications || []).map((n: any) => ({
    id: n.id,
    type: n.type,
    titleUz: n.title_uz,
    bodyUz: n.body_uz,
    isRead: Boolean(n.is_read),
    createdAt: n.created_at,
  }));

  return {
    profile: profileData,
    groups: groupList,
    attendance: attendanceList,
    homework: homeworkItems,
    quizzes: quizItems,
    achievements: achievementItems,
    notifications: notificationItems,
  };
}

/**
 * 2. Submit Homework for Student
 */
export async function submitHomeworkForStudent(payload: {
  homeworkId: string;
  fileUrl?: string;
  githubOrVideoUrl?: string;
  commentStudent?: string;
}) {
  const { studentId } = await requireStudentServerAuth();
  const supabase = createServerSupabaseClient();

  if (!payload.fileUrl && !payload.githubOrVideoUrl && !payload.commentStudent) {
    throw new Error("Kamida bitta havola (GitHub/Video/Fayl) yoki izoh kiritilishi shart.");
  }

  const { data, error } = await supabase
    .from('submissions')
    .upsert(
      {
        homework_id: payload.homeworkId,
        student_id: studentId,
        file_url: payload.fileUrl?.trim() || null,
        github_or_video_url: payload.githubOrVideoUrl?.trim() || null,
        comment_student: payload.commentStudent?.trim() || null,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'homework_id,student_id' }
    )
    .select()
    .single();

  if (error) throw new Error("Vazifani topshirishda xatolik: " + error.message);
  return data;
}

/**
 * 3. Fetch Quiz Questions for Taking Quiz (SECURE: Strips correct_option & explanations!)
 */
export async function getQuizQuestionsForStudent(quizId: string) {
  await requireStudentServerAuth();
  const supabase = createServerSupabaseClient();

  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, question_order, question_text_uz, code_snippet, options, points')
    .eq('quiz_id', quizId)
    .order('question_order', { ascending: true });

  if (error) throw new Error("Test savollarini olishda xatolik: " + error.message);
  return questions || [];
}

/**
 * 4. Submit Quiz Attempt and Trigger Server-side Automated Grading
 */
export async function submitQuizAttemptForStudent(payload: {
  quizId: string;
  answers: Record<string, string>;
}) {
  await requireStudentServerAuth();
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.rpc('fn_submit_quiz_attempt', {
    p_quiz_id: payload.quizId,
    p_answers: payload.answers,
  });

  if (error) throw new Error("Testni topshirishda xatolik: " + error.message);
  return data;
}

/**
 * 5. Mark Notification As Read
 */
export async function markNotificationAsRead(notificationId: string) {
  const { profileId } = await requireStudentServerAuth();
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('recipient_profile_id', profileId);

  if (error) throw new Error(error.message);
  return { success: true };
}
