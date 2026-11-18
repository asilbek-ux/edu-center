'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Layers,
  CalendarCheck,
  CreditCard,
  Search,
  Plus,
  RefreshCw,
  AlertTriangle,
  LogOut,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Inbox,
  TrendingUp,
  Clock,
  ChevronRight,
  UserPlus
} from 'lucide-react';
import {
  fetchAdminOverviewMetrics,
  fetchAdminStudentsList,
  fetchAdminCoursesAndGroups,
  fetchAdminAttendanceHistory,
  fetchAdminPaymentsList,
  createStudentInSupabase,
  updateStudentInSupabase,
  createCourseInSupabase,
  createGroupInSupabase,
  assignStudentToGroupInSupabase,
  recordPaymentInSupabase,
  markStudentAttendanceInSupabase,
} from '@/lib/supabase/admin-queries';
import {
  AdminOverviewMetrics,
  AdminStudentRow,
  AdminCourseRow,
  AdminGroupRow,
  AdminAttendanceHistoryRow,
  AdminPaymentRow,
} from '@/lib/supabase/admin-types';
import { signOutSecurely } from '@/lib/supabase/auth-actions';
import { CourseCategory, PaymentMethod, PaymentStatus, AttendanceStatus } from '@/types/database';

function formatUzs(amount: number): string {
  return (amount || 0).toLocaleString('fr-FR') + " so'm";
}

export default function ManagerDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'groups' | 'payments' | 'attendance'>('overview');
  const [loading, setLoading] = useState(true);
  const [errorUz, setErrorUz] = useState<string | null>(null);
  const [successUz, setSuccessUz] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<AdminOverviewMetrics | null>(null);
  const [students, setStudents] = useState<AdminStudentRow[]>([]);
  const [courses, setCourses] = useState<AdminCourseRow[]>([]);
  const [groups, setGroups] = useState<AdminGroupRow[]>([]);
  const [attendance, setAttendance] = useState<AdminAttendanceHistoryRow[]>([]);
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setErrorUz(null);
    try {
      const [m, s, cg, a, p] = await Promise.all([
        fetchAdminOverviewMetrics(),
        fetchAdminStudentsList(),
        fetchAdminCoursesAndGroups(),
        fetchAdminAttendanceHistory(),
        fetchAdminPaymentsList(),
      ]);
      setMetrics(m);
      setStudents(s);
      setCourses(cg.courses);
      setGroups(cg.groups);
      setAttendance(a);
      setPayments(p);
    } catch (err: unknown) {
      setErrorUz(err instanceof Error ? err.message : "Ma'lumotlarni yuklashda xatolik.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleLogout = async () => {
    await signOutSecurely();
    router.push('/login');
  };

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.studentCode.toLowerCase().includes(q) ||
        s.phone.includes(q)
    );
  }, [students, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900">EduCenter Menejer</h1>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  Manager Panel
                </span>
              </div>
              <p className="text-xs text-slate-500">O&apos;quv markazi tezkor operatsion boshqaruvi</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadAllData()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              title="Yangilash"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Yangilash</span>
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Chiqish</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 sm:p-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
          {[
            { id: 'overview', label: 'Umumiy holat', icon: LayoutDashboard },
            { id: 'students', label: "O'quvchilar", icon: Users },
            { id: 'groups', label: 'Guruhlar & Kurslar', icon: Layers },
            { id: 'payments', label: "To'lovlar", icon: CreditCard },
            { id: 'attendance', label: 'Davomat', icon: CalendarCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Alerts */}
        {errorUz && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-bold">Xatolik yuz berdi</p>
              <p className="mt-0.5">{errorUz}</p>
            </div>
            <button onClick={() => setErrorUz(null)} className="text-rose-500 hover:text-rose-800">
              ✕
            </button>
          </div>
        )}

        {successUz && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-bold">Muvaffaqiyatli</p>
              <p className="mt-0.5">{successUz}</p>
            </div>
            <button onClick={() => setSuccessUz(null)} className="text-emerald-500 hover:text-emerald-800">
              ✕
            </button>
          </div>
        )}

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && metrics && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Jami o&apos;quvchilar</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{metrics.totalStudents}</p>
                <p className="mt-1 text-[11px] text-emerald-600 font-semibold">{metrics.activeStudents} nafari faol</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Faol guruhlar</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{metrics.totalGroups}</p>
                <p className="mt-1 text-[11px] text-blue-600 font-semibold">{metrics.totalCourses} ta kurs</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Oylik tushum</p>
                <p className="mt-1 text-2xl font-black text-emerald-600">{formatUzs(metrics.monthlyIncomeUzs)}</p>
                <p className="mt-1 text-[11px] text-slate-500">To&apos;langan to&apos;lovlar</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Qarzdorlik</p>
                <p className="mt-1 text-2xl font-black text-rose-600">{formatUzs(metrics.outstandingDebtUzs)}</p>
                <p className="mt-1 text-[11px] text-rose-500">Kutilayotgan qarzlar</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Bugungi darslar va davomat</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 text-xs">
                    <span>O&apos;rtacha davomat ko&apos;rsatkichi:</span>
                    <span className="font-bold text-emerald-600">{metrics.todayAttendancePct}%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 text-xs">
                    <span>Bugungi faol darslar:</span>
                    <span className="font-bold text-blue-600">{metrics.upcomingClassesCount} ta guruh</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 text-xs">
                    <span>Oxirgi 30 kunda yangi qo&apos;shilganlar:</span>
                    <span className="font-bold text-indigo-600">{metrics.newRegistrationsCount} o&apos;quvchi</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Tezkor amallar</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setActiveTab('students')}
                    className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition text-center"
                  >
                    <UserPlus className="h-6 w-6 text-blue-600 mb-1" />
                    <span className="text-xs font-bold text-slate-800">O&apos;quvchi qo&apos;shish</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('payments')}
                    className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 transition text-center"
                  >
                    <CreditCard className="h-6 w-6 text-emerald-600 mb-1" />
                    <span className="text-xs font-bold text-slate-800">To&apos;lov kiritish</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('groups')}
                    className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 transition text-center"
                  >
                    <Layers className="h-6 w-6 text-indigo-600 mb-1" />
                    <span className="text-xs font-bold text-slate-800">Guruhlar ro&apos;yxati</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('attendance')}
                    className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 transition text-center"
                  >
                    <CalendarCheck className="h-6 w-6 text-amber-600 mb-1" />
                    <span className="text-xs font-bold text-slate-800">Davomat nazorati</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Students */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ism, kod yoki telefon orqali qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="text-xs text-slate-500">
                Jami: <span className="font-bold text-slate-800">{filteredStudents.length}</span> nafar
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-3">Kod</th>
                      <th className="p-3">F.I.SH</th>
                      <th className="p-3">Telefon</th>
                      <th className="p-3">Guruh</th>
                      <th className="p-3">Ota-onasi</th>
                      <th className="p-3">To&apos;lov holati</th>
                      <th className="p-3">Davomat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          O&apos;quvchilar topilmadi
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/70">
                          <td className="p-3 font-mono font-semibold text-slate-700">{s.studentCode}</td>
                          <td className="p-3 font-bold text-slate-900">{s.fullName}</td>
                          <td className="p-3 font-mono text-slate-600">{s.phone}</td>
                          <td className="p-3">
                            <span className="rounded-lg bg-indigo-50 text-indigo-700 px-2 py-0.5 font-semibold text-[11px]">
                              {s.groupCode}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">{s.parentName} ({s.parentPhone})</td>
                          <td className="p-3">
                            <span
                              className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                s.paymentStatus === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : s.paymentStatus === 'overdue'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {s.paymentStatus === 'paid' ? "To'langan" : s.paymentStatus === 'overdue' ? 'Qarzdor' : 'Kutilmoqda'}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-slate-700">{s.attendancePct}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Groups */}
        {activeTab === 'groups' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((g) => (
              <div key={g.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="rounded-md bg-blue-100 text-blue-800 px-2 py-0.5 text-[11px] font-bold">
                      {g.code}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {g.enrolledCount}/{g.maxStudents} o&apos;quvchi
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{g.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">Ustoz: <span className="text-slate-700 font-medium">{g.teacherName}</span></p>
                  <p className="text-xs text-slate-500">Xona: <span className="text-slate-700 font-medium">{g.room}</span></p>
                  <p className="text-xs text-slate-500">Vaqti: <span className="text-slate-700 font-medium">{g.scheduleDays} ({g.startTime}–{g.endTime})</span></p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Payments */}
        {activeTab === 'payments' && (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 font-bold text-sm text-slate-900">
              To&apos;lov hisob-fakturalari va tushumlar
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-3">Invoys</th>
                    <th className="p-3">O&apos;quvchi</th>
                    <th className="p-3">Guruh</th>
                    <th className="p-3">Oy</th>
                    <th className="p-3">To&apos;lanishi kerak</th>
                    <th className="p-3">To&apos;landi</th>
                    <th className="p-3">Holat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-mono font-semibold text-slate-700">{p.invoiceNumber}</td>
                      <td className="p-3 font-bold text-slate-900">{p.studentName}</td>
                      <td className="p-3 text-slate-600">{p.groupCode}</td>
                      <td className="p-3 font-mono text-slate-600">{p.billingMonth}</td>
                      <td className="p-3 font-semibold text-slate-800">{formatUzs(p.amountDueUzs)}</td>
                      <td className="p-3 font-semibold text-emerald-600">{formatUzs(p.amountPaidUzs)}</td>
                      <td className="p-3">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                            p.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'overdue'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Attendance */}
        {activeTab === 'attendance' && (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 font-bold text-sm text-slate-900">
              Dars mashg&apos;ulotlari davomati
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-3">Sana</th>
                    <th className="p-3">Guruh</th>
                    <th className="p-3">Mavzu</th>
                    <th className="p-3">Hozir</th>
                    <th className="p-3">Kechikdi</th>
                    <th className="p-3">Kelmadi</th>
                    <th className="p-3">Davomat %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendance.map((a) => (
                    <tr key={a.lessonId} className="hover:bg-slate-50/70">
                      <td className="p-3 font-mono text-slate-600">{a.lessonDate}</td>
                      <td className="p-3 font-bold text-blue-600">{a.groupCode}</td>
                      <td className="p-3 text-slate-800">{a.topicUz}</td>
                      <td className="p-3 text-emerald-600 font-semibold">{a.presentCount}</td>
                      <td className="p-3 text-amber-600 font-semibold">{a.lateCount}</td>
                      <td className="p-3 text-rose-600 font-semibold">{a.absentCount}</td>
                      <td className="p-3 font-bold text-slate-900">{a.ratePct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
