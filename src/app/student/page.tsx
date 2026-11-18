'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarCheck,
  FileCheck,
  HelpCircle,
  Award,
  Bell,
  RefreshCw,
  LogOut,
  Cpu,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  ExternalLink,
  ChevronRight,
  BookOpen,
  Trophy,
  Star,
  X
} from 'lucide-react';
import {
  fetchStudentDashboardData,
  submitHomeworkForStudent,
  getQuizQuestionsForStudent,
  submitQuizAttemptForStudent,
  markNotificationAsRead,
} from '@/lib/supabase/student-queries';
import {
  StudentDashboardProfile,
  StudentGroupInfo,
  StudentAttendanceRecord,
  StudentHomeworkItem,
  StudentQuizItem,
  StudentAchievementItem,
  StudentNotificationItem,
} from '@/lib/supabase/student-types';
import { signOutSecurely } from '@/lib/supabase/auth-actions';

export default function StudentDashboardPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'homework' | 'quizzes' | 'achievements' | 'notifications'>('overview');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorUz, setErrorUz] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Student State
  const [profile, setProfile] = useState<StudentDashboardProfile | null>(null);
  const [groups, setGroups] = useState<StudentGroupInfo[]>([]);
  const [attendance, setAttendance] = useState<StudentAttendanceRecord[]>([]);
  const [homeworkList, setHomeworkList] = useState<StudentHomeworkItem[]>([]);
  const [quizzes, setQuizzes] = useState<StudentQuizItem[]>([]);
  const [achievements, setAchievements] = useState<StudentAchievementItem[]>([]);
  const [notifications, setNotifications] = useState<StudentNotificationItem[]>([]);

  // Modals
  const [submittingHomework, setSubmittingHomework] = useState<StudentHomeworkItem | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<StudentQuizItem | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<any | null>(null);
  const [quizLoading, setQuizLoading] = useState<boolean>(false);

  // Submission Form
  const [submissionForm, setSubmissionForm] = useState({
    fileUrl: '',
    githubOrVideoUrl: '',
    commentStudent: '',
  });

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
      const data = await fetchStudentDashboardData();
      setProfile(data.profile);
      setGroups(data.groups);
      setAttendance(data.attendance);
      setHomeworkList(data.homework);
      setQuizzes(data.quizzes);
      setAchievements(data.achievements);
      setNotifications(data.notifications);
    } catch (err: unknown) {
      setErrorUz(err instanceof Error ? err.message : "Xatolik yuz berdi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLogout = async () => {
    await signOutSecurely();
    router.push('/login');
    router.refresh();
  };

  const handleSubmitHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingHomework) return;
    try {
      await submitHomeworkForStudent({
        homeworkId: submittingHomework.id,
        fileUrl: submissionForm.fileUrl,
        githubOrVideoUrl: submissionForm.githubOrVideoUrl,
        commentStudent: submissionForm.commentStudent,
      });
      showNotice("Vazifa muvaffaqiyatli topshirildi!");
      setSubmittingHomework(null);
      setSubmissionForm({ fileUrl: '', githubOrVideoUrl: '', commentStudent: '' });
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Xatolik yuz berdi.");
    }
  };

  const handleStartQuiz = async (q: StudentQuizItem) => {
    setActiveQuiz(q);
    setQuizResult(null);
    setQuizAnswers({});
    setQuizLoading(true);
    try {
      const questions = await getQuizQuestionsForStudent(q.id);
      setQuizQuestions(questions);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Savollarni yuklashda xatolik.");
      setActiveQuiz(null);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleFinishQuiz = async () => {
    if (!activeQuiz) return;
    setQuizLoading(true);
    try {
      const res = await submitQuizAttemptForStudent({
        quizId: activeQuiz.id,
        answers: quizAnswers,
      });
      setQuizResult(res);
      showNotice(
        res.passed
          ? `Tabriklaymiz! Testdan o'tdingiz (+${res.xp_awarded} XP)!`
          : `Test yakunlandi. Natija: ${res.score_pct}%`
      );
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Testni topshirishda xatolik.");
    } finally {
      setQuizLoading(false);
    }
  };

  const unreadNotifsCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      {statusToast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{statusToast}</span>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-200 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 leading-tight">EduCenter O&apos;quvchi</h1>
            <span className="text-[10px] font-semibold text-indigo-600 uppercase bg-indigo-50 px-1.5 py-0.5 rounded">
              Talaba Kabineti
            </span>
          </div>
        </div>

        <nav className="p-3 space-y-1 flex-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Mening Profilim & Darslarim
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'attendance'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <CalendarCheck className="h-4 w-4" />
            Mening Davomatim
          </button>
          <button
            onClick={() => setActiveTab('homework')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'homework'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FileCheck className="h-4 w-4" />
            Uy Vazifalari ({homeworkList.filter((h) => !h.submission).length})
          </button>
          <button
            onClick={() => setActiveTab('quizzes')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'quizzes'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            Testlar (Quizzes)
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'achievements'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Award className="h-4 w-4" />
            Yutuqlar & Darajalar
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'notifications'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4" />
              Xabarnomalar
            </div>
            {unreadNotifsCount > 0 && (
              <span className="h-4 w-4 rounded-full bg-rose-500 text-[10px] text-white flex items-center justify-center font-bold">
                {unreadNotifsCount}
              </span>
            )}
          </button>
        </nav>

        <div className="p-3 border-t border-slate-200">
          <div className="px-3 py-2 text-xs font-semibold text-slate-700">
            <p className="truncate font-bold">{profile?.fullName}</p>
            <span className="text-[10px] font-mono text-indigo-600">{profile?.studentCode}</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-1 flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
          >
            <LogOut className="h-4 w-4" />
            Chiqish
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800">
              {activeTab === 'overview' && 'O\'quvchi Markazi — Shaxsiy Natijalar'}
              {activeTab === 'attendance' && 'Dars Davomati Tarixi'}
              {activeTab === 'homework' && 'Topshiriqlar va Loyihalar'}
              {activeTab === 'quizzes' && 'Onlayn Testlar'}
              {activeTab === 'achievements' && 'Geymifikatsiya va Yutuqlar'}
              {activeTab === 'notifications' && 'Tizim va Markaz Xabarlari'}
            </h2>
          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Yangilash
          </button>
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
          {/* TAB 1: OVERVIEW & PROFILE */}
          {activeTab === 'overview' && profile && (
            <div className="space-y-6">
              {/* Gamification Banner */}
              <div className="rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 text-white p-6 shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase bg-white/20 px-2 py-0.5 rounded">
                      {profile.studentCode}
                    </span>
                    <h2 className="text-xl font-bold mt-1">{profile.fullName}</h2>
                    <p className="text-xs text-indigo-100 mt-0.5">
                      {profile.currentLevel}-Darajali Robototexnik Muhandis
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                      <Flame className="h-6 w-6 text-amber-300 animate-pulse" />
                      <div>
                        <p className="text-[10px] text-indigo-200 font-semibold uppercase">Ketma-ket darslar</p>
                        <p className="text-lg font-extrabold">{profile.streakDays} kun</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                      <Trophy className="h-6 w-6 text-amber-300" />
                      <div>
                        <p className="text-[10px] text-indigo-200 font-semibold uppercase">Jami XP</p>
                        <p className="text-lg font-extrabold">{profile.xpTotal} XP</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Level Progress Bar */}
                <div className="mt-6 relative z-10 space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-indigo-100">
                    <span>{profile.currentLevel}-daraja ({profile.currentLevelMinXp} XP)</span>
                    <span>{profile.progressPct}% yakunlandi ({profile.nextLevelMinXp} XP gacha)</span>
                    <span>{profile.currentLevel + 1}-daraja</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-black/20 overflow-hidden">
                    <div
                      style={{ width: `${profile.progressPct}%` }}
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full transition-all duration-500 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Enrolled Courses & Groups */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Mening Darslarim va Guruhlarim
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groups.map((g) => (
                    <div key={g.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                      <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                        {g.code}
                      </span>
                      <h4 className="font-bold text-slate-900">{g.name}</h4>
                      <p className="text-xs text-slate-500">{g.courseTitle}</p>
                      <div className="border-t border-slate-100 pt-2 text-xs text-slate-600 space-y-1">
                        <p><span className="text-slate-400">Ustoz:</span> <span className="font-medium text-slate-800">{g.teacherName}</span></p>
                        <p><span className="text-slate-400">Xona:</span> {g.room}</p>
                        <p><span className="text-slate-400">Jadval:</span> <span className="font-bold text-indigo-600">{g.scheduleDays} ({g.startTime}–{g.endTime})</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Sana</th>
                    <th className="py-3 px-4">Guruh</th>
                    <th className="py-3 px-4">Dars Mavzusi</th>
                    <th className="py-3 px-4">Holat</th>
                    <th className="py-3 px-4">Izoh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendance.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">Davomat ma&apos;lumotlari topilmadi</td>
                    </tr>
                  ) : (
                    attendance.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">{a.lessonDate}</td>
                        <td className="py-3 px-4 font-bold text-indigo-600">{a.groupCode}</td>
                        <td className="py-3 px-4 text-slate-800 font-medium">{a.topicUz}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            a.status === 'present'
                              ? 'bg-emerald-50 text-emerald-700'
                              : a.status === 'late'
                              ? 'bg-amber-50 text-amber-700'
                              : a.status === 'absent'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-indigo-50 text-indigo-700'
                          }`}>
                            {a.status === 'present' ? 'Hozir' : a.status === 'late' ? 'Kechikdi' : a.status === 'absent' ? 'Kelmadi' : 'Sababli'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{a.remarks || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: HOMEWORK & SUBMISSIONS */}
          {activeTab === 'homework' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {homeworkList.map((h) => {
                  const isSubmitted = Boolean(h.submission);
                  const isGraded = h.submission?.status === 'graded';
                  return (
                    <div key={h.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {h.groupCode}
                          </span>
                          <h4 className="font-bold text-slate-900 mt-1">{h.titleUz}</h4>
                          <p className="text-xs text-slate-500 mt-1">{h.descriptionUz}</p>
                        </div>
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                          +{h.xpReward} XP
                        </span>
                      </div>

                      <div className="border-t border-slate-100 pt-3 text-xs text-slate-600 space-y-1">
                        <p><span className="text-slate-400">Muddati:</span> <span className="font-bold text-rose-600">{h.deadline.replace('T', ' ')}</span></p>
                        {isSubmitted ? (
                          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-800 space-y-1 mt-2">
                            <p className="font-bold">
                              {isGraded ? `Baholandi: ${h.submission?.score} / ${h.maxScore} ball` : 'Topshirildi (Tekshirilmoqda)'}
                            </p>
                            {h.submission?.feedbackTeacher && (
                              <p className="text-[11px] italic">Ustoz izohi: &ldquo;{h.submission.feedbackTeacher}&rdquo;</p>
                            )}
                          </div>
                        ) : (
                          <div className="pt-2">
                            <button
                              onClick={() => setSubmittingHomework(h)}
                              className="w-full py-2 rounded-lg bg-indigo-600 text-white font-semibold shadow hover:bg-indigo-700 transition"
                            >
                              Topshirish (Fayl / GitHub link)
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: QUIZZES */}
          {activeTab === 'quizzes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.map((q) => {
                const isAttempted = Boolean(q.attempt);
                return (
                  <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {q.groupCode}
                        </span>
                        <h4 className="font-bold text-slate-900 mt-1">{q.titleUz}</h4>
                      </div>
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                        +{q.xpReward} XP
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1">
                      <p><span className="text-slate-400">Vaqt:</span> {q.timeLimitMinutes} daqiqa</p>
                      <p><span className="text-slate-400">O&apos;tish bali:</span> {q.passingScorePct}%</p>
                    </div>

                    {isAttempted ? (
                      <div className={`p-3 rounded-lg text-xs font-bold ${
                        q.attempt?.passed ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                      }`}>
                        Natija: {q.attempt?.scorePct}% {q.attempt?.passed ? "(O'tdingiz)" : "(Qayta urinish mumkin)"}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartQuiz(q)}
                        className="w-full py-2 rounded-lg bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700 transition text-xs"
                      >
                        Testni Boshlash
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 5: ACHIEVEMENTS */}
          {activeTab === 'achievements' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((ach) => (
                <div
                  key={ach.id}
                  className={`rounded-xl border p-5 shadow-sm space-y-2 transition ${
                    ach.isUnlocked
                      ? 'border-amber-300 bg-amber-50/40 text-slate-900'
                      : 'border-slate-200 bg-white opacity-60 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{ach.isUnlocked ? '🏆' : '🔒'}</span>
                    <span className="text-xs font-bold text-amber-600">+{ach.xpBonus} XP</span>
                  </div>
                  <h4 className="font-bold text-sm">{ach.titleUz}</h4>
                  <p className="text-xs">{ach.descriptionUz}</p>
                  <span className={`text-[10px] font-semibold uppercase ${ach.isUnlocked ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                    {ach.isUnlocked ? 'Ochilgan' : 'Qulflangan'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* TAB 6: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
                    n.isRead ? 'border-slate-200 bg-white' : 'border-indigo-200 bg-indigo-50/50'
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{n.titleUz}</h4>
                    <p className="text-xs text-slate-600 mt-0.5">{n.bodyUz}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">{n.createdAt.slice(0, 16).replace('T', ' ')}</span>
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={async () => {
                        await markNotificationAsRead(n.id);
                        loadData();
                      }}
                      className="text-[10px] font-semibold text-indigo-600 hover:underline shrink-0"
                    >
                      O&apos;qildi
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* MODAL: SUBMIT HOMEWORK */}
      {submittingHomework && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Vazifani Topshirish</h3>
                <p className="text-slate-500">{submittingHomework.titleUz}</p>
              </div>
              <button onClick={() => setSubmittingHomework(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitHomework} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700">GitHub yoki Video havola (URL)</label>
                <input
                  type="url"
                  value={submissionForm.githubOrVideoUrl}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, githubOrVideoUrl: e.target.value })}
                  placeholder="https://github.com/foydalanuvchi/robot-kod"
                  className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700">Fayl havolasi (Google Drive / Telegram / Dropbox)</label>
                <input
                  type="url"
                  value={submissionForm.fileUrl}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, fileUrl: e.target.value })}
                  placeholder="https://drive.google.com/..."
                  className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700">Izohingiz</label>
                <textarea
                  rows={3}
                  value={submissionForm.commentStudent}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, commentStudent: e.target.value })}
                  placeholder="Dastur C++ tilida yozildi, datchik sezgirligi oshirildi..."
                  className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setSubmittingHomework(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow"
                >
                  Topshirish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INTERACTIVE QUIZ TAKER */}
      {activeQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{activeQuiz.titleUz}</h3>
                <p className="text-slate-500">Vaqt: {activeQuiz.timeLimitMinutes} daqiqa • O&apos;tish: {activeQuiz.passingScorePct}%</p>
              </div>
              <button onClick={() => setActiveQuiz(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {quizLoading ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                Savollar tekshirilmoqda...
              </div>
            ) : quizResult ? (
              <div className="p-6 text-center space-y-3">
                <span className="text-4xl">{quizResult.passed ? '🎉' : '⚠️'}</span>
                <h4 className="text-lg font-bold text-slate-900">
                  {quizResult.passed ? "Tabriklaymiz, muvaffaqiyatli topshirdingiz!" : "O'tish baliga yetmadi"}
                </h4>
                <p className="text-sm font-bold text-indigo-600">Natija: {quizResult.score_pct}%</p>
                {quizResult.xp_awarded > 0 && (
                  <p className="text-xs font-bold text-amber-600">+{quizResult.xp_awarded} XP hisobingizga qo&apos;shildi!</p>
                )}
                <button
                  type="button"
                  onClick={() => setActiveQuiz(null)}
                  className="mt-4 px-6 py-2 rounded-xl bg-indigo-600 text-white font-semibold"
                >
                  Yopish
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {quizQuestions.map((q, idx) => (
                  <div key={q.id} className="space-y-2 p-4 rounded-xl border border-slate-100 bg-slate-50">
                    <p className="font-bold text-slate-900">
                      {idx + 1}. {q.question_text_uz}
                    </p>
                    {q.code_snippet && (
                      <pre className="p-2.5 rounded bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto">
                        {q.code_snippet}
                      </pre>
                    )}
                    <div className="space-y-1.5 pt-1">
                      {q.options?.map((opt: any) => (
                        <label
                          key={opt.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${
                            quizAnswers[q.id] === opt.id
                              ? 'border-indigo-600 bg-indigo-50 font-semibold text-indigo-900'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`quiz_q_${q.id}`}
                            value={opt.id}
                            checked={quizAnswers[q.id] === opt.id}
                            onChange={() => setQuizAnswers({ ...quizAnswers, [q.id]: opt.id })}
                            className="text-indigo-600"
                          />
                          <span>{opt.text}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="pt-2 flex justify-end gap-2 border-t">
                  <button
                    type="button"
                    onClick={() => setActiveQuiz(null)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Chiqish
                  </button>
                  <button
                    type="button"
                    onClick={handleFinishQuiz}
                    className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 shadow"
                  >
                    Testni Yakunlash & Topshirish
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
