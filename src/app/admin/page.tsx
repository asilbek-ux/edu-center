'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Layers,
  CalendarCheck,
  CreditCard,
  UserCheck,
  Search,
  Plus,
  RefreshCw,
  AlertTriangle,
  LogOut,
  Cpu,
  ShieldCheck,
  Edit3,
  X,
  CheckCircle2,
  Inbox,
  TrendingUp,
  AlertCircle,
  Eye,
  Trash2,
  DollarSign,
  Award,
  Clock,
  ChevronRight,
  UserPlus
} from 'lucide-react';
import {
  fetchAdminOverviewMetrics,
  fetchAdminStudentsList,
  fetchAdminTeachersList,
  fetchAdminCoursesAndGroups,
  fetchAdminAttendanceHistory,
  fetchAdminParentsList,
  fetchAdminPaymentsList,
  fetchStudentFullDetails,
  createStudentInSupabase,
  updateStudentInSupabase,
  toggleStudentActiveStatus,
  deleteStudentInSupabase,
  createTeacherInSupabase,
  updateTeacherInSupabase,
  createCourseInSupabase,
  updateCourseInSupabase,
  updateCoursePriceInSupabase,
  createGroupInSupabase,
  assignStudentToGroupInSupabase,
  recordPaymentInSupabase,
  markStudentAttendanceInSupabase,
} from '@/lib/supabase/admin-queries';
import {
  AdminOverviewMetrics,
  AdminStudentRow,
  AdminTeacherRow,
  AdminParentRow,
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

export default function AdminDashboardPage() {
  const router = useRouter();

  // Navigation & UI State
  const [activeTab, setActiveTab] = useState<
    'overview' | 'students' | 'teachers' | 'parents' | 'courses' | 'groups' | 'payments' | 'attendance'
  >('overview');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorUz, setErrorUz] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Real Supabase Data State (zero mock data)
  const [metrics, setMetrics] = useState<AdminOverviewMetrics | null>(null);
  const [students, setStudents] = useState<AdminStudentRow[]>([]);
  const [teachers, setTeachers] = useState<AdminTeacherRow[]>([]);
  const [parents, setParents] = useState<AdminParentRow[]>([]);
  const [courses, setCourses] = useState<AdminCourseRow[]>([]);
  const [groups, setGroups] = useState<AdminGroupRow[]>([]);
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AdminAttendanceHistoryRow[]>([]);

  // Filters
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [courseFilter, setCourseFilter] = useState<'all' | CourseCategory>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | PaymentStatus>('all');
  const [teacherSearch, setTeacherSearch] = useState<string>('');
  const [paymentSearch, setPaymentSearch] = useState<string>('');

  // Modals & Drawers
  const [showCreateStudentModal, setShowCreateStudentModal] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<AdminStudentRow | null>(null);
  const [viewingStudent, setViewingStudent] = useState<AdminStudentRow | null>(null);
  const [studentFullDetails, setStudentFullDetails] = useState<any | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<AdminStudentRow | null>(null);

  const [showCreateTeacherModal, setShowCreateTeacherModal] = useState<boolean>(false);
  const [editingTeacher, setEditingTeacher] = useState<AdminTeacherRow | null>(null);

  const [showCreateCourseModal, setShowCreateCourseModal] = useState<boolean>(false);
  const [editingCourse, setEditingCourse] = useState<AdminCourseRow | null>(null);

  const [showCreateGroupModal, setShowCreateGroupModal] = useState<boolean>(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState<boolean>(false);

  // Forms
  const [studentForm, setStudentForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    birthDate: '',
    schoolGrade: '',
    parentName: '',
    parentPhone: '',
    parentRelationship: 'Ota-ona',
    groupId: '',
    notes: '',
  });

  const [teacherForm, setTeacherForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    specialization: 'robotics' as CourseCategory,
    salaryRateUzs: 4000000,
    bio: '',
  });

  const [courseForm, setCourseForm] = useState({
    code: '',
    titleUz: '',
    category: 'robotics' as CourseCategory,
    durationMonths: 6,
    lessonsPerWeek: 3,
    monthlyFeeUzs: 650000,
    descriptionUz: '',
  });

  const [groupForm, setGroupForm] = useState({
    code: '',
    name: '',
    courseId: '',
    teacherId: '',
    room: 'Robototexnika Lab-1',
    scheduleDays: 'Du - Cho - Ju',
    startTime: '15:00',
    endTime: '17:00',
    maxStudents: 15,
  });

  const [paymentForm, setPaymentForm] = useState({
    studentId: '',
    groupId: '',
    billingMonth: new Date().toISOString().slice(0, 7) + '-01',
    amountDueUzs: 650000,
    amountPaidUzs: 650000,
    paymentMethod: 'payme' as PaymentMethod,
    status: 'paid' as PaymentStatus,
    notes: '',
  });

  const showNotice = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => {
      setStatusToast((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Load Dashboard Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorUz(null);
    try {
      const [m, s, t, p, cg, pay, att] = await Promise.all([
        fetchAdminOverviewMetrics(),
        fetchAdminStudentsList(),
        fetchAdminTeachersList(),
        fetchAdminParentsList(),
        fetchAdminCoursesAndGroups(),
        fetchAdminPaymentsList(),
        fetchAdminAttendanceHistory(),
      ]);

      setMetrics(m);
      setStudents(s);
      setTeachers(t);
      setParents(p);
      setCourses(cg.courses);
      setGroups(cg.groups);
      setPayments(pay);
      setAttendanceHistory(att);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ma'lumotlarni yuklashda kutilmagan xatolik yuz berdi.";
      setErrorUz(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load full student details when student profile drawer opens
  useEffect(() => {
    if (viewingStudent) {
      fetchStudentFullDetails(viewingStudent.id)
        .then((details) => setStudentFullDetails(details))
        .catch((e) => console.error("O'quvchi to'liq ma'lumotlarini yuklashda xatolik:", e));
    } else {
      setStudentFullDetails(null);
    }
  }, [viewingStudent]);

  const handleLogout = async () => {
    await signOutSecurely();
    router.push('/login');
    router.refresh();
  };

  // Filtered Lists
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.studentCode.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.phone.includes(studentSearch) ||
        s.parentName.toLowerCase().includes(studentSearch.toLowerCase());
      const matchCategory = courseFilter === 'all' || s.courseCategory === courseFilter;
      const matchPayment = paymentStatusFilter === 'all' || s.paymentStatus === paymentStatusFilter;
      return matchSearch && matchCategory && matchPayment;
    });
  }, [students, studentSearch, courseFilter, paymentStatusFilter]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      return (
        t.fullName.toLowerCase().includes(teacherSearch.toLowerCase()) ||
        t.employeeCode.toLowerCase().includes(teacherSearch.toLowerCase()) ||
        t.phone.includes(teacherSearch)
      );
    });
  }, [teachers, teacherSearch]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      return (
        p.studentName.toLowerCase().includes(paymentSearch.toLowerCase()) ||
        p.studentCode.toLowerCase().includes(paymentSearch.toLowerCase()) ||
        p.invoiceNumber.toLowerCase().includes(paymentSearch.toLowerCase()) ||
        p.groupCode.toLowerCase().includes(paymentSearch.toLowerCase())
      );
    });
  }, [payments, paymentSearch]);

  // Actions
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createStudentInSupabase(studentForm);
      if (!res.success) {
        alert(res.errorUz || "Xatolik yuz berdi.");
        return;
      }
      showNotice(`Yangi o'quvchi (${res.studentCode || ''}) muvaffaqiyatli ro'yxatdan o'tkazildi!`);
      setShowCreateStudentModal(false);
      setStudentForm({
        fullName: '',
        phone: '',
        email: '',
        birthDate: '',
        schoolGrade: '',
        parentName: '',
        parentPhone: '',
        parentRelationship: 'Ota-ona',
        groupId: '',
        notes: '',
      });
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Xatolik yuz berdi.");
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      const res = await updateStudentInSupabase({
        studentId: editingStudent.id,
        profileId: editingStudent.profileId,
        fullName: editingStudent.fullName,
        phone: editingStudent.phone,
        birthDate: editingStudent.birthDate || undefined,
        schoolGrade: editingStudent.schoolGrade || undefined,
        groupId: editingStudent.groupId,
        notes: editingStudent.notes,
      });
      if (!res.success) {
        alert(res.errorUz || "Xatolik yuz berdi.");
        return;
      }
      showNotice("O'quvchi ma'lumotlari muvaffaqiyatli saqlandi!");
      setEditingStudent(null);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Xatolik yuz berdi.");
    }
  };

  const handleToggleStudentActive = async (s: AdminStudentRow) => {
    try {
      const res = await toggleStudentActiveStatus(s.profileId, !s.isActive);
      if (!res.success) {
        alert(res.errorUz || "Xatolik yuz berdi.");
        return;
      }
      showNotice(`O'quvchi holati ${!s.isActive ? 'faollashtirildi' : 'nofaol qilindi'}.`);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Xatolik yuz berdi.");
    }
  };

  const handleDeleteStudent = async () => {
    if (!deletingStudent) return;
    try {
      const res = await deleteStudentInSupabase(deletingStudent.id, deletingStudent.profileId);
      if (!res.success) {
        alert(res.errorUz || "Xatolik yuz berdi.");
        return;
      }
      showNotice("O'quvchi tizimdan butunlay o'chirildi.");
      setDeletingStudent(null);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Xatolik yuz berdi.");
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createTeacherInSupabase(teacherForm);
      if (!res.success) {
        alert(res.errorUz || "Xatolik yuz berdi.");
        return;
      }
      showNotice(`Yangi o'qituvchi (${res.employeeCode || ''}) muvaffaqiyatli qo'shildi!`);
      setShowCreateTeacherModal(false);
      setTeacherForm({
        fullName: '',
        phone: '',
        email: '',
        specialization: 'robotics',
        salaryRateUzs: 4000000,
        bio: '',
      });
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Xatolik yuz berdi.");
    }
  };

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    try {
      const res = await updateTeacherInSupabase({
        teacherId: editingTeacher.id,
        profileId: editingTeacher.profileId,
        fullName: editingTeacher.fullName,
        phone: editingTeacher.phone,
        specialization: editingTeacher.specialization,
        salaryRateUzs: editingTeacher.salaryUzs,
        bio: editingTeacher.bio,
      });
      if (!res.success) {
        alert(res.errorUz || "Xatolik yuz berdi.");
        return;
      }
      showNotice("O'qituvchi ma'lumotlari muvaffaqiyatli yangilandi!");
      setEditingTeacher(null);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Xatolik yuz berdi.");
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createCourseInSupabase(courseForm);
      if (!res.success) {
        alert(res.errorUz || "Xatolik yuz berdi.");
        return;
      }
      showNotice(`Yangi kurs (${courseForm.code}) muvaffaqiyatli yaratildi!`);
      setShowCreateCourseModal(false);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Xatolik yuz berdi.");
    }
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    try {
      const res = await updateCourseInSupabase({
        courseId: editingCourse.id,
        titleUz: editingCourse.titleUz,
        monthlyFeeUzs: editingCourse.monthlyFeeUzs,
        durationMonths: editingCourse.durationMonths,
        lessonsPerWeek: editingCourse.lessonsPerWeek,
      });
      if (!res.success) {
        alert(res.errorUz || "Xatolik yuz berdi.");
        return;
      }
      showNotice("Kurs ma'lumotlari yangilandi!");
      setEditingCourse(null);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Xatolik yuz berdi.");
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createGroupInSupabase(groupForm);
      if (!res.success) {
        alert(res.errorUz || "Xatolik yuz berdi.");
        return;
      }
      showNotice(`Yangi guruh (${groupForm.code}) jadval to'qnashuvisiz yaratildi!`);
      setShowCreateGroupModal(false);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Xatolik yuz berdi.");
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await recordPaymentInSupabase(paymentForm);
      if (!res.success) {
        alert(res.errorUz || "Xatolik yuz berdi.");
        return;
      }
      showNotice("To'lov muvaffaqiyatli qabul qilindi va kvitansiya yaratildi!");
      setShowRecordPaymentModal(false);
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Xatolik yuz berdi.");
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      {/* Toast Notification */}
      {statusToast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{statusToast}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-200 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 leading-tight">EduCenter ERP</h1>
            <span className="text-[10px] font-semibold tracking-wider text-indigo-600 uppercase bg-indigo-50 px-1.5 py-0.5 rounded">
              Boshqaruv Paneli
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
            Umumiy Ko&apos;rinish
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'students'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Users className="h-4 w-4" />
            O&apos;quvchilar ({students.length})
          </button>
          <button
            onClick={() => setActiveTab('teachers')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'teachers'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            O&apos;qituvchilar ({teachers.length})
          </button>
          <button
            onClick={() => setActiveTab('parents')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'parents'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            Ota-onalar ({parents.length})
          </button>
          <button
            onClick={() => setActiveTab('courses')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'courses'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Kurslar ({courses.length})
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'groups'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Layers className="h-4 w-4" />
            Guruhlar ({groups.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'payments'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Moliya va To&apos;lovlar
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
            Davomat Jurnali
          </button>
        </nav>

        <div className="p-3 border-t border-slate-200">
          <div className="px-3 py-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Administrator</span>
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

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800">
              {activeTab === 'overview' && 'Boshqaruv Markazi — Umumiy Statistika va Grafiklar'}
              {activeTab === 'students' && "O'quvchilar Boshqaruvi va Ro'yxati"}
              {activeTab === 'teachers' && "O'qituvchilar va Ularning Guruhlari"}
              {activeTab === 'parents' && "Ota-onalar va Bog'langan Farzandlar"}
              {activeTab === 'courses' && "Robototexnika va IT Dasturlash Kurslari"}
              {activeTab === 'groups' && "O'quv Guruhlari va Dars Jadvallari"}
              {activeTab === 'payments' && "Moliya Boshqaruvi va To'lovlar Tarixi"}
              {activeTab === 'attendance' && "Davomat Tarixi va Qatnashish Ko'rsatkichlari"}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={isLoading}
              title="Yangilash"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Yangilash
            </button>

            {activeTab === 'students' && (
              <button
                onClick={() => setShowCreateStudentModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold shadow hover:bg-indigo-700 transition"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Yangi O&apos;quvchi
              </button>
            )}

            {activeTab === 'teachers' && (
              <button
                onClick={() => setShowCreateTeacherModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold shadow hover:bg-indigo-700 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                Yangi O&apos;qituvchi
              </button>
            )}

            {activeTab === 'courses' && (
              <button
                onClick={() => setShowCreateCourseModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold shadow hover:bg-indigo-700 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                Yangi Kurs
              </button>
            )}

            {activeTab === 'groups' && (
              <button
                onClick={() => setShowCreateGroupModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold shadow hover:bg-indigo-700 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                Yangi Guruh
              </button>
            )}

            {activeTab === 'payments' && (
              <button
                onClick={() => setShowRecordPaymentModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold shadow hover:bg-indigo-700 transition"
              >
                <DollarSign className="h-3.5 w-3.5" />
                To&apos;lov Qabul Qilish
              </button>
            )}
          </div>
        </header>

        {/* Global Error Banner */}
        {errorUz && (
          <div className="mx-8 mt-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
            <div>
              <p className="font-bold">Ma&apos;lumotlar bazasi xatoligi:</p>
              <p className="mt-0.5">{errorUz}</p>
            </div>
          </div>
        )}

        <div className="p-8 space-y-6">
          {/* TAB 1: OVERVIEW & REAL CHARTS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 11 Real KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Jami O&apos;quvchilar</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{metrics?.totalStudents || 0}</p>
                  <span className="text-[11px] text-emerald-600 font-medium">Faol: {metrics?.activeStudents || 0}</span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">O&apos;qituvchilar</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{metrics?.totalTeachers || 0}</p>
                  <span className="text-[11px] text-indigo-600 font-medium">Malakali mutaxassislar</span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Ota-onalar</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{metrics?.totalParents || 0}</p>
                  <span className="text-[11px] text-slate-500 font-medium">Tizimda bog&apos;langan</span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Kurslar & Guruhlar</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{metrics?.totalCourses || 0} / {metrics?.totalGroups || 0}</p>
                  <span className="text-[11px] text-indigo-600 font-medium">Faol guruhlar</span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Oylik Tushum</p>
                  <p className="text-xl font-bold text-emerald-600 mt-1">{formatUzs(metrics?.monthlyIncomeUzs || 0)}</p>
                  <span className="text-[11px] text-slate-500 font-medium">To&apos;langan mablag&apos;lar</span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Qarzdorlik (Debt)</p>
                  <p className="text-xl font-bold text-rose-600 mt-1">{formatUzs(metrics?.outstandingDebtUzs || 0)}</p>
                  <span className="text-[11px] text-rose-500 font-medium">To&apos;lanmagan to&apos;lovlar</span>
                </div>
              </div>

              {/* 5 Real Analytics Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 1: Monthly Revenue (Income vs Debt) */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Oylik Tushum va Qarzdorlik Dinamikasi
                    </h3>
                    <div className="flex items-center gap-3 text-[11px] font-medium">
                      <span className="flex items-center gap-1 text-emerald-600">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Tushum
                      </span>
                      <span className="flex items-center gap-1 text-rose-500">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Qarzdorlik
                      </span>
                    </div>
                  </div>

                  {metrics?.charts?.monthlyRevenue && metrics.charts.monthlyRevenue.length > 0 ? (
                    <div className="space-y-3 pt-2">
                      {metrics.charts.monthlyRevenue.map((row) => {
                        const total = Math.max(1, row.income + row.debt);
                        const incomePct = Math.round((row.income / total) * 100);
                        const debtPct = Math.round((row.debt / total) * 100);
                        return (
                          <div key={row.month} className="space-y-1">
                            <div className="flex justify-between text-xs font-medium text-slate-600">
                              <span>{row.month}</span>
                              <span>{formatUzs(row.income)} (Qarz: {formatUzs(row.debt)})</span>
                            </div>
                            <div className="h-3 w-full rounded-full bg-slate-100 flex overflow-hidden">
                              <div style={{ width: `${incomePct}%` }} className="bg-emerald-500 h-full" />
                              <div style={{ width: `${debtPct}%` }} className="bg-rose-500 h-full" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-xs text-slate-400">
                      To&apos;lovlar statistikasi hali mavjud emas
                    </div>
                  )}
                </div>

                {/* Chart 2: Student Growth */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      O&apos;quvchilar O&apos;sish Dinamikasi
                    </h3>
                    <TrendingUp className="h-4 w-4 text-indigo-600" />
                  </div>

                  {metrics?.charts?.studentGrowth && metrics.charts.studentGrowth.length > 0 ? (
                    <div className="space-y-3 pt-2">
                      {metrics.charts.studentGrowth.map((row) => (
                        <div key={row.month} className="flex items-center gap-3">
                          <span className="w-16 text-xs text-slate-500 font-medium">{row.month}</span>
                          <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              style={{ width: `${Math.min(100, row.students * 10)}%` }}
                              className="h-full bg-indigo-600 rounded-full"
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-800 w-10 text-right">
                            +{row.students}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-xs text-slate-400">
                      O&apos;quvchilar soni ma&apos;lumotlari kiritilmoqda
                    </div>
                  )}
                </div>

                {/* Chart 3: Attendance Breakdown */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">
                    Davomat Holatlari Taqsimoti
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {metrics?.charts?.attendanceBreakdown?.map((item) => (
                      <div key={item.name} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-xs font-medium text-slate-600">{item.name}</span>
                        </div>
                        <p className="text-xl font-bold text-slate-900 mt-1">{item.count} ta dars</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chart 4: Payment Statuses */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">
                    To&apos;lov Statuslari Bo&apos;yicha Taqsimot
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {metrics?.charts?.paymentStatusDistribution?.map((item) => (
                      <div key={item.status} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50">
                        <span className="text-xs font-medium text-slate-600">{item.status}</span>
                        <p className="text-xl font-bold text-slate-900 mt-1">{item.count} ta hisob</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STUDENTS MODULE */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              {/* Search & Filters */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="O'quvchi F.I.Sh, kod, telefon yoki ota-onasi bo'yicha qidirish..."
                    className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={courseFilter}
                    onChange={(e) => setCourseFilter(e.target.value as any)}
                    className="rounded-lg border border-slate-300 py-1.5 px-3 text-xs focus:border-indigo-600 focus:outline-none bg-white"
                  >
                    <option value="all">Barcha Kurslar</option>
                    <option value="robotics">Robototexnika</option>
                    <option value="it_programming">IT & Dasturlash</option>
                  </select>

                  <select
                    value={paymentStatusFilter}
                    onChange={(e) => setPaymentStatusFilter(e.target.value as any)}
                    className="rounded-lg border border-slate-300 py-1.5 px-3 text-xs focus:border-indigo-600 focus:outline-none bg-white"
                  >
                    <option value="all">Barcha To&apos;lov Holatlari</option>
                    <option value="paid">To&apos;langan</option>
                    <option value="partial">Qisman to&apos;langan</option>
                    <option value="pending">Kutilmoqda</option>
                    <option value="overdue">Qarzdor</option>
                  </select>
                </div>
              </div>

              {/* Students Table */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Kod & F.I.Sh</th>
                      <th className="py-3 px-4">Telefon</th>
                      <th className="py-3 px-4">Guruh</th>
                      <th className="py-3 px-4">Ota-ona</th>
                      <th className="py-3 px-4">XP & Daraja</th>
                      <th className="py-3 px-4">Davomat</th>
                      <th className="py-3 px-4">To&apos;lov</th>
                      <th className="py-3 px-4 text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          Mos keluvchi o&apos;quvchilar topilmadi
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{s.fullName}</p>
                            <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1 rounded">
                              {s.studentCode}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono">{s.phone}</td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-800">{s.groupCode}</span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-800">{s.parentName}</p>
                            <span className="text-[10px] text-slate-400 font-mono">{s.parentPhone}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-amber-600">{s.xpTotal} XP</span>
                            <p className="text-[10px] text-slate-400">{s.currentLevel}-daraja</p>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`font-semibold ${s.attendancePct >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {s.attendancePct}%
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                s.paymentStatus === 'paid'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : s.paymentStatus === 'overdue'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {s.paymentStatus === 'paid' ? "To'langan" : s.paymentStatus === 'overdue' ? 'Qarzdor' : 'Kutilmoqda'}
                            </span>
                            {s.balanceUzs > 0 && (
                              <p className="text-[10px] text-rose-500 font-medium mt-0.5">
                                {formatUzs(s.balanceUzs)}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setViewingStudent(s)}
                                title="To'liq profil"
                                className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-slate-100"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingStudent(s)}
                                title="Tahrirlash"
                                className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-slate-100"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleToggleStudentActive(s)}
                                title={s.isActive ? "Nofaol qilish" : "Faollashtirish"}
                                className={`px-1.5 py-0.5 text-[10px] rounded font-medium ${
                                  s.isActive
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {s.isActive ? 'Faol' : 'Nofaol'}
                              </button>
                              <button
                                onClick={() => setDeletingStudent(s)}
                                title="O'chirish"
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: TEACHERS MODULE */}
          {activeTab === 'teachers' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                    placeholder="O'qituvchi nomi yoki kodi bo'yicha qidirish..."
                    className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTeachers.map((t) => (
                  <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {t.employeeCode}
                        </span>
                        <h3 className="font-bold text-slate-900 mt-1">{t.fullName}</h3>
                        <p className="text-xs text-indigo-600 font-medium">
                          {t.specialization === 'robotics' ? 'Robototexnika mutaxassisi' : 'IT & Dasturlash o\'qituvchisi'}
                        </p>
                      </div>
                      <button
                        onClick={() => setEditingTeacher(t)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600">
                      <p><span className="text-slate-400">Telefon:</span> {t.phone}</p>
                      <p><span className="text-slate-400">Email:</span> {t.email}</p>
                      <p><span className="text-slate-400">Oylik maosh stavkasi:</span> <span className="font-bold text-emerald-600">{formatUzs(t.salaryUzs)}</span></p>
                    </div>

                    <div className="border-t border-slate-100 pt-2">
                      <p className="text-[11px] font-bold text-slate-500 uppercase">Biriktirilgan Guruhlar</p>
                      <p className="text-xs text-slate-700 mt-0.5 font-medium">{t.scheduleSummary}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: PARENTS MODULE */}
          {activeTab === 'parents' && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Ota-ona F.I.Sh</th>
                    <th className="py-3 px-4">Telefon</th>
                    <th className="py-3 px-4">Favqulodda raqam</th>
                    <th className="py-3 px-4">Kasbi</th>
                    <th className="py-3 px-4">Bog&apos;langan Farzandlar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parents.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{p.fullName}</td>
                      <td className="py-3 px-4 font-mono">{p.phone}</td>
                      <td className="py-3 px-4 font-mono">{p.emergencyPhone}</td>
                      <td className="py-3 px-4">{p.occupation || '—'}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {p.children.map((c) => (
                            <span key={c.studentId} className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-medium">
                              {c.studentName} ({c.groupCode})
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 5: COURSES MODULE */}
          {activeTab === 'courses' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((c) => (
                <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                        {c.code}
                      </span>
                      <h3 className="font-bold text-slate-900 mt-1">{c.titleUz}</h3>
                      <p className="text-xs text-slate-500">
                        {c.category === 'robotics' ? 'Robototexnika & Sxemotexnika' : 'IT & Dasturlash'}
                      </p>
                    </div>
                    <button
                      onClick={() => setEditingCourse(c)}
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600">
                    <p><span className="text-slate-400">Oylik to&apos;lov:</span> <span className="font-bold text-emerald-600">{formatUzs(c.monthlyFeeUzs)}</span></p>
                    <p><span className="text-slate-400">Davomiyligi:</span> {c.durationMonths} oy ({c.lessonsPerWeek} dars/hafta)</p>
                    <p><span className="text-slate-400">O&apos;qiyotgan o&apos;quvchilar:</span> <span className="font-bold text-slate-900">{c.enrolledStudentsCount} ta</span></p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 6: GROUPS MODULE */}
          {activeTab === 'groups' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((g) => (
                <div key={g.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                        {g.code}
                      </span>
                      <h3 className="font-bold text-slate-900 mt-1">{g.name}</h3>
                      <p className="text-xs text-slate-500">{g.courseCode}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                      g.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {g.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600">
                    <p><span className="text-slate-400">O&apos;qituvchi:</span> <span className="font-medium text-slate-800">{g.teacherName}</span></p>
                    <p><span className="text-slate-400">Xona:</span> {g.room}</p>
                    <p><span className="text-slate-400">Jadval:</span> <span className="font-bold text-indigo-600">{g.scheduleDays} ({g.startTime}–{g.endTime})</span></p>
                    <p><span className="text-slate-400">Sig&apos;im:</span> <span className="font-bold text-slate-900">{g.enrolledCount} / {g.maxStudents} o&apos;quvchi</span></p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 7: PAYMENTS & FINANCIAL MANAGEMENT */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={paymentSearch}
                    onChange={(e) => setPaymentSearch(e.target.value)}
                    placeholder="Kvitansiya, o'quvchi yoki guruh kodi bo'yicha qidirish..."
                    className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Kvitansiya (Invoice)</th>
                      <th className="py-3 px-4">O&apos;quvchi</th>
                      <th className="py-3 px-4">Guruh</th>
                      <th className="py-3 px-4">Oy</th>
                      <th className="py-3 px-4">Summa (Due / Paid)</th>
                      <th className="py-3 px-4">Holat</th>
                      <th className="py-3 px-4">Usul</th>
                      <th className="py-3 px-4">Sana</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.invoiceNumber}</td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900">{p.studentName}</p>
                          <span className="text-[10px] font-mono text-slate-400">{p.studentCode}</span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{p.groupCode}</td>
                        <td className="py-3 px-4 font-mono">{p.billingMonth}</td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-emerald-600">{formatUzs(p.amountPaidUzs)}</p>
                          {p.balanceUzs > 0 && (
                            <p className="text-[10px] text-rose-500">Qarz: {formatUzs(p.balanceUzs)}</p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            p.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : p.status === 'overdue' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-500">{p.paymentMethod}</td>
                        <td className="py-3 px-4 text-slate-400">{p.paidAt ? p.paidAt.slice(0, 10) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: ATTENDANCE HISTORY */}
          {activeTab === 'attendance' && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Sana</th>
                    <th className="py-3 px-4">Guruh</th>
                    <th className="py-3 px-4">Dars Mavzusi</th>
                    <th className="py-3 px-4">Hozir (Present)</th>
                    <th className="py-3 px-4">Kechikdi (Late)</th>
                    <th className="py-3 px-4">Kelmadi (Absent)</th>
                    <th className="py-3 px-4">Sababli (Excused)</th>
                    <th className="py-3 px-4 text-right">Qatnashish %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendanceHistory.map((a) => (
                    <tr key={a.lessonId} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">{a.lessonDate}</td>
                      <td className="py-3 px-4 font-bold text-indigo-600">{a.groupCode}</td>
                      <td className="py-3 px-4 text-slate-800">{a.topicUz}</td>
                      <td className="py-3 px-4 text-emerald-600 font-semibold">{a.presentCount} ta</td>
                      <td className="py-3 px-4 text-amber-600 font-semibold">{a.lateCount} ta</td>
                      <td className="py-3 px-4 text-rose-600 font-semibold">{a.absentCount} ta</td>
                      <td className="py-3 px-4 text-indigo-600 font-semibold">{a.excusedCount} ta</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">{a.ratePct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* MODAL 1: ADD STUDENT */}
      {showCreateStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Yangi O&apos;quvchi Ro&apos;yxatga Olish</h3>
              <button onClick={() => setShowCreateStudentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateStudent} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700">O&apos;quvchi F.I.Sh</label>
                <input
                  type="text"
                  required
                  value={studentForm.fullName}
                  onChange={(e) => setStudentForm({ ...studentForm, fullName: e.target.value })}
                  placeholder="Aliyev Sardor"
                  className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Telefon raqam</label>
                  <input
                    type="text"
                    required
                    value={studentForm.phone}
                    onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                    placeholder="+998 90 123 45 67"
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Guruhga biriktirish</label>
                  <select
                    value={studentForm.groupId}
                    onChange={(e) => setStudentForm({ ...studentForm, groupId: e.target.value })}
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none bg-white"
                  >
                    <option value="">Guruh tanlanmagan</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.code} — {g.name} ({g.enrolledCount}/{g.maxStudents})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Ota-ona F.I.Sh</label>
                  <input
                    type="text"
                    required
                    value={studentForm.parentName}
                    onChange={(e) => setStudentForm({ ...studentForm, parentName: e.target.value })}
                    placeholder="Aliyev Jasur"
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Ota-ona telefoni</label>
                  <input
                    type="text"
                    required
                    value={studentForm.parentPhone}
                    onChange={(e) => setStudentForm({ ...studentForm, parentPhone: e.target.value })}
                    placeholder="+998 90 987 65 43"
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700">Izohlar / Qaydlar</label>
                <textarea
                  rows={2}
                  value={studentForm.notes}
                  onChange={(e) => setStudentForm({ ...studentForm, notes: e.target.value })}
                  placeholder="Arduino va LEGO to'plamlari bilan tajribasi bor..."
                  className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateStudentModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT STUDENT */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm">O&apos;quvchi Ma&apos;lumotlarini Tahrirlash</h3>
              <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateStudent} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700">F.I.Sh</label>
                <input
                  type="text"
                  required
                  value={editingStudent.fullName}
                  onChange={(e) => setEditingStudent({ ...editingStudent, fullName: e.target.value })}
                  className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700">Telefon</label>
                <input
                  type="text"
                  required
                  value={editingStudent.phone}
                  onChange={(e) => setEditingStudent({ ...editingStudent, phone: e.target.value })}
                  className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700">Guruh</label>
                <select
                  value={editingStudent.groupId}
                  onChange={(e) => setEditingStudent({ ...editingStudent, groupId: e.target.value })}
                  className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none bg-white"
                >
                  <option value="">Guruhsiz</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.code} — {g.name}</option>
                  ))}
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                >
                  O&apos;zgarishlarni Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: STUDENT FULL PROFILE DRAWER */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {viewingStudent.studentCode}
                </span>
                <h3 className="font-bold text-lg text-slate-900 mt-1">{viewingStudent.fullName}</h3>
                <p className="text-xs text-slate-500">Guruh: {viewingStudent.groupCode}</p>
              </div>
              <button onClick={() => setViewingStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-center">
                <p className="text-[11px] text-slate-400 font-medium">To&apos;plangan XP</p>
                <p className="text-lg font-bold text-amber-600">{viewingStudent.xpTotal} XP</p>
              </div>
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-center">
                <p className="text-[11px] text-slate-400 font-medium">Davomat</p>
                <p className="text-lg font-bold text-emerald-600">{viewingStudent.attendancePct}%</p>
              </div>
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-center">
                <p className="text-[11px] text-slate-400 font-medium">Daraja</p>
                <p className="text-lg font-bold text-indigo-600">{viewingStudent.currentLevel}-daraja</p>
              </div>
            </div>

            {/* Attendance History */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Davomat Tarixi</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                {studentFullDetails?.attendance && studentFullDetails.attendance.length > 0 ? (
                  <table className="w-full text-left">
                    <tbody className="divide-y divide-slate-100">
                      {studentFullDetails.attendance.map((att: any) => (
                        <tr key={att.id} className="p-2">
                          <td className="py-2 px-3 font-mono">{att.lessons?.lesson_date}</td>
                          <td className="py-2 px-3 font-medium text-slate-800">{att.lessons?.topic_uz}</td>
                          <td className="py-2 px-3 text-right">
                            <span className="font-semibold text-emerald-600 uppercase text-[10px]">{att.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="p-4 text-center text-slate-400">Davomat yozuvlari topilmadi</p>
                )}
              </div>
            </div>

            {/* Payment Invoices */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">To&apos;lovlar Tarixi</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                {studentFullDetails?.payments && studentFullDetails.payments.length > 0 ? (
                  <table className="w-full text-left">
                    <tbody className="divide-y divide-slate-100">
                      {studentFullDetails.payments.map((p: any) => (
                        <tr key={p.id}>
                          <td className="py-2 px-3 font-mono font-medium">{p.invoice_number}</td>
                          <td className="py-2 px-3 font-mono">{p.billing_month}</td>
                          <td className="py-2 px-3 font-bold text-emerald-600">{formatUzs(Number(p.amount_paid_uzs))}</td>
                          <td className="py-2 px-3 text-right">
                            <span className="text-[10px] uppercase font-bold text-slate-500">{p.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="p-4 text-center text-slate-400">To&apos;lov yozuvlari topilmadi</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: DELETE STUDENT */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-center">
            <AlertCircle className="h-10 w-10 text-rose-600 mx-auto" />
            <h3 className="font-bold text-slate-900 text-sm">O&apos;quvchini o&apos;chirishni tasdiqlaysizmi?</h3>
            <p className="text-xs text-slate-500">
              <b>{deletingStudent.fullName}</b> ({deletingStudent.studentCode}) tizimdan va barcha darslardan butunlay o&apos;chiriladi. Bu amalni qaytarib bo&apos;lmaydi.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleDeleteStudent}
                className="px-4 py-2 rounded-lg bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700 shadow"
              >
                Ha, o&apos;chirish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD TEACHER */}
      {showCreateTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Yangi O&apos;qituvchi Qo&apos;shish</h3>
              <button onClick={() => setShowCreateTeacherModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTeacher} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700">F.I.Sh</label>
                <input
                  type="text"
                  required
                  value={teacherForm.fullName}
                  onChange={(e) => setTeacherForm({ ...teacherForm, fullName: e.target.value })}
                  placeholder="Boboyev Jamshid"
                  className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Telefon</label>
                  <input
                    type="text"
                    required
                    value={teacherForm.phone}
                    onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                    placeholder="+998 90 555 44 33"
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Email</label>
                  <input
                    type="email"
                    required
                    value={teacherForm.email}
                    onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                    placeholder="teacher@educenter.uz"
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Mutaxassislik</label>
                  <select
                    value={teacherForm.specialization}
                    onChange={(e) => setTeacherForm({ ...teacherForm, specialization: e.target.value as any })}
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none bg-white"
                  >
                    <option value="robotics">Robototexnika</option>
                    <option value="it_programming">IT & Dasturlash</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Oylik stavka (so&apos;m)</label>
                  <input
                    type="number"
                    min="0"
                    step="500000"
                    required
                    value={teacherForm.salaryRateUzs}
                    onChange={(e) => setTeacherForm({ ...teacherForm, salaryRateUzs: Number(e.target.value) })}
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTeacherModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                >
                  Qo&apos;shish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD COURSE */}
      {showCreateCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Yangi Kurs Yaratish</h3>
              <button onClick={() => setShowCreateCourseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCourse} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Kurs Kodi</label>
                  <input
                    type="text"
                    required
                    value={courseForm.code}
                    onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                    placeholder="ROB-ADV"
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs uppercase focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Yo&apos;nalish</label>
                  <select
                    value={courseForm.category}
                    onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value as any })}
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none bg-white"
                  >
                    <option value="robotics">Robototexnika</option>
                    <option value="it_programming">IT & Dasturlash</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700">Kurs Nomi</label>
                <input
                  type="text"
                  required
                  value={courseForm.titleUz}
                  onChange={(e) => setCourseForm({ ...courseForm, titleUz: e.target.value })}
                  placeholder="Arduino va Murakkab Robotlar"
                  className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Oylik to&apos;lov</label>
                  <input
                    type="number"
                    min="50000"
                    step="50000"
                    required
                    value={courseForm.monthlyFeeUzs}
                    onChange={(e) => setCourseForm({ ...courseForm, monthlyFeeUzs: Number(e.target.value) })}
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Davomiyligi (oy)</label>
                  <input
                    type="number"
                    min="1"
                    max="36"
                    required
                    value={courseForm.durationMonths}
                    onChange={(e) => setCourseForm({ ...courseForm, durationMonths: Number(e.target.value) })}
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Dars/hafta</label>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    required
                    value={courseForm.lessonsPerWeek}
                    onChange={(e) => setCourseForm({ ...courseForm, lessonsPerWeek: Number(e.target.value) })}
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateCourseModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                >
                  Kursni Yaratish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD GROUP */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Yangi Guruh Ochish (Jadval Nazorati Bilan)</h3>
              <button onClick={() => setShowCreateGroupModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Guruh Kodi</label>
                  <input
                    type="text"
                    required
                    value={groupForm.code}
                    onChange={(e) => setGroupForm({ ...groupForm, code: e.target.value })}
                    placeholder="ROB-03"
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs uppercase focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Guruh Nomi</label>
                  <input
                    type="text"
                    required
                    value={groupForm.name}
                    onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                    placeholder="Arduino Boshlang'ich"
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Kurs</label>
                  <select
                    required
                    value={groupForm.courseId}
                    onChange={(e) => setGroupForm({ ...groupForm, courseId: e.target.value })}
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none bg-white"
                  >
                    <option value="">Kursni tanlang</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} — {c.titleUz}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">O&apos;qituvchi</label>
                  <select
                    required
                    value={groupForm.teacherId}
                    onChange={(e) => setGroupForm({ ...groupForm, teacherId: e.target.value })}
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none bg-white"
                  >
                    <option value="">O&apos;qituvchini tanlang</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.fullName} ({t.employeeCode})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Xona</label>
                  <input
                    type="text"
                    required
                    value={groupForm.room}
                    onChange={(e) => setGroupForm({ ...groupForm, room: e.target.value })}
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Kunlar</label>
                  <select
                    value={groupForm.scheduleDays}
                    onChange={(e) => setGroupForm({ ...groupForm, scheduleDays: e.target.value })}
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none bg-white"
                  >
                    <option value="Du - Cho - Ju">Du - Cho - Ju</option>
                    <option value="Se - Pay - Sha">Se - Pay - Sha</option>
                    <option value="Har kuni">Har kuni</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Boshlanish vaqti</label>
                  <input
                    type="time"
                    required
                    value={groupForm.startTime}
                    onChange={(e) => setGroupForm({ ...groupForm, startTime: e.target.value })}
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Tugash vaqti</label>
                  <input
                    type="time"
                    required
                    value={groupForm.endTime}
                    onChange={(e) => setGroupForm({ ...groupForm, endTime: e.target.value })}
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Maks. o&apos;quvchi</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={groupForm.maxStudents}
                    onChange={(e) => setGroupForm({ ...groupForm, maxStudents: Number(e.target.value) })}
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                >
                  Guruhni Ochish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD PAYMENT */}
      {showRecordPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm">To&apos;lovni Qabul Qilish (Kassa / Onlayn)</h3>
              <button onClick={() => setShowRecordPaymentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700">O&apos;quvchini tanlang</label>
                <select
                  required
                  value={paymentForm.studentId}
                  onChange={(e) => {
                    const sid = e.target.value;
                    const st = students.find((s) => s.id === sid);
                    setPaymentForm({
                      ...paymentForm,
                      studentId: sid,
                      groupId: st?.groupId || paymentForm.groupId,
                    });
                  }}
                  className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none bg-white"
                >
                  <option value="">O&apos;quvchini tanlang</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.fullName} ({s.studentCode})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Guruh</label>
                  <select
                    required
                    value={paymentForm.groupId}
                    onChange={(e) => setPaymentForm({ ...paymentForm, groupId: e.target.value })}
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none bg-white"
                  >
                    <option value="">Guruhni tanlang</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.code}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">To&apos;lov oyi</label>
                  <input
                    type="date"
                    required
                    value={paymentForm.billingMonth}
                    onChange={(e) => setPaymentForm({ ...paymentForm, billingMonth: e.target.value })}
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Hisoblangan summa</label>
                  <input
                    type="number"
                    min="0"
                    step="50000"
                    required
                    value={paymentForm.amountDueUzs}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amountDueUzs: Number(e.target.value) })}
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">To&apos;langan summa</label>
                  <input
                    type="number"
                    min="0"
                    step="50000"
                    required
                    value={paymentForm.amountPaidUzs}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amountPaidUzs: Number(e.target.value) })}
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">To&apos;lov usuli</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })}
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none bg-white"
                  >
                    <option value="cash">Naqd pul (Kassa)</option>
                    <option value="payme">Payme</option>
                    <option value="click">Click</option>
                    <option value="uzum">Uzum Bank</option>
                    <option value="bank_transfer">Bank o&apos;tkazmasi</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Status</label>
                  <select
                    value={paymentForm.status}
                    onChange={(e) => setPaymentForm({ ...paymentForm, status: e.target.value as any })}
                    className="w-full mt-1 rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-600 focus:outline-none bg-white"
                  >
                    <option value="paid">To&apos;langan (Paid)</option>
                    <option value="partial">Qisman (Partial)</option>
                    <option value="pending">Kutilmoqda (Pending)</option>
                    <option value="overdue">Qarzdor (Overdue)</option>
                  </select>
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRecordPaymentModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                >
                  Kvitansiyani Rasmiylashtirish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
