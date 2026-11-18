import { AttendanceStatus, PaymentStatus } from '../../types/database';

export interface ParentChildSummary {
  studentId: string;
  studentCode: string;
  fullName: string;
  xpTotal: number;
  currentLevel: number;
  streakDays: number;
  attendancePct: number;
  totalDebtUzs: number;
  enrolledGroupsCount: number;
}

export interface ParentChildFullDetails {
  student: {
    id: string;
    studentCode: string;
    fullName: string;
    birthDate: string | null;
    schoolGrade: string | null;
    xpTotal: number;
    currentLevel: number;
    streakDays: number;
    attendancePct: number;
  };
  groups: Array<{
    id: string;
    code: string;
    name: string;
    courseTitle: string;
    teacherName: string;
    room: string;
    scheduleDays: string;
    startTime: string;
    endTime: string;
  }>;
  attendance: Array<{
    id: string;
    lessonDate: string;
    topicUz: string;
    status: AttendanceStatus;
    groupCode: string;
    remarks: string | null;
  }>;
  homework: Array<{
    id: string;
    titleUz: string;
    groupCode: string;
    deadline: string;
    isSubmitted: boolean;
    score: number | null;
    feedbackTeacher: string | null;
  }>;
  payments: Array<{
    id: string;
    invoiceNumber: string;
    groupCode: string;
    billingMonth: string;
    amountDueUzs: number;
    amountPaidUzs: number;
    balanceUzs: number;
    status: PaymentStatus;
    paidAt: string | null;
  }>;
}
