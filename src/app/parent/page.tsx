'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  CalendarCheck,
  CreditCard,
  FileCheck,
  Bell,
  RefreshCw,
  LogOut,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  MessageCircle,
  TrendingUp,
  Award,
  ChevronRight
} from 'lucide-react';
import {
  fetchParentDashboardData,
  fetchParentChildDetails,
} from '@/lib/supabase/parent-queries';
import {
  ParentChildSummary,
  ParentChildFullDetails,
} from '@/lib/supabase/parent-types';
import { signOutSecurely } from '@/lib/supabase/auth-actions';

function formatUzs(amount: number): string {
  return (amount || 0).toLocaleString('fr-FR') + " so'm";
}

export default function ParentDashboardPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorUz, setErrorUz] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  const [parentInfo, setParentInfo] = useState<any>(null);
  const [children, setChildren] = useState<ParentChildSummary[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [childDetails, setChildDetails] = useState<ParentChildFullDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'homework' | 'payments'>('overview');

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
      const data = await fetchParentDashboardData();
      setParentInfo(data.parent);
      setChildren(data.children);
      if (data.children.length > 0 && !selectedStudentId) {
        setSelectedStudentId(data.children[0].studentId);
      }
    } catch (err: unknown) {
      setErrorUz(err instanceof Error ? err.message : "Xatolik yuz berdi.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedStudentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load child details whenever selected child changes
  useEffect(() => {
    if (selectedStudentId) {
      setIsLoading(true);
      fetchParentChildDetails(selectedStudentId)
        .then((details) => setChildDetails(details))
        .catch((e) => setErrorUz(e.message))
        .finally(() => setIsLoading(false));
    }
  }, [selectedStudentId]);

  const handleLogout = async () => {
    await signOutSecurely();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      {statusToast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{statusToast}</span>
        </div>
      )}

      {/* Parent Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-200 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 leading-tight">EduCenter Ota-ona</h1>
            <span className="text-[10px] font-semibold text-purple-600 uppercase bg-purple-50 px-1.5 py-0.5 rounded">
              Ota-ona Portali
            </span>
          </div>
        </div>

        <nav className="p-3 space-y-1 flex-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'overview'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Umumiy O&apos;zlashtirish
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'attendance'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <CalendarCheck className="h-4 w-4" />
            Farzandim Davomati
          </button>
          <button
            onClick={() => setActiveTab('homework')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'homework'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FileCheck className="h-4 w-4" />
            Vazifalar & Baholar
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'payments'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            To&apos;lovlar & Qarzdorlik
          </button>
        </nav>

        {/* Telegram Connect Notice */}
        <div className="p-3 bg-purple-50/70 border-t border-purple-100 m-3 rounded-xl text-xs text-purple-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-[11px]">
            <MessageCircle className="h-3.5 w-3.5 text-purple-600" />
            Telegram Xabarnoma
          </div>
          <p className="text-[10px] text-purple-700">
            Davomat va to&apos;lov eslatmalarini Telegram orqali olishingiz mumkin.
          </p>
        </div>

        <div className="p-3 border-t border-slate-200">
          <div className="px-3 py-2 text-xs font-semibold text-slate-700">
            <p className="truncate font-bold">{parentInfo?.fullName || "Ota-ona"}</p>
            <span className="text-[10px] text-slate-400">{parentInfo?.email}</span>
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between shrink-0">
          {/* Child Switcher */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500">Farzandingiz:</span>
            <div className="flex items-center gap-1.5">
              {children.map((c) => (
                <button
                  key={c.studentId}
                  onClick={() => setSelectedStudentId(c.studentId)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedStudentId === c.studentId
                      ? 'bg-purple-600 text-white shadow'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {c.fullName} ({c.studentCode})
                </button>
              ))}
            </div>
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
          {childDetails && (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase">Davomat Foizi</p>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">
                        {childDetails.student.attendancePct}%
                      </p>
                      <span className="text-[11px] text-slate-500 font-medium">Barcha darslarda</span>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase">To&apos;plangan XP</p>
                      <p className="text-2xl font-bold text-amber-600 mt-1">
                        {childDetails.student.xpTotal} XP
                      </p>
                      <span className="text-[11px] text-indigo-600 font-medium">
                        {childDetails.student.currentLevel}-daraja
                      </span>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase">Ketma-ketlik (Streak)</p>
                      <p className="text-2xl font-bold text-indigo-600 mt-1">
                        {childDetails.student.streakDays} kun
                      </p>
                      <span className="text-[11px] text-slate-500 font-medium">Dars qoldirmasdan</span>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase">To&apos;lov Qarzdorligi</p>
                      <p className="text-xl font-bold text-rose-600 mt-1">
                        {formatUzs(
                          childDetails.payments.reduce((s, p) => s + p.balanceUzs, 0)
                        )}
                      </p>
                      <span className="text-[11px] text-slate-500 font-medium">Joriy balans</span>
                    </div>
                  </div>

                  {/* Class Schedules */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Dars Jadvallari va Ustozlar
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {childDetails.groups.map((g) => (
                        <div key={g.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                          <span className="text-[10px] font-mono font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                            {g.code}
                          </span>
                          <h4 className="font-bold text-slate-900">{g.name}</h4>
                          <p className="text-xs text-slate-500">{g.courseTitle}</p>
                          <div className="border-t border-slate-100 pt-2 text-xs text-slate-600 space-y-1">
                            <p><span className="text-slate-400">Ustoz:</span> <span className="font-medium text-slate-800">{g.teacherName}</span></p>
                            <p><span className="text-slate-400">Xona:</span> {g.room}</p>
                            <p><span className="text-slate-400">Jadval:</span> <span className="font-bold text-purple-600">{g.scheduleDays} ({g.startTime}–{g.endTime})</span></p>
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
                        <th className="py-3 px-4">Ustoz Qaydi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {childDetails.attendance.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">Davomat ma&apos;lumotlari mavjud emas</td>
                        </tr>
                      ) : (
                        childDetails.attendance.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono font-medium text-slate-900">{a.lessonDate}</td>
                            <td className="py-3 px-4 font-bold text-purple-600">{a.groupCode}</td>
                            <td className="py-3 px-4 font-semibold text-slate-800">{a.topicUz}</td>
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

              {/* TAB 3: HOMEWORK & GRADES */}
              {activeTab === 'homework' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Vazifa Mavzusi</th>
                          <th className="py-3 px-4">Guruh</th>
                          <th className="py-3 px-4">Muddat</th>
                          <th className="py-3 px-4">Holat</th>
                          <th className="py-3 px-4">Qo&apos;yilgan Ball</th>
                          <th className="py-3 px-4">Ustoz Izohi (Feedback)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {childDetails.homework.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">Vazifalar mavjud emas</td>
                          </tr>
                        ) : (
                          childDetails.homework.map((h) => (
                            <tr key={h.id} className="hover:bg-slate-50">
                              <td className="py-3 px-4 font-bold text-slate-900">{h.titleUz}</td>
                              <td className="py-3 px-4 font-semibold text-purple-600">{h.groupCode}</td>
                              <td className="py-3 px-4 text-slate-500">{h.deadline.slice(0, 10)}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                  h.isSubmitted ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                }`}>
                                  {h.isSubmitted ? 'Topshirildi' : 'Kutilmoqda'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {h.score !== null ? (
                                  <span className="font-bold text-emerald-600">{h.score} ball</span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-slate-600 italic">
                                {h.feedbackTeacher ? `"${h.feedbackTeacher}"` : '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: PAYMENTS */}
              {activeTab === 'payments' && (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Kvitansiya</th>
                        <th className="py-3 px-4">Guruh</th>
                        <th className="py-3 px-4">Oy</th>
                        <th className="py-3 px-4">To&apos;langan Summa</th>
                        <th className="py-3 px-4">Qarzdorlik Balansi</th>
                        <th className="py-3 px-4">Holat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {childDetails.payments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">To&apos;lov kvitansiyalari mavjud emas</td>
                        </tr>
                      ) : (
                        childDetails.payments.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.invoiceNumber}</td>
                            <td className="py-3 px-4 font-semibold text-purple-600">{p.groupCode}</td>
                            <td className="py-3 px-4 font-mono">{p.billingMonth}</td>
                            <td className="py-3 px-4 font-bold text-emerald-600">{formatUzs(p.amountPaidUzs)}</td>
                            <td className="py-3 px-4">
                              {p.balanceUzs > 0 ? (
                                <span className="font-bold text-rose-600">{formatUzs(p.balanceUzs)}</span>
                              ) : (
                                <span className="text-emerald-600 font-semibold">0 so&apos;m</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                p.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
