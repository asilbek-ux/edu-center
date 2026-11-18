'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Layers,
  CalendarCheck,
  FileCheck,
  HelpCircle,
  Plus,
  RefreshCw,
  LogOut,
  Cpu,
  ShieldCheck,
  X,
  CheckCircle2,
  AlertTriangle,
  Inbox,
  Clock,
  Award,
  BookOpen,
  Send,
  ExternalLink
} from 'lucide-react';
import {
  fetchTeacherDashboardData,
  createLessonForTeacher,
  markBatchAttendanceForTeacher,
  createHomeworkForTeacher,
  gradeSubmissionForTeacher,
  createQuizForTeacher,
} from '@/lib/supabase/teacher-queries';
import {
  TeacherAssignedGroup,
  TeacherStudentRow,
  TeacherLessonRow,
  TeacherHomeworkRow,
  TeacherSubmissionRow,
  TeacherQuizRow
} from '@/lib/supabase/teacher-types';
import { signOutSecurely } from '@/lib/supabase/auth-actions';
import { AttendanceStatus } from '@/types/database';

export default function TeacherDashboardPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'attendance' | 'homework' | 'quizzes'>('overview');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorUz, setErrorUz] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Teacher State
  const [teacherInfo, setTeacherInfo] = useState<any>(null);
  const [assignedGroups, setAssignedGroups] = useState<TeacherAssignedGroup[]>([]);
  const [students, setStudents] = useState<TeacherStudentRow[]>([]);
  const [lessons, setLessons] = useState<TeacherLessonRow[]>([]);
  const [homeworkList, setHomeworkList] = useState<TeacherHomeworkRow[]>([]);
  const [submissions, setSubmissions] = useState<TeacherSubmissionRow[]>([]);
  const [quizzes, setQuizzes] = useState<TeacherQuizRow[]>([]);

  // Selected filters
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');

  // Modals
  const [showCreateLessonModal, setShowCreateLessonModal] = useState<boolean>(false);
  const [showCreateHomeworkModal, setShowCreateHomeworkModal] = useState<boolean>(false);
  const [showCreateQuizModal, setShowCreateQuizModal] = useState<boolean>(false);
  const [gradingSubmission, setGradingSubmission] = useState<TeacherSubmissionRow | null>(null);
  const [activeAttendanceLesson, setActiveAttendanceLesson] = useState<TeacherLessonRow | null>(null);

  // Forms
  const [lessonForm, setLessonForm] = useState({
    groupId: '',
    topicUz: '',
    lessonDate: new Date().toISOString().slice(0, 10),
    startTime: '15:00',
    endTime: '17:00',
    materialsUrl: '',
    isRoboticsLab: true,
  });

  const [homeworkForm, setHomeworkForm] = useState({
    groupId: '',
    titleUz: '',
    descriptionUz: '',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    maxScore: 100,
    xpReward: 30,
    isRoboticsProject: true,
  });

  const [gradeForm, setGradeForm] = useState({
    score: 85,
    feedback: "Yaxshi ishlangan loyiha!",
    hardwareScore: 22,
    codeScore: 20,
    autonomousScore: 21,
    creativityScore: 22,
  });

  const [attendanceSheet, setAttendanceSheet] = useState<Record<string, { status: AttendanceStatus; remarks: string }>>({});

  const showNotice = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => {
      setStatusToast((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorUz(null);
    try {
      const data = await fetchTeacherDashboardData();
      setTeacherInfo(data.teacher);
      setAssignedGroups(data.assignedGroups);
      setStudents(data.studentsList);
      setLessons(data.lessonsList);
      setHomeworkList(data.homeworkList);
      setSubmissions(data.submissionsList);
      setQuizzes(data.quizzesList);
      if (data.assignedGroups.length > 0 && !lessonForm.groupId) {
        setLessonForm((prev) => ({ ...prev, groupId: data.assignedGroups[0].id }));
        setHomeworkForm((prev) => ({ ...prev, groupId: data.assignedGroups[0].id }));
      }
    } catch (err: unknown) {
      setErrorUz(err instanceof Error ? err.message : "Xatolik yuz berdi.");
    } finally {
      setIsLoading(false);
    }
  }, [lessonForm.groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = async () => {
    await signOutSecurely();
    router.push('/login');
    router.refresh();
  };

  const filteredStudents = useMemo(() => {
    if (selectedGroupId === 'all') return students;
    return students.filter((s) => s.groupId === selectedGroupId);
  }, [students, selectedGroupId]);

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newLesson = await createLessonForTeacher(lessonForm);
      showNotice("Dars muvaffaqiyatli ochildi! Endi davomatni belgilashingiz mumkin.");
      setShowCreateLessonModal(false);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Xatolik yuz berdi.");
    }
  };

  const openAttendanceForLesson = (lesson: TeacherLessonRow) => {
    setActiveAttendanceLesson(lesson);
    const initial: Record<string, { status: AttendanceStatus; remarks: string }> = {};
    const groupStudents = students.filter((s) => s.groupId === lesson.groupId);
    groupStudents.forEach((s) => {
      initial[s.id] = { status: 'present', remarks: '' };
    });
    setAttendanceSheet(initial);
  };

  const handleSaveAttendance = async () => {
    if (!activeAttendanceLesson) return;
    try {
      const records = Object.entries(attendanceSheet).map(([studentId, val]) => ({
        studentId,
        status: val.status,
        remarks: val.remarks,
      }));
      await markBatchAttendanceForTeacher({
        lessonId: activeAttendanceLesson.id,
        records,
      });
      showNotice("Davomat muvaffaqiyatli saqlandi!");
      setActiveAttendanceLesson(null);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Xatolik yuz berdi.");
    }
  };

  const handleCreateHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createHomeworkForTeacher(homeworkForm);
      showNotice("Vazifa muvaffaqiyatli yaratildi va o'quvchilarga e'lon qilindi!");
      setShowCreateHomeworkModal(false);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Xatolik yuz berdi.");
    }
  };

  const handleGradeSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission) return;
    try {
      await gradeSubmissionForTeacher({
        submissionId: gradingSubmission.id,
        studentId: gradingSubmission.studentId,
        homeworkId: gradingSubmission.homeworkId,
        score: gradeForm.score,
        feedbackTeacher: gradeForm.feedback,
        rubricScores: gradingSubmission.isRoboticsProject
          ? {
              hardwareScore: gradeForm.hardwareScore,
              codeScore: gradeForm.codeScore,
              autonomousScore: gradeForm.autonomousScore,
              creativityScore: gradeForm.creativityScore,
            }
          : undefined,
      });
      showNotice("Loyiha baholandi va o'quvchiga avtomatik XP hisoblandi!");
      setGradingSubmission(null);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Xatolik yuz berdi.");
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      {statusToast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{statusToast}</span>
        </div>
      )}

      {/* Teacher Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-200 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 leading-tight">EduCenter O&apos;qituvchi</h1>
            <span className="text-[10px] font-semibold text-emerald-600 uppercase bg-emerald-50 px-1.5 py-0.5 rounded">
              Ustoz Kabineti
            </span>
          </div>
        </div>

        <nav className="p-3 space-y-1 flex-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'overview'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Umumiy Ko&apos;rinish
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'students'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Users className="h-4 w-4" />
            Mening O&apos;quvchilarim ({students.length})
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'attendance'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <CalendarCheck className="h-4 w-4" />
            Davomat va Darslar
          </button>
          <button
            onClick={() => setActiveTab('homework')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'homework'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FileCheck className="h-4 w-4" />
            Vazifalar & Tekshirish ({submissions.filter((s) => s.status === 'submitted').length})
          </button>
          <button
            onClick={() => setActiveTab('quizzes')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'quizzes'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            Testlar (Quizzes)
          </button>
        </nav>

        <div className="p-3 border-t border-slate-200">
          <div className="px-3 py-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span className="truncate">{teacherInfo?.fullName || "O'qituvchi"}</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-1 flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
          >
            <LogOut className="h-4 w-4" />
            Chiqish (Logout)
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              {activeTab === 'overview' && 'O\'qituvchi Boshqaruv Markazi'}
              {activeTab === 'students' && 'Biriktirilgan Guruhlar va O\'quvchilar Ro\'yxati'}
              {activeTab === 'attendance' && 'Dars Ochish va Davomat Qilish'}
              {activeTab === 'homework' && 'Uy Vazifalari va Robototexnika Loyihalarini Baholash'}
              {activeTab === 'quizzes' && 'Testlar (Quizzes) Boshqaruvi'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Yangilash
            </button>

            {activeTab === 'attendance' && (
              <button
                onClick={() => setShowCreateLessonModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold shadow hover:bg-emerald-700 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                Yangi Dars Boshlash
              </button>
            )}

            {activeTab === 'homework' && (
              <button
                onClick={() => setShowCreateHomeworkModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold shadow hover:bg-emerald-700 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                Vazifa Yaratish
              </button>
            )}
          </div>
        </header>

        {errorUz && (
          <div className="mx-8 mt-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
            <div>
              <p className="font-bold">Xatolik:</p>
              <p className="mt-0.5">{errorUz}</p>
            </div>
          </div>
        )}

        <div className="p-8 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Mening Guruhlarim</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{assignedGroups.length} ta</p>
                  <span className="text-[11px] text-emerald-600 font-medium">Faol darslar</span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Jami O&apos;quvchilarim</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{students.length} nafar</p>
                  <span className="text-[11px] text-indigo-600 font-medium">Guruhlar bo&apos;yicha</span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Tekshirilmagan Vazifalar</p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">
                    {submissions.filter((s) => s.status === 'submitted').length} ta
                  </p>
                  <span className="text-[11px] text-slate-500 font-medium">Baholash kutilmoqda</span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Testlar (Quizzes)</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{quizzes.length} ta</p>
                  <span className="text-[11px] text-slate-500 font-medium">Faol testlar</span>
                </div>
              </div>

              {/* Assigned Groups with Schedules */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Biriktirilgan Dars Jadvallari
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {assignedGroups.map((g) => (
                    <div key={g.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {g.code}
                          </span>
                          <h4 className="font-bold text-slate-900 mt-1">{g.name}</h4>
                          <p className="text-xs text-slate-500">{g.courseTitle}</p>
                        </div>
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {g.enrolledStudentsCount} o&apos;quvchi
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 space-y-1">
                        <p><span className="text-slate-400">Xona:</span> {g.room}</p>
                        <p><span className="text-slate-400">Jadval:</span> <span className="font-bold text-slate-800">{g.scheduleDays} ({g.startTime}–{g.endTime})</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STUDENTS */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-xs font-semibold text-slate-700">Guruh bo&apos;yicha:</span>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="rounded-lg border border-slate-300 py-1.5 px-3 text-xs focus:border-emerald-600 focus:outline-none bg-white"
                >
                  <option value="all">Barcha Guruhlar</option>
                  {assignedGroups.map((g) => (
                    <option key={g.id} value={g.id}>{g.code} — {g.name}</option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Kod & F.I.Sh</th>
                      <th className="py-3 px-4">Telefon</th>
                      <th className="py-3 px-4">Guruh</th>
                      <th className="py-3 px-4">XP & Daraja</th>
                      <th className="py-3 px-4">Davomat</th>
                      <th className="py-3 px-4">Topshirilgan Vazifalar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          O&apos;quvchilar mavjud emas
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{s.fullName}</p>
                            <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1 rounded">
                              {s.studentCode}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono">{s.phone}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{s.groupCode}</td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-amber-600">{s.xpTotal} XP</span>
                            <span className="text-[10px] text-slate-400 ml-1">({s.currentLevel}-daraja)</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-emerald-600">{s.attendancePct}%</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-indigo-600">{s.homeworkCompletedCount} ta vazifa</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ATTENDANCE & LESSONS */}
          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Sana</th>
                      <th className="py-3 px-4">Guruh</th>
                      <th className="py-3 px-4">Dars Mavzusi</th>
                      <th className="py-3 px-4">Turi</th>
                      <th className="py-3 px-4">Belgilanganlar</th>
                      <th className="py-3 px-4 text-right">Amal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lessons.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">{l.lessonDate}</td>
                        <td className="py-3 px-4 font-bold text-emerald-600">{l.groupCode}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{l.topicUz}</td>
                        <td className="py-3 px-4">
                          {l.isRoboticsLab ? (
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                              Robototexnika Lab
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500">Nazariy</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-700">{l.markedStudentsCount} nafar</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openAttendanceForLesson(l)}
                            className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow"
                          >
                            Davomat Belgilash
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: HOMEWORK & SUBMISSIONS */}
          {activeTab === 'homework' && (
            <div className="space-y-6">
              {/* Active Homework List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Mavjud Vazifalar</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {homeworkList.map((h) => (
                    <div key={h.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {h.groupCode}
                          </span>
                          <h4 className="font-bold text-slate-900 mt-1">{h.titleUz}</h4>
                          <p className="text-xs text-slate-500 line-clamp-2">{h.descriptionUz}</p>
                        </div>
                      </div>
                      <div className="text-xs text-slate-600 space-y-1">
                        <p><span className="text-slate-400">Muddat:</span> <span className="font-bold text-rose-600">{h.deadline.replace('T', ' ')}</span></p>
                        <p><span className="text-slate-400">Mukofot:</span> <span className="font-bold text-amber-600">+{h.xpReward} XP</span></p>
                        <p><span className="text-slate-400">Topshirganlar:</span> <span className="font-bold text-slate-900">{h.submissionsCount} ta (Tekshirilgan: {h.gradedCount})</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submissions Inbox */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  O&apos;quvchilar Topshirgan Loyihalar & Vazifalar (Tekshirish Uchun)
                </h3>
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">O&apos;quvchi</th>
                        <th className="py-3 px-4">Vazifa</th>
                        <th className="py-3 px-4">Topshirilgan Material</th>
                        <th className="py-3 px-4">Holat & Ball</th>
                        <th className="py-3 px-4 text-right">Amal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {submissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{sub.studentName}</p>
                            <span className="text-[10px] font-mono text-slate-400">{sub.studentCode} ({sub.groupCode})</span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-800">{sub.homeworkTitle}</p>
                            {sub.isRoboticsProject && (
                              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                Robototexnika Loyihasi
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {sub.githubOrVideoUrl && (
                              <a
                                href={sub.githubOrVideoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-indigo-600 hover:underline"
                              >
                                Havola (GitHub / Video) <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {sub.commentStudent && (
                              <p className="text-[11px] text-slate-500 italic mt-0.5">&ldquo;{sub.commentStudent}&rdquo;</p>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {sub.status === 'graded' ? (
                              <span className="font-bold text-emerald-600">{sub.score} ball (Baholandi)</span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase bg-amber-50 text-amber-700 px-2 py-0.5 rounded">
                                Kutilmoqda
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setGradingSubmission(sub);
                                setGradeForm({
                                  score: sub.score || 85,
                                  feedback: sub.feedbackTeacher || "A'lo darajada bajarilgan!",
                                  hardwareScore: sub.roboticsHardwareScore || 22,
                                  codeScore: sub.roboticsCodeScore || 21,
                                  autonomousScore: sub.roboticsAutonomousScore || 20,
                                  creativityScore: sub.roboticsCreativityScore || 22,
                                });
                              }}
                              className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow"
                            >
                              Baholash & Izoh
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: QUIZZES */}
          {activeTab === 'quizzes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.map((q) => (
                <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {q.groupCode}
                      </span>
                      <h4 className="font-bold text-slate-900 mt-1">{q.titleUz}</h4>
                    </div>
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                      +{q.xpReward} XP
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    <p><span className="text-slate-400">Vaqt chegarasi:</span> {q.timeLimitMinutes} daqiqa</p>
                    <p><span className="text-slate-400">O&apos;tish bali:</span> {q.passingScorePct}%</p>
                    <p><span className="text-slate-400">Savollar:</span> {q.questionsCount} ta savol</p>
                    <p><span className="text-slate-400">Topshirishlar:</span> <span className="font-bold text-slate-900">{q.attemptsCount} nafar</span></p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* MODAL: CREATE LESSON */}
      {showCreateLessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Yangi Dars Boshlash</h3>
              <button onClick={() => setShowCreateLessonModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateLesson} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700">Guruh</label>
                <select
                  required
                  value={lessonForm.groupId}
                  onChange={(e) => setLessonForm({ ...lessonForm, groupId: e.target.value })}
                  className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-emerald-600 focus:outline-none bg-white"
                >
                  {assignedGroups.map((g) => (
                    <option key={g.id} value={g.id}>{g.code} — {g.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700">Dars Mavzusi</label>
                <input
                  type="text"
                  required
                  value={lessonForm.topicUz}
                  onChange={(e) => setLessonForm({ ...lessonForm, topicUz: e.target.value })}
                  placeholder="Ultrasonik datchik va to'siqlarni aylanib o'tish"
                  className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Sana</label>
                  <input
                    type="date"
                    required
                    value={lessonForm.lessonDate}
                    onChange={(e) => setLessonForm({ ...lessonForm, lessonDate: e.target.value })}
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Turi</label>
                  <label className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      checked={lessonForm.isRoboticsLab}
                      onChange={(e) => setLessonForm({ ...lessonForm, isRoboticsLab: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>Robototexnika Lab</span>
                  </label>
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateLessonModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                >
                  Darsni Boshlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BATCH ATTENDANCE MARKING */}
      {activeAttendanceLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Davomat Belgilash</h3>
                <p className="text-slate-500">{activeAttendanceLesson.groupCode} • {activeAttendanceLesson.topicUz}</p>
              </div>
              <button onClick={() => setActiveAttendanceLesson(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {students
                .filter((s) => s.groupId === activeAttendanceLesson.groupId)
                .map((std) => {
                  const current = attendanceSheet[std.id] || { status: 'present', remarks: '' };
                  return (
                    <div key={std.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50">
                      <div>
                        <p className="font-bold text-slate-900">{std.fullName}</p>
                        <span className="text-[10px] font-mono text-slate-400">{std.studentCode}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {(['present', 'late', 'absent', 'excused'] as AttendanceStatus[]).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() =>
                              setAttendanceSheet((prev) => ({
                                ...prev,
                                [std.id]: { ...current, status: st },
                              }))
                            }
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                              current.status === st
                                ? st === 'present'
                                  ? 'bg-emerald-600 text-white shadow'
                                  : st === 'late'
                                  ? 'bg-amber-500 text-white shadow'
                                  : st === 'absent'
                                  ? 'bg-rose-600 text-white shadow'
                                  : 'bg-indigo-600 text-white shadow'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {st === 'present' ? 'Hozir' : st === 'late' ? 'Kechikdi' : st === 'absent' ? 'Kelmadi' : 'Sababli'}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t">
              <button
                type="button"
                onClick={() => setActiveAttendanceLesson(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleSaveAttendance}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 shadow"
              >
                Davomatni Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE HOMEWORK */}
      {showCreateHomeworkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Yangi Vazifa / Loyiha Yaratish</h3>
              <button onClick={() => setShowCreateHomeworkModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateHomework} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700">Guruh</label>
                <select
                  required
                  value={homeworkForm.groupId}
                  onChange={(e) => setHomeworkForm({ ...homeworkForm, groupId: e.target.value })}
                  className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-emerald-600 focus:outline-none bg-white"
                >
                  {assignedGroups.map((g) => (
                    <option key={g.id} value={g.id}>{g.code} — {g.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700">Vazifa Mavzusi</label>
                <input
                  type="text"
                  required
                  value={homeworkForm.titleUz}
                  onChange={(e) => setHomeworkForm({ ...homeworkForm, titleUz: e.target.value })}
                  placeholder="Arduino orqali chiziq bo'ylab harakatlanuvchi robot dasturi"
                  className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700">Tavsif & Topshiriq Shartlari</label>
                <textarea
                  rows={3}
                  required
                  value={homeworkForm.descriptionUz}
                  onChange={(e) => setHomeworkForm({ ...homeworkForm, descriptionUz: e.target.value })}
                  placeholder="Kod GitHub repo yoki video shaklida topshirilishi kerak..."
                  className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Muddat (Deadline)</label>
                  <input
                    type="datetime-local"
                    required
                    value={homeworkForm.deadline}
                    onChange={(e) => setHomeworkForm({ ...homeworkForm, deadline: e.target.value })}
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">XP Mukofoti</label>
                  <input
                    type="number"
                    min="10"
                    step="5"
                    required
                    value={homeworkForm.xpReward}
                    onChange={(e) => setHomeworkForm({ ...homeworkForm, xpReward: Number(e.target.value) })}
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 mt-2 font-medium">
                <input
                  type="checkbox"
                  checked={homeworkForm.isRoboticsProject}
                  onChange={(e) => setHomeworkForm({ ...homeworkForm, isRoboticsProject: e.target.checked })}
                  className="rounded text-emerald-600"
                />
                <span>Robototexnika Loyihasi (4 mezonli rubrika bo&apos;yicha baholanadi)</span>
              </label>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateHomeworkModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                >
                  Vazifani E&apos;lon Qilish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GRADE SUBMISSION (WITH ROBOTICS RUBRIC EVALUATION) */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Topshiriqni Baholash & Feedback</h3>
                <p className="text-slate-500">{gradingSubmission.studentName} • {gradingSubmission.homeworkTitle}</p>
              </div>
              <button onClick={() => setGradingSubmission(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleGradeSubmission} className="space-y-3">
              {gradingSubmission.isRoboticsProject ? (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <p className="font-bold text-indigo-700 uppercase tracking-wide text-[11px]">
                    Robototexnika Loyihasi Rubrikasi (0–25 ball har biri)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">Mexanika & Sxema (0-25)</label>
                      <input
                        type="number"
                        min="0"
                        max="25"
                        required
                        value={gradeForm.hardwareScore}
                        onChange={(e) => setGradeForm({ ...gradeForm, hardwareScore: Number(e.target.value) })}
                        className="w-full mt-1 rounded border border-slate-300 p-1.5 text-xs focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">Kod & Dastur (0-25)</label>
                      <input
                        type="number"
                        min="0"
                        max="25"
                        required
                        value={gradeForm.codeScore}
                        onChange={(e) => setGradeForm({ ...gradeForm, codeScore: Number(e.target.value) })}
                        className="w-full mt-1 rounded border border-slate-300 p-1.5 text-xs focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">Avtonomlik & Datchiklar (0-25)</label>
                      <input
                        type="number"
                        min="0"
                        max="25"
                        required
                        value={gradeForm.autonomousScore}
                        onChange={(e) => setGradeForm({ ...gradeForm, autonomousScore: Number(e.target.value) })}
                        className="w-full mt-1 rounded border border-slate-300 p-1.5 text-xs focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700">Ijodkorlik & Dizayn (0-25)</label>
                      <input
                        type="number"
                        min="0"
                        max="25"
                        required
                        value={gradeForm.creativityScore}
                        onChange={(e) => setGradeForm({ ...gradeForm, creativityScore: Number(e.target.value) })}
                        className="w-full mt-1 rounded border border-slate-300 p-1.5 text-xs focus:border-emerald-600"
                      />
                    </div>
                  </div>
                  <div className="text-right font-bold text-emerald-700">
                    Jami Ball: {gradeForm.hardwareScore + gradeForm.codeScore + gradeForm.autonomousScore + gradeForm.creativityScore} / 100
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-700">Ball (0–100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={gradeForm.score}
                    onChange={(e) => setGradeForm({ ...gradeForm, score: Number(e.target.value) })}
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700">O&apos;qituvchi Izohi (Feedback)</label>
                <textarea
                  rows={3}
                  required
                  value={gradeForm.feedback}
                  onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                  placeholder="Dvigatel ulanishi to'g'ri, dastur kodini yanada ixcham qilish mumkin..."
                  className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setGradingSubmission(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 shadow"
                >
                  Baholashni Tasdiqlash (+XP Berish)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
