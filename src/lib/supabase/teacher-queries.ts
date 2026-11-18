'use server';

import { createServerSupabaseClient } from './server';
import { requireTeacherServerAuth } from './auth-actions';
import { validateHomeworkInput, validateQuizInput } from '../validations/schemas';
import { evaluateRoboticsProject } from '../gamification';
import { AttendanceStatus, CourseCategory, SubmissionStatus } from '../../types/database';
import { getDemoTeacherDashboardData } from '../demo-data';
import type {
  TeacherAssignedGroup,
  TeacherStudentRow,
  TeacherLessonRow,
  TeacherHomeworkRow,
  TeacherSubmissionRow,
  TeacherQuizRow,
} from './teacher-types';

/**
 * 1. Fetch Teacher Dashboard Data
 * Strictly scoped to the authenticated teacher's assigned groups and students.
 */
export async function fetchTeacherDashboardData() {
  const { teacherId, profileId, fullName, email } = await requireTeacherServerAuth();
  const supabase = createServerSupabaseClient();

  // Fetch teacher's assigned groups
  const { data: groups, error: grpErr } = await supabase
    .from('groups')
    .select(
      `
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
      group_students (
        id,
        student_id,
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
          attendance (status),
          submissions (status)
        )
      )
    `
    )
    .eq('teacher_id', teacherId)
    .order('code', { ascending: true });

  if (grpErr || teacherId.startsWith('demo-')) return getDemoTeacherDashboardData();

  const assignedGroups: TeacherAssignedGroup[] = (groups || []).map((g: any) => ({
    id: g.id,
    code: g.code,
    name: g.name,
    room: g.room,
    scheduleDays: g.schedule_days,
    startTime: String(g.start_time || '15:00').slice(0, 5),
    endTime: String(g.end_time || '17:00').slice(0, 5),
    courseTitle: g.courses?.title_uz || 'Kurs',
    courseCategory: g.courses?.category || 'robotics',
    enrolledStudentsCount: (g.group_students || []).length,
  }));

  const groupIds = assignedGroups.map((g) => g.id);

  // Extract students
  const studentsList: TeacherStudentRow[] = [];
  const seenStudentIds = new Set<string>();

  for (const g of groups || []) {
    for (const gs of g.group_students || []) {
      const s: any = Array.isArray(gs.students) ? gs.students[0] : gs.students;
      if (!s || seenStudentIds.has(s.id)) continue;
      seenStudentIds.add(s.id);

      const prof = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
      const att = Array.isArray(s.attendance) ? s.attendance : [];
      const present = att.filter((a: any) => a.status === 'present' || a.status === 'late').length;
      const attPct = att.length > 0 ? Math.round((present / att.length) * 100) : 100;
      const sub = Array.isArray(s.submissions) ? s.submissions : [];
      const completedSubs = sub.filter((sb: any) => sb.status === 'graded').length;

      studentsList.push({
        id: s.id,
        studentCode: s.student_code,
        fullName: prof?.full_name || "O'quvchi",
        phone: prof?.phone || '—',
        groupId: g.id,
        groupCode: g.code,
        xpTotal: Number(s.xp_total || 0),
        currentLevel: Number(s.current_level || 1),
        streakDays: Number(s.streak_days || 0),
        attendancePct: attPct,
        homeworkCompletedCount: completedSubs,
      });
    }
  }

  // Fetch upcoming and past lessons for teacher's groups
  let lessonsList: TeacherLessonRow[] = [];
  if (groupIds.length > 0) {
    const { data: lessons } = await supabase
      .from('lessons')
      .select('*, groups(code), attendance(id)')
      .in('group_id', groupIds)
      .order('lesson_date', { ascending: false })
      .limit(30);

    lessonsList = (lessons || []).map((l: any) => ({
      id: l.id,
      groupId: l.group_id,
      groupCode: l.groups?.code || '—',
      lessonNumber: l.lesson_number,
      topicUz: l.topic_uz,
      lessonDate: l.lesson_date,
      startTime: String(l.start_time || '').slice(0, 5),
      endTime: String(l.end_time || '').slice(0, 5),
      materialsUrl: l.materials_url,
      isRoboticsLab: Boolean(l.is_robotics_lab),
      markedStudentsCount: (l.attendance || []).length,
    }));
  }

  // Fetch homework for teacher's groups
  let homeworkList: TeacherHomeworkRow[] = [];
  if (groupIds.length > 0) {
    const { data: hw } = await supabase
      .from('homework')
      .select('*, groups(code), submissions(id, status)')
      .in('group_id', groupIds)
      .order('deadline', { ascending: false });

    homeworkList = (hw || []).map((h: any) => {
      const subs = Array.isArray(h.submissions) ? h.submissions : [];
      const graded = subs.filter((s: any) => s.status === 'graded').length;
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
        submissionsCount: subs.length,
        gradedCount: graded,
      };
    });
  }

  // Fetch submissions pending or graded
  let submissionsList: TeacherSubmissionRow[] = [];
  if (groupIds.length > 0) {
    const { data: subs } = await supabase
      .from('submissions')
      .select(
        `
        *,
        homework (
          title_uz,
          is_robotics_project,
          groups (code)
        ),
        students (
          student_code,
          profiles:profile_id (full_name)
        )
      `
      )
      .in(
        'homework_id',
        homeworkList.map((h) => h.id)
      )
      .order('submitted_at', { ascending: false })
      .limit(50);

    submissionsList = (subs || []).map((s: any) => {
      const std = s.students;
      const prof = Array.isArray(std?.profiles) ? std.profiles[0] : std?.profiles;
      return {
        id: s.id,
        homeworkId: s.homework_id,
        homeworkTitle: s.homework?.title_uz || 'Vazifa',
        isRoboticsProject: Boolean(s.homework?.is_robotics_project),
        studentId: s.student_id,
        studentName: prof?.full_name || "O'quvchi",
        studentCode: std?.student_code || '—',
        groupCode: s.homework?.groups?.code || '—',
        fileUrl: s.file_url,
        githubOrVideoUrl: s.github_or_video_url,
        commentStudent: s.comment_student,
        status: s.status as SubmissionStatus,
        score: s.score,
        roboticsHardwareScore: s.robotics_hardware_score,
        roboticsCodeScore: s.robotics_code_score,
        roboticsAutonomousScore: s.robotics_autonomous_score,
        roboticsCreativityScore: s.robotics_creativity_score,
        feedbackTeacher: s.feedback_teacher,
        submittedAt: s.submitted_at,
      };
    });
  }

  // Fetch quizzes created by teacher
  let quizzesList: TeacherQuizRow[] = [];
  if (groupIds.length > 0) {
    const { data: qz } = await supabase
      .from('quizzes')
      .select('*, groups(code), questions(id), quiz_attempts(id)')
      .in('group_id', groupIds)
      .order('created_at', { ascending: false });

    quizzesList = (qz || []).map((q: any) => ({
      id: q.id,
      groupId: q.group_id,
      groupCode: q.groups?.code || '—',
      titleUz: q.title_uz,
      timeLimitMinutes: Number(q.time_limit_minutes || 20),
      passingScorePct: Number(q.passing_score_pct || 70),
      xpReward: Number(q.xp_reward || 40),
      isPublished: Boolean(q.is_published),
      questionsCount: (q.questions || []).length,
      attemptsCount: (q.quiz_attempts || []).length,
    }));
  }

  return {
    teacher: { teacherId, profileId, fullName, email },
    assignedGroups,
    studentsList,
    lessonsList,
    homeworkList,
    submissionsList,
    quizzesList,
  };
}

/**
 * 2. Create Lesson and Open Attendance Sheet
 */
export async function createLessonForTeacher(payload: {
  groupId: string;
  topicUz: string;
  lessonDate: string;
  startTime: string;
  endTime: string;
  materialsUrl?: string;
  isRoboticsLab?: boolean;
}) {
  const { profileId } = await requireTeacherServerAuth();
  const supabase = createServerSupabaseClient();

  // Find next lesson number
  const { data: lastLesson } = await supabase
    .from('lessons')
    .select('lesson_number')
    .eq('group_id', payload.groupId)
    .order('lesson_number', { ascending: false })
    .limit(1)
    .single();

  const nextNumber = (lastLesson?.lesson_number || 0) + 1;

  const { data, error } = await supabase
    .from('lessons')
    .insert({
      group_id: payload.groupId,
      lesson_number: nextNumber,
      topic_uz: payload.topicUz.trim(),
      lesson_date: payload.lessonDate,
      start_time: payload.startTime,
      end_time: payload.endTime,
      materials_url: payload.materialsUrl?.trim() || null,
      is_robotics_lab: Boolean(payload.isRoboticsLab),
      created_by: profileId,
    })
    .select()
    .single();

  if (error) throw new Error("Darsni yaratishda xatolik: " + error.message);
  return data;
}

/**
 * 3. Mark Batch Attendance
 */
export async function markBatchAttendanceForTeacher(payload: {
  lessonId: string;
  records: Array<{ studentId: string; status: AttendanceStatus; remarks?: string }>;
}) {
  const { profileId } = await requireTeacherServerAuth();
  const supabase = createServerSupabaseClient();

  const upserts = payload.records.map((r) => ({
    lesson_id: payload.lessonId,
    student_id: r.studentId,
    status: r.status,
    remarks: r.remarks || null,
    marked_by: profileId,
    marked_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('attendance')
    .upsert(upserts, { onConflict: 'lesson_id,student_id' });

  if (error) throw new Error("Davomatni saqlashda xatolik: " + error.message);
  return { success: true };
}

/**
 * 4. Create Homework
 */
export async function createHomeworkForTeacher(payload: {
  groupId: string;
  titleUz: string;
  descriptionUz: string;
  deadline: string;
  maxScore?: number;
  xpReward?: number;
  isRoboticsProject?: boolean;
}) {
  const { profileId } = await requireTeacherServerAuth();
  const valid = validateHomeworkInput(payload);
  if (!valid.success) throw new Error(valid.errorUz);

  const supabase = createServerSupabaseClient();
  const clean = valid.data!;

  const { data, error } = await supabase
    .from('homework')
    .insert({
      group_id: clean.groupId,
      title_uz: clean.titleUz,
      description_uz: clean.descriptionUz,
      deadline: clean.deadline,
      maxScore: clean.maxScore || 100,
      xp_reward: clean.xpReward || 25,
      is_robotics_project: clean.isRoboticsProject,
      created_by: profileId,
    })
    .select()
    .single();

  if (error) throw new Error("Vazifani yaratishda xatolik: " + error.message);
  return data;
}

/**
 * 5. Grade Assignment / Robotics Project Submission
 */
export async function gradeSubmissionForTeacher(payload: {
  submissionId: string;
  studentId: string;
  homeworkId: string;
  score: number;
  feedbackTeacher: string;
  rubricScores?: {
    hardwareScore: number;
    codeScore: number;
    autonomousScore: number;
    creativityScore: number;
  };
}) {
  const { profileId } = await requireTeacherServerAuth();
  const supabase = createServerSupabaseClient();

  let finalScore = payload.score;
  let xpAwarded = 25;

  if (payload.rubricScores) {
    const evaluated = evaluateRoboticsProject(payload.rubricScores);
    finalScore = evaluated.totalScore;
    xpAwarded = evaluated.xpAwarded;
  }

  // Update submission
  const { data: sub, error: subErr } = await supabase
    .from('submissions')
    .update({
      score: finalScore,
      feedback_teacher: payload.feedbackTeacher.trim(),
      graded_by: profileId,
      status: 'graded' as SubmissionStatus,
      graded_at: new Date().toISOString(),
      robotics_hardware_score: payload.rubricScores?.hardwareScore ?? null,
      robotics_code_score: payload.rubricScores?.codeScore ?? null,
      robotics_autonomous_score: payload.rubricScores?.autonomousScore ?? null,
      robotics_creativity_score: payload.rubricScores?.creativityScore ?? null,
    })
    .eq('id', payload.submissionId)
    .select()
    .single();

  if (subErr) throw new Error("Baholashda xatolik: " + subErr.message);

  // Award XP to student idempotently
  await supabase.from('xp_transactions').upsert(
    {
      student_id: payload.studentId,
      source_type: 'homework',
      source_id: payload.submissionId,
      amount: xpAwarded,
      reason_uz: `Vazifa tekshirildi va baholandi: ${finalScore} ball (+${xpAwarded} XP)`,
      awarded_by: profileId,
    },
    { onConflict: 'student_id,source_type,source_id' }
  );

  return sub;
}

/**
 * 6. Create Quiz for Group
 */
export async function createQuizForTeacher(payload: {
  groupId: string;
  titleUz: string;
  descriptionUz?: string;
  timeLimitMinutes: number;
  passingScorePct: number;
  xpReward: number;
  questions: Array<{
    questionTextUz: string;
    codeSnippet?: string;
    options: Array<{ id: string; text: string }>;
    correctOption: string;
    points: number;
    explanationUz?: string;
  }>;
}) {
  const { profileId } = await requireTeacherServerAuth();
  const valid = validateQuizInput(payload);
  if (!valid.success) throw new Error(valid.errorUz);

  const supabase = createServerSupabaseClient();
  const clean = valid.data!;

  // 1. Insert quiz
  const { data: quiz, error: qzErr } = await supabase
    .from('quizzes')
    .insert({
      group_id: clean.groupId,
      title_uz: clean.titleUz,
      description_uz: clean.descriptionUz || null,
      time_limit_minutes: clean.timeLimitMinutes,
      passing_score_pct: clean.passingScorePct,
      xp_reward: clean.xpReward,
      is_published: true,
      created_by: profileId,
    })
    .select()
    .single();

  if (qzErr) throw new Error("Testni saqlashda xatolik: " + qzErr.message);

  // 2. Insert questions
  const questionsToInsert = clean.questions.map((q, idx) => ({
    quiz_id: quiz.id,
    question_order: idx + 1,
    question_text_uz: q.questionTextUz,
    code_snippet: q.codeSnippet || null,
    options: q.options,
    correct_option: q.correctOption,
    points: q.points || 10,
    explanation_uz: q.explanationUz || null,
  }));

  const { error: questErr } = await supabase.from('questions').insert(questionsToInsert);
  if (questErr) throw new Error("Savollarni saqlashda xatolik: " + questErr.message);

  return quiz;
}
