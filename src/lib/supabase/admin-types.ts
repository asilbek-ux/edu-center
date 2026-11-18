import { CourseCategory, PaymentMethod, PaymentStatus } from '../../types/database';

export interface AdminOverviewMetrics {
  totalStudents: number;
  activeStudents: number;
  totalTeachers: number;
  totalParents: number;
  totalCourses: number;
  totalGroups: number;
  monthlyIncomeUzs: number;
  outstandingDebtUzs: number;
  todayAttendancePct: number;
  newRegistrationsCount: number;
  upcomingClassesCount: number;
  charts: {
    monthlyRevenue: Array<{ month: string; income: number; debt: number }>;
    studentGrowth: Array<{ month: string; students: number }>;
    attendanceBreakdown: Array<{ name: string; count: number; color: string }>;
    coursePopularity: Array<{ name: string; students: number }>;
    paymentStatusDistribution: Array<{ status: string; count: number }>;
  };
}

export interface AdminStudentRow {
  id: string;
  profileId: string;
  studentCode: string;
  fullName: string;
  phone: string;
  email: string;
  birthDate: string | null;
  schoolGrade: string | null;
  parentName: string;
  parentPhone: string;
  parentRelationship: string;
  telegramLinked: boolean;
  groupId: string;
  groupCode: string;
  assignedGroups: string[];
  courseCategory: CourseCategory;
  xpTotal: number;
  currentLevel: number;
  streakDays: number;
  attendancePct: number;
  paymentStatus: PaymentStatus;
  balanceUzs: number;
  notes: string;
  isActive: boolean;
  enrolledAt: string;
}

export interface AdminTeacherRow {
  id: string;
  profileId: string;
  employeeCode: string;
  fullName: string;
  specialization: CourseCategory;
  phone: string;
  email: string;
  salaryUzs: number;
  bio: string;
  isActive: boolean;
  assignedGroups: string[];
  scheduleSummary: string;
}

export interface AdminParentRow {
  id: string;
  profileId: string;
  fullName: string;
  phone: string;
  email: string;
  emergencyPhone: string;
  occupation: string;
  address: string;
  children: Array<{ studentId: string; studentName: string; studentCode: string; groupCode: string }>;
}

export interface AdminCourseRow {
  id: string;
  code: string;
  titleUz: string;
  category: CourseCategory;
  durationMonths: number;
  lessonsPerWeek: number;
  monthlyFeeUzs: number;
  descriptionUz: string;
  isActive: boolean;
  enrolledStudentsCount: number;
}

export interface AdminGroupRow {
  id: string;
  code: string;
  name: string;
  courseId: string;
  courseCode: string;
  category: CourseCategory;
  teacherId: string;
  teacherName: string;
  room: string;
  scheduleDays: string;
  startTime: string;
  endTime: string;
  maxStudents: number;
  enrolledCount: number;
  status: 'active' | 'forming' | 'completed' | 'paused';
  startDate: string;
}

export interface AdminAttendanceHistoryRow {
  lessonId: string;
  lessonDate: string;
  groupCode: string;
  topicUz: string;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  totalStudents: number;
  ratePct: number;
}

export interface AdminPaymentRow {
  id: string;
  invoiceNumber: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  groupId: string;
  groupCode: string;
  billingMonth: string;
  amountDueUzs: number;
  amountPaidUzs: number;
  balanceUzs: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  paidAt: string | null;
  notes: string;
}
